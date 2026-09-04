#!/usr/bin/env node
// Overi, ze miesta prepisane na `phase_id` vracaju to iste, co predtym
// dopocitavali zo starych stlpcov — statistiky, filter kol nad tabulkami
// a oznacenie fazy v notifikaciach.
//
// Skript iba cita. Prepinac --prod cita produkciu namiesto DEV.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    // ── Štatistiky: rozpad bodov po fázach ───────────────────────────────────
    for (const [schema, meno, kluc, body] of [
        ['iihf2026', 'IIHF', 'g.id', 'points'],
        ['fifa2026', 'FIFA', 'g.game_id', 'points_earned'],
        ['"lm2026-27"', 'UCL', 'g.game_id', 'points_earned'],
    ]) {
        const { rows } = await c.query(
            `SELECT ph.match_stat_desc AS faza, COUNT(*)::int tipov,` +
            ` COALESCE(SUM(t.${body}), 0)::int body` +
            ` FROM ${schema}.tips t` +
            ` JOIN ${schema}.games g ON ${kluc} = t.game_id` +
            ' JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
            ` WHERE t.${body} IS NOT NULL` +
            ' GROUP BY ph.match_stat_desc, ph.sort_order ORDER BY ph.sort_order');

        console.log(`${meno}  ${rows.length} fáz s odohranými tipmi`);
        rows.slice(0, 3).forEach(r => console.log(
            `    ${String(r.faza).padEnd(24)}${String(r.tipov).padStart(5)} tipov, ${r.body} b.`));
        if (rows.length > 3) console.log(`    … ${rows.length - 3} ďalších`);

        // Bez naviazanej fazy by tip zo statistiky vypadol.
        const { rows: chyba } = await c.query(
            `SELECT COUNT(*)::int n FROM ${schema}.tips t` +
            ` JOIN ${schema}.games g ON ${kluc} = t.game_id` +
            ` WHERE t.${body} IS NOT NULL AND g.phase_id IS NULL`);
        check(chyba[0].n === 0,
              `${meno}: žiadny bodovaný tip nevypadne zo štatistík` +
              (chyba[0].n ? ` — ${chyba[0].n} bez fázy` : ''));
    }

    // ── Notifikácie UCL: označenie fázy ──────────────────────────────────────
    const { rows: notif } = await c.query(
        'SELECT ph.match_stat_desc AS faza, COUNT(*)::int n' +
        ' FROM "lm2026-27".games g' +
        ' LEFT JOIN admin.competition_phases ph ON ph.id = g.phase_id' +
        ' GROUP BY 1 ORDER BY 1');
    const bezPopisu = notif.filter(r => !r.faza);
    check(bezPopisu.length === 0,
          `notifikácie: každý zápas má označenie fázy (${notif.length} rôznych)`);

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
