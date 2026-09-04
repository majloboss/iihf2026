#!/usr/bin/env node
// Ukaze, co zapasy o svojej faze dnes nesu a co im migracia 075 priradi.
//
// Skript iba cita. Prepinac --prod cita produkciu namiesto DEV.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    const { rows } = await c.query(`
        SELECT g.game_type_code AS kod, g.leg,
               CASE
                   WHEN g.game_type_code = 'LEAGUE'
                       THEN 'LF' || substring(g.game_type_name from '([0-9]+)\\. kolo')
                   WHEN g.leg IS NOT NULL
                       THEN (CASE g.game_type_code WHEN 'PO' THEN 'BAR'
                             ELSE g.game_type_code END) || '-' || g.leg
                   ELSE g.game_type_code
               END AS navrh,
               COUNT(*)::int n,
               MIN(g.game_type_name) AS nazov
          FROM "lm2026-27".games g
         GROUP BY 1, 2, 3
         ORDER BY 3`);

    console.log('UCL — čo zápas nesie dnes  →  čo mu migrácia priradí\n');
    console.log('  v zápase          leg    →  kolo     počet   názov');
    console.log('  ' + '─'.repeat(74));
    rows.forEach(r => console.log(
        `  ${String(r.kod).padEnd(18)}${String(r.leg ?? '—').padEnd(7)}→  ` +
        `${String(r.navrh).padEnd(9)}${String(r.n).padStart(3)}     ${r.nazov}`));

    // Faza, ktora v ciselniku nie je, by zapas vyhodila z filtrov.
    const { rows: k } = await c.query(
        "SELECT match_stat_code m FROM admin.competition_phases p" +
        " JOIN admin.competitions k ON k.id = p.competition_id" +
        " WHERE k.slug = 'ucl2026' AND p.is_active");
    const platne = new Set(k.map(r => r.m));
    const chybne = rows.filter(r => !platne.has(r.navrh));
    console.log(chybne.length
        ? `\n  POZOR: ${chybne.map(r => r.navrh).join(', ')} nie je v číselníku`
        : `\n  Všetkých ${rows.length} kombinácií nájde svoju fázu v číselníku.`);

    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
