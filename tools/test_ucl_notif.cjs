#!/usr/bin/env node
// Overi, ze dopyty v send_notifications_ucl.php bezia proti databaze.
//
// PHP CLI na tomto stroji nie je, takze chyba v SQL by sa ukazala az v crone —
// teda mlcky, bez notifikacii. Dopyty su tu prepisane rovnako ako v skripte,
// vratane uvodzoviek okolo schemy s pomlckou.
//
// Skript iba cita, bezi v transakcii, ktora sa vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

const DOPYTY = [
    ['zoznam pouzivatelov s nastaveniami', `
        SELECT u.id, u.email, u.username,
               ns_start.enabled AS gs_enabled, ns_start.minutes_before AS gs_min,
               ns_ut.enabled AS ut_enabled, ns_pgr.enabled AS pgr_enabled,
               (SELECT COUNT(*) FROM admin.user_push_subscriptions WHERE user_id = u.id) AS push_count
          FROM admin.users u
          LEFT JOIN admin.notification_settings ns_start ON ns_start.user_id = u.id AND ns_start.notif_type = 'game_start'
          LEFT JOIN admin.notification_settings ns_ut    ON ns_ut.user_id = u.id AND ns_ut.notif_type = 'untipped_game'
          LEFT JOIN admin.notification_settings ns_pgr   ON ns_pgr.user_id = u.id AND ns_pgr.notif_type = 'pre_game_reminder'
         WHERE u.is_active = TRUE
           AND ((u.email IS NOT NULL AND u.email <> '')
                OR EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id))`],

    ['dokoncene zapasy za poslednych 12 minut', `
        SELECT g.game_id, g.game_type_code, g.game_type_name, g.tie_id, g.leg,
               hc.club_name AS team1, ac.club_name AS team2,
               g.home_score_regular AS s1, g.away_score_regular AS s2,
               g.home_score_final AS f1, g.away_score_final AS f2
          FROM "lm2026-27".games g
          JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.result_approved = TRUE AND g.home_score_regular IS NOT NULL
           AND g.updated_at >= NOW() - INTERVAL '12 minutes'`],

    ['blizice sa zapasy', `
        SELECT g.game_id, g.game_type_code, g.game_type_name, g.start_time,
               hc.club_name AS team1, ac.club_name AS team2
          FROM "lm2026-27".games g
          JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.result_approved = FALSE
           AND (g.start_time AT TIME ZONE 'UTC') BETWEEN NOW() + (30 - 3) * INTERVAL '1 minute'
                                                     AND NOW() + (30 + 3) * INTERVAL '1 minute'
           AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                           WHERE nl.user_id = 1 AND nl.notif_type = 'ucl_game_start' AND nl.game_id = g.game_id)`],

    ['prijemcovia vysledku (email)', `
        SELECT u.id, u.email, u.username, t.home_score_tip, t.away_score_tip, t.points_earned
          FROM admin.users u
          JOIN admin.notification_settings ns ON ns.user_id = u.id
          LEFT JOIN "lm2026-27".tips t ON t.user_id = u.id AND t.game_id = 1
         WHERE ns.notif_type = 'result_entered' AND ns.enabled = TRUE AND ns.email_enabled = TRUE
           AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''
           AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                           WHERE nl.user_id = u.id AND nl.notif_type = 'ucl_result_entered' AND nl.game_id = 1)`],

    ['ma pouzivatel tip', `SELECT 1 FROM "lm2026-27".tips WHERE user_id = 1 AND game_id = 1`],

    ['zapis do notification_log', `
        INSERT INTO admin.notification_log (user_id, notif_type, game_id, competition_id)
        VALUES (1, 'ucl_test', NULL, 5) ON CONFLICT DO NOTHING`],
];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');

    for (const [popis, sql] of DOPYTY) {
        try {
            const r = await c.query(sql);
            check(true, `${popis} (${r.rowCount ?? 0} riadkov)`);
        } catch (e) {
            check(false, `${popis}: ${e.message}`);
            await c.query('ROLLBACK');
            await c.query('BEGIN');
        }
    }

    // Sutaz musi mat spravne id, inak by sa zaznamy priradili inej sutazi.
    // Id sa medzi prostrediami lisi, skript ho preto cita z DB podla slugu.
    const { rows } = await c.query("SELECT id FROM admin.competitions WHERE slug = 'ucl2026'");
    check(rows.length === 1, `sutaz ucl2026 ma id ${rows[0]?.id} (skript ho cita z DB)`);

    await c.query('ROLLBACK');
    await c.end();
    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
