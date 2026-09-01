#!/usr/bin/env node
// Overi logiku testovacich nastrojov LM proti DB-DEV-BET rovnakymi dopytmi,
// ake pouzivaju endpointy ucl_load_pdf, ucl_generate_tips a ucl_generate_results.
// Vsetko bezi v transakcii, ktora sa na konci vrati spat — DB zostane nedotknuta.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = key => conf.match(new RegExp("define\\('" + key + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
const PHASE_NAME = {
    PO: 'Baráž o postup do play-off', R16: 'Osemfinále',
    QF: 'Štvrťfinále', SF: 'Semifinále', F: 'Finále',
};
const W = { 0: 24, 1: 31, 2: 23, 3: 13, 4: 6, 5: 2, 6: 1 };
const goals = () => {
    const total = Object.values(W).reduce((a, b) => a + b, 0);
    let roll = 1 + Math.floor(Math.random() * total);
    for (const [g, w] of Object.entries(W)) { roll -= w; if (roll <= 0) return Number(g); }
    return 1;
};

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
        // ---- 1. Nacitanie z PDF ----
        const { rows: pdf } = await c.query(`SELECT * FROM ${S}.games_pdf ORDER BY game_number`);
        check(pdf.length === 189, `games_pdf ma ${pdf.length} zapasov (cakam 189)`);

        const bezKlubu = pdf.filter(g => g.phase === 'LEAGUE'
            && (g.home_team_id === null || g.away_team_id === null)).length;
        check(bezKlubu === 0, `vsetky ligove zapasy maju kluby${bezKlubu ? ` (chyba ${bezKlubu})` : ''}`);

        await c.query(`DELETE FROM ${S}.tips`);
        await c.query(`DELETE FROM ${S}.games`);
        for (const g of pdf) {
            const name = g.phase === 'LEAGUE'
                ? `Ligová fáza — ${g.round_no}. kolo`
                : (PHASE_NAME[g.phase] || g.phase) +
                  (g.leg ? (g.leg === 1 ? ' — 1. zápas' : ' — odveta') : '');
            await c.query(
                `INSERT INTO ${S}.games (game_id, home_team_id, away_team_id, start_time, venue,
                    game_type_code, game_type_name, tie_id, leg, flashscore_url)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [g.game_number, g.home_team_id, g.away_team_id, g.starts_at, g.venue || '',
                 g.phase, name, g.tie_id, g.leg, g.flashscore_url]);
        }
        const loaded = Number((await c.query(`SELECT COUNT(*) FROM ${S}.games`)).rows[0].count);
        check(loaded === 189, `do games sa nahralo ${loaded} zapasov`);

        // Kolo sa musi dat vytiahnut z game_type_name presne tak, ako to robi games.php.
        const { rows: rounds } = await c.query(
            `SELECT NULLIF(substring(game_type_name from '([0-9]+)\\. kolo'), '')::int AS round_no,
                    COUNT(*) AS n
               FROM ${S}.games WHERE game_type_code = 'LEAGUE'
              GROUP BY 1 ORDER BY 1`);
        check(rounds.length === 8 && rounds.every(r => Number(r.n) === 18),
              `filter kola najde 8 kol po 18 zapasov (${rounds.map(r => r.round_no + ':' + r.n).join(' ')})`);

        // ---- 2. Generovanie tipov ----
        const users = (await c.query('SELECT id FROM admin.users WHERE is_active ORDER BY id'))
            .rows.map(r => r.id);
        const lg = (await c.query(`SELECT game_id FROM ${S}.games
             WHERE game_type_code = 'LEAGUE' AND home_team_id IS NOT NULL
               AND away_team_id IS NOT NULL ORDER BY game_id`)).rows.map(r => r.game_id);
        check(lg.length === 144, `tipovatelnych ligovych zapasov: ${lg.length}`);

        for (const gid of lg) for (const uid of users) {
            await c.query(`INSERT INTO ${S}.tips (user_id, game_id, home_score_tip, away_score_tip,
                entered_by_admin) VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (user_id, game_id) DO NOTHING`,
                [uid, gid, goals(), goals()]);
        }
        const tips = Number((await c.query(`SELECT COUNT(*) FROM ${S}.tips`)).rows[0].count);
        check(tips === users.length * lg.length,
              `tipov: ${tips} (${users.length} hracov x ${lg.length} zapasov)`);

        // ---- 3. Generovanie vysledkov ----
        for (const gid of lg) {
            await c.query(`UPDATE ${S}.games SET home_score_regular=$1, away_score_regular=$2,
                home_score_final=NULL, away_score_final=NULL, result_approved=TRUE,
                tips_open=FALSE, updated_at=NOW() WHERE game_id=$3`, [goals(), goals(), gid]);
        }
        const done = Number((await c.query(
            `SELECT COUNT(*) FROM ${S}.games WHERE result_approved`)).rows[0].count);
        check(done === 144, `schvalenych vysledkov: ${done}`);

        // Bodovanie sa overi rovnakym vzorcom, aky ma ucl_recalc_fn.php.
        const { rows: bodovanie } = await c.query(`
            SELECT MAX(pts) AS max_pts, MIN(pts) AS min_pts, COUNT(*) AS n FROM (
                SELECT CASE WHEN sign(g.home_score_regular - g.away_score_regular)
                               = sign(t.home_score_tip - t.away_score_tip) THEN 3 ELSE 0 END
                     + CASE WHEN t.home_score_tip = g.home_score_regular THEN 1 ELSE 0 END
                     + CASE WHEN t.away_score_tip = g.away_score_regular THEN 1 ELSE 0 END AS pts
                  FROM ${S}.tips t JOIN ${S}.games g ON g.game_id = t.game_id
                 WHERE g.result_approved) x`);
        const b = bodovanie[0];
        check(Number(b.max_pts) <= 5 && Number(b.min_pts) >= 0,
              `body za tip v rozsahu 0-5 (min ${b.min_pts}, max ${b.max_pts}, ${b.n} tipov)`);

        // Ligova tabulka: 36 timov, kazdy 8 zapasov.
        const { rows: tab } = await c.query(`
            SELECT COUNT(*) AS timov, MIN(gp) AS min_gp, MAX(gp) AS max_gp FROM (
                SELECT club_id, COUNT(*) AS gp FROM admin.uefa_clubs cl
                  JOIN ${S}.games g ON g.home_team_id = cl.club_id OR g.away_team_id = cl.club_id
                 WHERE g.game_type_code = 'LEAGUE' GROUP BY club_id) x`);
        check(Number(tab[0].timov) === 36 && Number(tab[0].min_gp) === 8 && Number(tab[0].max_gp) === 8,
              `tabulka: ${tab[0].timov} timov, kazdy ${tab[0].min_gp}-${tab[0].max_gp} zapasov`);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
