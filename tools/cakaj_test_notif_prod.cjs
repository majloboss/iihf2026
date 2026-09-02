#!/usr/bin/env node
// Caka, kym cron na PRODUKCII spracuje skusobnu notifikaciu.
//
// Ziadost sa zapise ako 'test_request' a cron ju po odoslani prepise na
// 'test_sent'. Skript sleduje ten prechod a vypise, ako dlho trval — tym sa
// zisti aj skutocny interval cronu.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../../betclub/api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const POKUSOV = 45;      // 45 x 20 s = 15 minut
const PAUZA_MS = 20000;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    let ziadostO = null;

    for (let i = 0; i < POKUSOV; i++) {
        const { rows } = await c.query(`
            SELECT notif_type, sent_at
              FROM admin.notification_log
             WHERE notif_type IN ('test_request', 'test_sent')
             ORDER BY sent_at DESC LIMIT 1`);

        if (!rows.length) {
            console.log('ziadna ziadost — najprv klikni na Poslat skusobnu spravu');
            await c.end();
            process.exit(1);
        }
        if (!ziadostO && rows[0].notif_type === 'test_request') {
            ziadostO = new Date(rows[0].sent_at);
        }
        if (rows[0].notif_type === 'test_sent') {
            const odoslane = new Date(rows[0].sent_at);
            const min = ziadostO ? Math.round((odoslane - ziadostO) / 60000) : null;
            console.log('ODOSLANE o ' + String(rows[0].sent_at).slice(4, 24));
            console.log('cron na produkcii bezi'
                + (min !== null ? ` — trvalo to ${min} min od ziadosti` : ''));
            await c.end();
            process.exit(0);
        }
        await new Promise(r => setTimeout(r, PAUZA_MS));
    }

    console.log('do 15 minut sa neodoslalo — cron zrejme nebezi alebo ma zly token');
    await c.end();
    process.exit(1);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
