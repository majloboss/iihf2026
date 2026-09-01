#!/usr/bin/env node
// Overi, ze hromadny prepocet bodov da rovnake vysledky ako povodny cyklus.
// Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        const { rows: cfgRows } = await c.query(`SELECT key, value FROM ${S}.scoring_config`);
        const cfg = Object.fromEntries(cfgRows.map(r => [r.key, Number(r.value)]));
        const ptsLeague = cfg.correct_result_group ?? 3;
        const ptsPlayoff = cfg.correct_result_playoff ?? 5;
        const ptsGoals = cfg.correct_goals_per_team ?? 1;

        // --- Povodny vypocet v JS, riadok po riadku ---
        const { rows: tipy } = await c.query(`
            SELECT t.user_id, t.game_id, t.home_score_tip AS th, t.away_score_tip AS ta,
                   g.home_score_regular AS hs, g.away_score_regular AS ag, g.game_type_code
              FROM ${S}.tips t JOIN ${S}.games g ON g.game_id = t.game_id
             WHERE g.result_approved AND g.home_score_regular IS NOT NULL
               AND g.away_score_regular IS NOT NULL`);
        check(tipy.length > 0, `na prepocet je ${tipy.length} tipov`);

        const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
        const ocakavane = new Map();
        for (const t of tipy) {
            const base = t.game_type_code === 'LEAGUE' ? ptsLeague : ptsPlayoff;
            let b = 0;
            if (sign(t.hs, t.ag) === sign(t.th, t.ta)) b += base;
            if (t.th === t.hs) b += ptsGoals;
            if (t.ta === t.ag) b += ptsGoals;
            ocakavane.set(`${t.user_id}-${t.game_id}`, b);
        }

        // --- Hromadny prepocet, rovnaky dopyt ako helper ---
        await c.query(`UPDATE ${S}.tips SET points_earned = NULL`);
        const res = await c.query(`
            UPDATE ${S}.tips t
               SET points_earned =
                     CASE WHEN sign(g.home_score_regular - g.away_score_regular)
                             = sign(t.home_score_tip - t.away_score_tip)
                          THEN CASE WHEN g.game_type_code = 'LEAGUE'
                                    THEN ${ptsLeague} ELSE ${ptsPlayoff} END
                          ELSE 0 END
                   + CASE WHEN t.home_score_tip = g.home_score_regular THEN ${ptsGoals} ELSE 0 END
                   + CASE WHEN t.away_score_tip = g.away_score_regular THEN ${ptsGoals} ELSE 0 END,
                   updated_at = NOW()
              FROM ${S}.games g
             WHERE g.game_id = t.game_id AND g.result_approved
               AND g.home_score_regular IS NOT NULL AND g.away_score_regular IS NOT NULL`);
        check(res.rowCount === tipy.length, `prepocitanych ${res.rowCount} tipov`);

        // --- Porovnanie ---
        const { rows: skutocne } = await c.query(`
            SELECT t.user_id, t.game_id, t.points_earned AS b
              FROM ${S}.tips t JOIN ${S}.games g ON g.game_id = t.game_id
             WHERE g.result_approved AND g.home_score_regular IS NOT NULL`);
        let rozdiely = 0;
        for (const r of skutocne) {
            if (ocakavane.get(`${r.user_id}-${r.game_id}`) !== r.b) rozdiely++;
        }
        check(rozdiely === 0, `HROMADNY PREPOCET DAVA ROVNAKE BODY (${rozdiely} rozdielov)`);

        // --- Rozsah bodov ---
        const { rows: rozsah } = await c.query(`
            SELECT MIN(t.points_earned) AS min, MAX(t.points_earned) AS max,
                   MAX(t.points_earned) FILTER (WHERE g.game_type_code = 'LEAGUE') AS max_liga,
                   MAX(t.points_earned) FILTER (WHERE g.game_type_code <> 'LEAGUE') AS max_po
              FROM ${S}.tips t JOIN ${S}.games g ON g.game_id = t.game_id
             WHERE t.points_earned IS NOT NULL`);
        const r = rozsah[0];
        check(Number(r.min) >= 0, `najnizsi pocet bodov je ${r.min}`);
        check(Number(r.max_liga) <= 5, `v ligovej faze najviac ${r.max_liga} bodov (limit 5)`);
        if (r.max_po !== null) {
            check(Number(r.max_po) <= 7, `v playoff najviac ${r.max_po} bodov (limit 7)`);
        }

        // Tip na nedohrany zapas nesmie dostat body.
        const { rows: bezVysledku } = await c.query(`
            SELECT COUNT(*) AS n FROM ${S}.tips t JOIN ${S}.games g ON g.game_id = t.game_id
             WHERE NOT g.result_approved AND t.points_earned IS NOT NULL`);
        check(Number(bezVysledku[0].n) === 0, 'tipy na neschvalene zapasy zostali bez bodov');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
