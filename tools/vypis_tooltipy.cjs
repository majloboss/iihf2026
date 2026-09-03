#!/usr/bin/env node
// Vypise texty, ktore sa zobrazia ako tooltip nad tlacidlami filtra.
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    for (const [id, meno] of [[1, 'IIHF'], [2, 'FIFA'], [3, 'UCL']]) {
        const { rows } = await c.query(
            'SELECT match_stat_code m, match_stat_desc d, phase_name pn, group_code g' +
            ' FROM admin.competition_phases WHERE competition_id = $1 AND is_active' +
            ' ORDER BY sort_order, match_stat_code', [id]);
        console.log(`\n=== ${meno} ===`);
        rows.forEach(r => console.log(
            `  ${(r.g || '·').padEnd(6)}${r.m.padEnd(8)}${r.d}${r.d === r.pn ? '' : `   (fáza: ${r.pn})`}`));
    }
    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
