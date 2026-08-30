#!/usr/bin/env node
// Spusti SQL migraciu na DB-DEV-BET. Pripojenie berie z api/config/db.php,
// aby sa heslo neduplikovalo na dalsom mieste.
//
// Pouzitie: node tools/run_migration.cjs api/migrations/062_ucl_games_pdf.sql
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const file = process.argv[2];
if (!file) { console.error('Pouzitie: node tools/run_migration.cjs <subor.sql>'); process.exit(1); }

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = key => {
    const m = conf.match(new RegExp("define\\('" + key + "'\\s*,\\s*'([^']*)'"));
    if (!m) throw new Error('V db.php chyba ' + key);
    return m[1];
};

(async () => {
    const client = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    try {
        await client.query(fs.readFileSync(file, 'utf8'));
        console.log('Migracia prebehla:', path.basename(file));
    } finally {
        await client.end();
    }
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
