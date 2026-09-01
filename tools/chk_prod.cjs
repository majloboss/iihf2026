#!/usr/bin/env node
// Ktore migracie z develop este nebezali na produkcnej databaze.
//
// Produkcia ma vlastnu DB (DB-BET), develop inu (DB-DEV-BET), takze nasadenie
// kodu bez migracii konci bielou obrazovkou — presne ako pri migracii 060.
// Skript iba cita, nic nemeni.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../../betclub/api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log('DB:', val('DB_NAME'), '@', val('DB_HOST'));

    const { rows } = await c.query('SELECT version FROM admin.schema_versions ORDER BY 1');
    const done = new Set(rows.map(r => String(parseInt(r.version, 10))));
    console.log('spustenych migracii:', rows.length,
                '| posledna:', rows.length ? rows[rows.length - 1].version : '-');

    const dir = path.join(__dirname, '../api/migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    const miss = files.filter(f => !done.has(String(parseInt(f.slice(0, 3), 10))));

    console.log('\nCHYBAJU na produkcii (' + miss.length + '):');
    miss.forEach(f => console.log('  ' + f));

    // Diera v poradi uz spustenych migracii je varovny signal.
    const cisla = [...done].map(Number).sort((a, b) => a - b);
    const diery = [];
    for (let i = cisla[0]; i < cisla[cisla.length - 1]; i++) {
        if (!done.has(String(i))) diery.push(i);
    }
    if (diery.length) console.log('\nPOZOR, diery v poradi:', diery.join(', '));

    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
