#!/usr/bin/env node
// Overi dopyty zo player_stats.php proti vsetkym trom sutaziam.
//
// Kazda sutaz ma inu schemu a IIHF navyse ine nazvy stlpcov (id, starts_at,
// phase). Chyba by sa prejavila az bielou obrazovkou v Profile.
//
// Skript iba cita.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnake rozlisenie ako v endpointe.
const SUTAZE = [
    { slug: 'ucl2026',  schema: '"lm2026-27"', join: 'g.game_id = t.game_id', phase: 'g.game_type_name', time: 'g.start_time', body: 'points_earned' },
    { slug: 'fifa2026', schema: 'fifa2026',    join: 'g.game_id = t.game_id', phase: 'g.game_type_name', time: 'g.start_time', body: 'points_earned' },
    // IIHF vzniklo ako prve a ma vlastne nazvy stlpcov.
    { slug: 'iihf2026', schema: 'iihf2026',    join: 'g.id = t.game_id',      phase: 'g.phase',          time: 'g.starts_at',  body: 'points' },
];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    for (const s of SUTAZE) {
        const dopyty = [
            ['súhrn', `
                SELECT COUNT(*) AS tipov, COALESCE(SUM(t.${s.body}),0) AS body,
                       COALESCE(MAX(t.${s.body}),0) AS najlepsi,
                       COUNT(*) FILTER (WHERE t.${s.body} = 0) AS bez_bodu
                  FROM ${s.schema}.tips t
                 WHERE t.user_id = 2 AND t.${s.body} IS NOT NULL`],

            ['rozloženie', `
                SELECT t.${s.body} AS body, COUNT(*) AS pocet
                  FROM ${s.schema}.tips t
                 WHERE t.user_id = 2 AND t.${s.body} IS NOT NULL
                 GROUP BY 1 ORDER BY 1 DESC`],

            ['fázy', `
                SELECT ${s.phase} AS faza, COUNT(*) AS tipov,
                       COALESCE(SUM(t.${s.body}),0) AS body
                  FROM ${s.schema}.tips t
                  JOIN ${s.schema}.games g ON ${s.join}
                 WHERE t.user_id = 2 AND t.${s.body} IS NOT NULL
                 GROUP BY 1 ORDER BY MIN(${s.time})`],

            ['poradie', `
                WITH sucty AS (
                    SELECT user_id, COALESCE(SUM(${s.body}),0) AS body
                      FROM ${s.schema}.tips WHERE ${s.body} IS NOT NULL
                     GROUP BY user_id
                )
                SELECT (SELECT COUNT(*) + 1 FROM sucty s2
                         WHERE s2.body > (SELECT body FROM sucty WHERE user_id = 2)) AS poradie,
                       (SELECT COUNT(*) FROM sucty) AS hracov,
                       (SELECT MAX(body) FROM sucty) AS najviac`],
        ];

        for (const [popis, sql] of dopyty) {
            try {
                const r = await c.query(sql);
                check(true, `${s.slug}: ${popis} (${r.rows.length} riadkov)`);
            } catch (e) {
                check(false, `${s.slug}: ${popis} — ${e.message}`);
            }
        }
    }

    // Poradie musi sediet s tym, co ukazuje celkove poradie hracov.
    const { rows } = await c.query(`
        SELECT user_id, COALESCE(SUM(points_earned),0) AS body
          FROM "lm2026-27".tips WHERE points_earned IS NOT NULL
         GROUP BY user_id ORDER BY body DESC LIMIT 3`);
    console.log('\nUCL — traja najlepší:');
    rows.forEach((r, i) => console.log(`  ${i + 1}. user ${r.user_id}: ${r.body} b`));

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    await c.end();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
