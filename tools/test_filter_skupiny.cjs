#!/usr/bin/env node
// Overi, ze vyber skupiny vo filtri (BAR, R16, LF...) zahrnie vsetky jej kola
// — a teda aj vsetky ich hracie dni.
//
// Predtym kliknutie na skupinu iba rozbalilo tlacidla a zoznam zapasov aj
// ponuka dni zostali nezmenene.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const statKod = g => g.game_type_code === 'LEAGUE' ? `LF${g.round_no}`
    : g.leg ? `${g.game_type_code === 'PO' ? 'BAR' : g.game_type_code}-${g.leg}`
    : g.game_type_code;

// Rovnaka logika ako sediFaze() v usePhases.js.
const sediFaze = (skupiny, kod, vyber) => {
    if (!vyber) return true;
    if (kod === vyber) return true;
    const kola = skupiny.get(vyber);
    return kola ? kola.includes(kod) : false;
};

const den = t => new Date(t).toISOString().slice(0, 10);

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows: comp } = await c.query("SELECT id FROM admin.competitions WHERE slug='ucl2026'");
    const { rows: fazy } = await c.query(
        'SELECT match_stat_code code, group_code grp FROM admin.competition_phases' +
        ' WHERE competition_id=$1 AND is_active ORDER BY sort_order', [comp[0].id]);

    const skupiny = new Map();
    fazy.forEach(f => {
        if (!f.grp) return;
        if (!skupiny.has(f.grp)) skupiny.set(f.grp, []);
        skupiny.get(f.grp).push(f.code);
    });

    const { rows: g } = await c.query(
        'SELECT game_type_code, leg, start_time,' +
        " substring(game_type_name from '([0-9]+)\\. kolo')::int AS round_no" +
        ' FROM "lm2026-27".games');

    for (const [grp, kola] of skupiny) {
        if (kola.length < 2) continue;   // jednoprvkove sa nezbaluju

        const zoSkupiny = g.filter(x => sediFaze(skupiny, statKod(x), grp));
        const suctomKol = kola.reduce((n, k) =>
            n + g.filter(x => sediFaze(skupiny, statKod(x), k)).length, 0);

        const dni = new Set(zoSkupiny.map(x => den(x.start_time)));
        const dniKol = new Set();
        kola.forEach(k => g.filter(x => sediFaze(skupiny, statKod(x), k))
            .forEach(x => dniKol.add(den(x.start_time))));

        console.log(`  ${grp.padEnd(5)}${kola.join(' ').padEnd(24)}` +
                    `${String(zoSkupiny.length).padStart(3)} zápasov, ${dni.size} dní`);

        check(zoSkupiny.length === suctomKol,
              `${grp}: výber skupiny dá rovnako zápasov ako jej kolá spolu (${zoSkupiny.length})`);
        check(dni.size === dniKol.size && [...dniKol].every(d => dni.has(d)),
              `${grp}: ponúkne všetky hracie dni svojich kôl (${dni.size})`);
    }

    // Konkretne to, na co sa pytal pouzivatel.
    const bar = g.filter(x => sediFaze(skupiny, statKod(x), 'BAR'));
    const dniBar = [...new Set(bar.map(x => den(x.start_time)))].sort();
    check(dniBar.length >= 2, `BAR ponúkne viac než jeden deň (${dniBar.join(', ')})`);

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
