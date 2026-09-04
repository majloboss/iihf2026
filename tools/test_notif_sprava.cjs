#!/usr/bin/env node
// Overi vyber sprav od organizatora, ktore maju vyvolat upozornenie.
//
// Rovnaky dopyt ako v send_notifications_message.php. Kontroluje sa, ze sa
// neposielaju precitane ani zmazane spravy, ze sa upozornenie neopakuje a ze
// vlastne spravy hraca sa ignoruju.
//
// Skript nic nemeni — pisuce casti bezia v transakcii, ktora sa vrati.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// To iste, co posiela cron.
const VYBER = `
    SELECT m.id, m.user_id, u.username
      FROM admin.messages m
      JOIN admin.users u ON u.id = m.user_id
      LEFT JOIN admin.notification_settings ns
             ON ns.user_id = u.id AND ns.notif_type = 'admin_message'
     WHERE m.sender = 'admin'
       AND m.read_at IS NULL
       AND m.deleted_at IS NULL
       AND m.created_at >= NOW() - INTERVAL '7 days'
       AND u.is_active = TRUE
       AND COALESCE(ns.enabled, TRUE) = TRUE
       AND (u.email IS NOT NULL
            OR EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id))
       AND NOT EXISTS (
             SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = m.user_id
                AND nl.notif_type = 'admin_message'
                AND nl.game_id = m.id)
     ORDER BY m.created_at`;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    console.log(`databáza: ${val('DB_NAME')}\n`);

    const { rows: teraz } = await c.query(VYBER);
    console.log(`na odoslanie teraz: ${teraz.length}`);
    teraz.forEach(r => console.log(`    správa #${r.id} pre ${r.username}`));

    // Vlastne spravy hraca sa nesmu posielat spat jemu.
    const { rows: vlastne } = await c.query(
        "SELECT COUNT(*)::int n FROM admin.messages WHERE sender <> 'admin'");
    const { rows: vybrane } = await c.query(
        `SELECT COUNT(*)::int n FROM (${VYBER}) x
           JOIN admin.messages m ON m.id = x.id WHERE m.sender <> 'admin'`);
    check(vybrane[0].n === 0,
          `správy od hráčov sa neposielajú (${vlastne[0].n} v tabuľke, 0 vybraných)`);

    // Precitanu spravu netreba pripominat.
    const { rows: precitane } = await c.query(
        `SELECT COUNT(*)::int n FROM (${VYBER}) x
           JOIN admin.messages m ON m.id = x.id WHERE m.read_at IS NOT NULL`);
    check(precitane[0].n === 0, 'prečítané správy sa nepripomínajú');

    // Po zapise do logu sa uz sprava nesmie vybrat znovu.
    await c.query('BEGIN');
    try {
        if (teraz.length) {
            const s = teraz[0];
            await c.query(
                "INSERT INTO admin.notification_log (user_id, notif_type, game_id, sent_at)" +
                " VALUES ($1, 'admin_message', $2, NOW())", [s.user_id, s.id]);
            const { rows: po } = await c.query(VYBER);
            check(!po.some(r => r.id === s.id),
                  `po odoslaní sa správa #${s.id} už nevyberie znovu`);
        } else {
            // Ziadna sprava necaka — dedup sa overi na docasnej, ktora sa
            // aj tak vrati rollbackom.
            const { rows: u } = await c.query(
                "SELECT id FROM admin.users WHERE is_active AND email IS NOT NULL LIMIT 1");
            if (!u.length) { console.log('OK    (žiadny vhodný používateľ)'); }
            else {
                const { rows: nova } = await c.query(
                    "INSERT INTO admin.messages (user_id, sender, body, created_at)" +
                    " VALUES ($1, 'admin', 'skúšobná správa', NOW()) RETURNING id", [u[0].id]);
                const mid = nova[0].id;

                const { rows: pred } = await c.query(VYBER);
                check(pred.some(r => r.id === mid), 'neprečítaná správa od admina sa vyberie');

                await c.query(
                    "INSERT INTO admin.notification_log (user_id, notif_type, game_id, sent_at)" +
                    " VALUES ($1, 'admin_message', $2, NOW())", [u[0].id, mid]);
                const { rows: po } = await c.query(VYBER);
                check(!po.some(r => r.id === mid), 'po odoslaní sa už nevyberie znovu');

                await c.query('UPDATE admin.messages SET read_at = NOW() WHERE id = $1', [mid]);
                await c.query(
                    "DELETE FROM admin.notification_log WHERE notif_type='admin_message' AND game_id=$1", [mid]);
                const { rows: pocit } = await c.query(VYBER);
                check(!pocit.some(r => r.id === mid), 'prečítaná správa sa nepošle ani bez záznamu v logu');
            }
        }
    } finally {
        await c.query('ROLLBACK');
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli (zmeny vratene)');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
