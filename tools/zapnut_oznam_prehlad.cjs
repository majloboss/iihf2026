#!/usr/bin/env node
// Zapne oznam a jeho zobrazenie na Prehlade.
//
// Migracia 077 nastavila `show_dashboard` podla vtedajsieho stavu: co sa
// v tej chvili na Prehlade nezobrazovalo, zostalo skryte aj ked oznam plati.
// Bez tohto skriptu by sa to dalo prepnut az zaskrtavacim polickom v admine.
//
// Pouzitie: node zapnut_oznam_prehlad.cjs <id> [--prod]
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const prod = process.argv.includes('--prod');
const id = Number(process.argv.slice(2).find(a => /^\d+$/.test(a)));
if (!id) { console.error('Chýba id oznamu.'); process.exit(1); }

const conf = fs.readFileSync(path.join(__dirname,
    prod ? '../../betclub/api/config/db.php' : '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}`);

    const { rows } = await c.query(
        'UPDATE admin.announcements SET show_dashboard = TRUE, is_active = TRUE' +
        ' WHERE id = $1 RETURNING id, is_active, show_dashboard, left(body, 40) AS ukazka', [id]);

    if (!rows.length) {
        console.log(`Oznam #${id} neexistuje.`);
    } else {
        rows.forEach(r => console.log(
            `Zapnuté: #${r.id} aktívny=${r.is_active} naPrehľade=${r.show_dashboard}  ${r.ukazka}…`));
    }

    const { rows: teraz } = await c.query(
        'SELECT id FROM admin.announcements' +
        ' WHERE is_active AND show_dashboard ORDER BY created_at DESC');
    console.log(`Na Prehľade teraz: ${teraz.map(r => '#' + r.id).join(', ') || 'žiadny'}`);
    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
