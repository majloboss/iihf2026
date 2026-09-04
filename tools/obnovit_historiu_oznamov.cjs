#!/usr/bin/env node
// Vrati stare oznamy do historie.
//
// Kym platil jediny oznam, kazdy novy ten predosly vypol (`is_active = FALSE`).
// Vypnutie vtedy znamenalo „uz nie je aktualny", nie „schovat z historie" —
// historia vracala vsetko bez ohladu na priznak.
//
// Odkedy `is_active` riadi zobrazenie v historii, tie stare oznamy z nej
// vypadli. Skript ich vrati; `show_dashboard` nechava tak, aby sa nenasypali
// na Prehlad.
//
// Pouzitie: node obnovit_historiu_oznamov.cjs [--prod]
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

    const { rows } = await c.query(
        'UPDATE admin.announcements SET is_active = TRUE' +
        ' WHERE is_active = FALSE RETURNING id');
    console.log(`Vrátené do histórie: ${rows.length} oznamov`);

    const { rows: stav } = await c.query(
        'SELECT COUNT(*) FILTER (WHERE is_active)::int historia,' +
        ' COUNT(*) FILTER (WHERE show_dashboard)::int prehlad,' +
        ' COUNT(*)::int spolu FROM admin.announcements');
    console.log(`História: ${stav[0].historia} z ${stav[0].spolu}` +
                `   ·   Prehľad: ${stav[0].prehlad}`);
    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
