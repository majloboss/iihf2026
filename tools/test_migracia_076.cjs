#!/usr/bin/env node
// Overi migraciu 076 nanecisto: spusti ju v transakcii a vrati spat.
//
// Kontroluje, ze je opakovatelna (druhy beh nesmie nic zmenit ani spadnut)
// a ze po nej ciselnik zodpoveda tomu, co je na DEV teraz.
//
// Skript nic nemeni — vsetko konci v ROLLBACK.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Migracia ma vlastne BEGIN/COMMIT — tu ju chceme drzat v nasej transakcii.
const bezTransakcie = sql => sql
    .replace(/^\s*BEGIN;\s*$/m, '')
    .replace(/^\s*COMMIT;\s*$/m, '')
    .replace(/ON COMMIT DROP/g, '');

const odtlacok = rows => JSON.stringify(rows);

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const sql = bezTransakcie(
        fs.readFileSync(path.join(__dirname, '../api/migrations/076_ciselnik_faz_obsah.sql'), 'utf8'));

    const citaj = async () => (await c.query(`
        SELECT k.slug, p.match_stat_code, p.phase_code, p.phase_name, p.match_stat_desc,
               p.color_code, p.group_code, p.sort_order, p.is_active
          FROM admin.competition_phases p
          JOIN admin.competitions k ON k.id = p.competition_id
         ORDER BY k.slug, p.sort_order, p.match_stat_code`)).rows;

    await c.query('BEGIN');
    try {
        const pred = await citaj();

        await c.query(sql);
        const poPrvom = await citaj();
        check(odtlacok(poPrvom) === odtlacok(pred),
              `stav na DEV sa nezmenil (${pred.length} fáz) — migrácia zapisuje to, čo už platí`);

        // Druhy beh musi prejst a nic nezmenit, inak by opakovane nasadenie skodilo.
        await c.query('DROP TABLE IF EXISTS _fazy');
        await c.query(sql);
        const poDruhom = await citaj();
        check(odtlacok(poDruhom) === odtlacok(poPrvom), 'druhé spustenie nič nezmenilo');

        // Ochrana proti tomu, aby sa v produkcii stratili fazy sutaze, ktora tam je navyse.
        check(!/DELETE\s+FROM\s+admin\.competition_phases/i.test(
                  fs.readFileSync(path.join(__dirname, '../api/migrations/076_ciselnik_faz_obsah.sql'), 'utf8')),
              'migrácia nemaže existujúce riadky');

        const chybne = poDruhom.filter(r => !r.match_stat_desc || !String(r.match_stat_desc).trim());
        check(chybne.length === 0, 'každá fáza má popis pre tooltip');
    } finally {
        await c.query('ROLLBACK');
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli (zmeny vratene)');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
