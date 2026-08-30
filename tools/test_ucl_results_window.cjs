#!/usr/bin/env node
// Overi, ze generovanie vysledkov berie iba dohrane zapasy — teda tie, ktorym
// od vykopu ubehli aspon tri hodiny. Simuluje posuvanie terminov pocas testovania.
// Vsetko bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
const LEAGUE = `FROM ${S}.games WHERE game_type_code = 'LEAGUE'
                  AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL`;
const FINISHED = ` AND start_time + INTERVAL '3 hours' <= (NOW() AT TIME ZONE 'UTC')`;

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
        const count = async sql => Number((await c.query('SELECT COUNT(*) ' + sql)).rows[0].count);

        // Cistý stav: zápasy z games_pdf, žiadne výsledky.
        await c.query(`DELETE FROM ${S}.tips`);
        await c.query(`DELETE FROM ${S}.games`);
        await c.query(`INSERT INTO ${S}.games
            (game_id, home_team_id, away_team_id, start_time, venue,
             game_type_code, game_type_name, tie_id, leg)
            SELECT p.game_number, p.home_team_id, p.away_team_id, p.starts_at,
                   COALESCE(p.venue, ''), p.phase,
                   CASE WHEN p.phase = 'LEAGUE'
                        THEN 'Ligová fáza — ' || p.round_no || '. kolo'
                        ELSE p.phase END,
                   p.tie_id, p.leg
              FROM ${S}.games_pdf p`);

        check(await count(LEAGUE) === 144, 'nahranych 144 ligovych zapasov');

        // Rozpis je v buducnosti (september 2026 a neskor), takze nic nie je dohrane.
        check(await count(LEAGUE + FINISHED) === 0,
              'pred posunom terminov nie je dohrany ziadny zapas');

        // --- Posun 1. kola do minulosti, tak ako to bude robit admin ---
        await c.query(`UPDATE ${S}.games SET start_time = (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 hours'
                        WHERE game_type_code = 'LEAGUE'
                          AND game_type_name LIKE '%1. kolo%'`);
        check(await count(LEAGUE + FINISHED) === 18, 'po posune 1. kola je dohranych 18 zapasov');

        // Zapas, ktory sa prave hra (pred hodinou), sa este neberie.
        await c.query(`UPDATE ${S}.games SET start_time = (NOW() AT TIME ZONE 'UTC') - INTERVAL '1 hour'
                        WHERE game_id = (SELECT MIN(game_id) FROM ${S}.games
                                          WHERE game_type_code = 'LEAGUE')`);
        check(await count(LEAGUE + FINISHED) === 17,
              'rozohrany zapas (pred hodinou) sa nepovazuje za dohrany');

        // Presne na hranici troch hodin uz dohrany je.
        await c.query(`UPDATE ${S}.games SET start_time = (NOW() AT TIME ZONE 'UTC') - INTERVAL '3 hours'
                        WHERE game_id = (SELECT MIN(game_id) FROM ${S}.games
                                          WHERE game_type_code = 'LEAGUE')`);
        check(await count(LEAGUE + FINISHED) === 18, 'zapas presne 3 hodiny po vykope je dohrany');

        // --- Generovanie vysledkov len pre dohrane ---
        const toFill = (await c.query('SELECT game_id ' + LEAGUE + FINISHED
                                      + ' AND home_score_regular IS NULL')).rows;
        check(toFill.length === 18, `na doplnenie caka ${toFill.length} zapasov`);

        for (const g of toFill) {
            await c.query(`UPDATE ${S}.games SET home_score_regular = 1, away_score_regular = 0,
                result_approved = TRUE, tips_open = FALSE WHERE game_id = $1`, [g.game_id]);
        }
        check(await count(LEAGUE + ' AND home_score_regular IS NOT NULL') === 18,
              'vysledok dostalo presne 18 dohranych zapasov');
        check(await count(LEAGUE + FINISHED + ' AND home_score_regular IS NULL') === 0,
              'ziadny dohrany zapas nezostal bez vysledku');

        // Druhe spustenie uz nema co robit.
        check(await count(LEAGUE + FINISHED + ' AND home_score_regular IS NULL') === 0,
              'opakovane spustenie nic nedoplni');

        // --- Posun 2. kola: pribudne dalsich 18 ---
        await c.query(`UPDATE ${S}.games SET start_time = (NOW() AT TIME ZONE 'UTC') - INTERVAL '4 hours'
                        WHERE game_type_code = 'LEAGUE' AND game_type_name LIKE '%2. kolo%'`);
        check(await count(LEAGUE + FINISHED + ' AND home_score_regular IS NULL') === 18,
              'po posune 2. kola caka na doplnenie dalsich 18 zapasov');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
