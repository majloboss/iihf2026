#!/usr/bin/env node
// Zosuladi FIFA finale na DEV s produkciou: phase_code a group_code 'F' -> 'FIN'.
//
// Skupina F aj finale mali rovnaky kod, takze tlacidlo filtra 'F' vytiahlo
// k skupinovym zapasom aj finale. V produkcii je to uz opravene.
//
// Zapisuje jediny riadok ciselnika, `phase_id` zapasov zostava nedotknute
// (odkazuje na riadok, nie na kod).
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
    console.log(`databáza: ${val('DB_NAME')}\n`);

    const { rows } = await c.query(`
        UPDATE admin.competition_phases p
           SET phase_code = 'FIN', group_code = 'FIN', updated_at = NOW()
          FROM admin.competitions k
         WHERE k.id = p.competition_id
           AND k.slug = 'fifa2026'
           AND p.match_stat_code = 'FIN'
           AND (p.phase_code <> 'FIN' OR p.group_code IS DISTINCT FROM 'FIN')
        RETURNING p.id, p.phase_code, p.group_code, p.phase_name`);

    if (!rows.length) {
        console.log('Nič na zmenu — finále už má FIN.');
    } else {
        rows.forEach(r => console.log(
            `Upravené: id=${r.id} ${r.phase_name} → phase_code=${r.phase_code}, group=${r.group_code}`));
    }
    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
