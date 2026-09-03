#!/usr/bin/env node
// Skusi 072 -> 073 -> 074 -> 076 nanecisto priamo v produkcnej databaze
// a vsetko vrati spat. Overi, ze poradie sedi a ze vysledok zodpoveda DEV.
//
// Skript nic nemeni — konci ROLLBACK.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = p => {
    const conf = fs.readFileSync(path.join(__dirname, p), 'utf8');
    const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];
    return { host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
             user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false } };
};

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Migracie maju vlastne BEGIN/COMMIT — tu ich drzime v jednej transakcii.
const cistiSql = s => s.replace(/^\s*BEGIN;\s*$/m, '').replace(/^\s*COMMIT;\s*$/m, '');
const nacitaj = n => cistiSql(fs.readFileSync(
    path.join(__dirname, '../api/migrations/', n), 'utf8'));

const ciselnik = async c => (await c.query(`
    SELECT k.slug, p.match_stat_code, p.phase_code, p.phase_name, p.match_stat_desc,
           p.color_code, p.group_code, p.sort_order, p.is_active
      FROM admin.competition_phases p
      JOIN admin.competitions k ON k.id = p.competition_id
     ORDER BY k.slug, p.sort_order, p.match_stat_code`)).rows;

(async () => {
    const dev = new Client(cfg('../api/config/db.php'));
    await dev.connect();
    const naDev = await ciselnik(dev);
    await dev.end();

    const p = new Client(cfg('../../betclub/api/config/db.php'));
    await p.connect();
    console.log(`produkcia: ${cfg('../../betclub/api/config/db.php').database}\n`);

    await p.query('BEGIN');
    try {
        for (const n of ['072_competition_phases.sql', '073_phase_color_playin.sql',
                         '074_phase_group_code.sql', '076_ciselnik_faz_obsah.sql']) {
            await p.query(nacitaj(n));
            check(true, `${n} prebehla`);
            // Docasna tabulka z 076 by prekazala pripadnemu opakovaniu.
            await p.query('DROP TABLE IF EXISTS _fazy');
        }

        const naProd = await ciselnik(p);
        check(naProd.length === naDev.length,
              `počet fáz sedí s DEV (${naProd.length} = ${naDev.length})`);
        check(JSON.stringify(naProd) === JSON.stringify(naDev),
              'obsah číselníka je zhodný s DEV');

        // Sutaze musia sediet aj ked maju ine competition_id (UCL: DEV 3, prod 5).
        const podla = r => r.reduce((m, x) => (m[x.slug] = (m[x.slug] || 0) + 1, m), {});
        console.log('\n  ' + Object.entries(podla(naProd))
            .map(([s, n]) => `${s}=${n}`).join('  '));
    } finally {
        await p.query('ROLLBACK');
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli (zmeny vratene)');
    await p.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
