#!/usr/bin/env node
// Overi zmrazenie 90-minutoveho vysledku pri prechode do predlzenia a
// casove okno, v ktorom livescore sleduje zapasy.
// Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnaky dopyt ako ucl_livescore_fn.php.
const ZMRAZ = `
    UPDATE ${S}.games
       SET home_score_regular = ls_home, away_score_regular = ls_away, updated_at = NOW()
     WHERE game_id = $1
       AND home_score_regular IS NULL
       AND ls_home IS NOT NULL AND ls_away IS NOT NULL`;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        const { rows: k } = await c.query(
            `SELECT game_id FROM ${S}.games WHERE game_type_code <> 'LEAGUE'
              AND home_team_id IS NOT NULL ORDER BY game_id LIMIT 1`);
        const gid = k[0].game_id;

        // --- Zapas dospeje do predlzenia ---
        await c.query(`UPDATE ${S}.games SET ls_home=1, ls_away=1, ls_status='2. polčas 90''',
                         home_score_regular=NULL, away_score_regular=NULL,
                         home_score_final=NULL, away_score_final=NULL, result_approved=FALSE
                        WHERE game_id=$1`, [gid]);

        await c.query(ZMRAZ, [gid]);
        const { rows: po } = await c.query(
            `SELECT home_score_regular AS h, away_score_regular AS a FROM ${S}.games WHERE game_id=$1`, [gid]);
        check(po[0].h === 1 && po[0].a === 1, `90-minutovy vysledok zmrazeny na ${po[0].h}:${po[0].a}`);

        // --- Livescore hlasi dalsi gol v predlzeni ---
        await c.query(`UPDATE ${S}.games SET ls_home=2, ls_away=1, ls_status='predĺženie 105''' WHERE game_id=$1`, [gid]);
        await c.query(ZMRAZ, [gid]);   // dalsi beh cronu
        const { rows: po2 } = await c.query(
            `SELECT home_score_regular AS h, away_score_regular AS a, ls_home, ls_away
               FROM ${S}.games WHERE game_id=$1`, [gid]);
        check(po2.h !== 2 && po2[0].h === 1 && po2[0].a === 1,
              `OPAKOVANY BEH NEPREPISAL 90 MIN (${po2[0].h}:${po2[0].a}), livescore ide dalej (${po2[0].ls_home}:${po2[0].ls_away})`);

        // --- Admin uz zadal vysledok: cron ho nesmie prepisat ---
        await c.query(`UPDATE ${S}.games SET home_score_regular=0, away_score_regular=0 WHERE game_id=$1`, [gid]);
        await c.query(ZMRAZ, [gid]);
        const { rows: po3 } = await c.query(
            `SELECT home_score_regular AS h FROM ${S}.games WHERE game_id=$1`, [gid]);
        check(po3[0].h === 0, 'rucne zadany vysledok zostal nedotknuty');

        // --- Casove okno: vecerny zapas s penaltami po polnoci ---
        const { rows: okno } = await c.query(`
            SELECT
              -- zapas o 21:00 SEC = 19:00 UTC, kontrola o 00:30 UTC (po polnoci)
              ('2026-09-08 19:00'::timestamp
                 BETWEEN '2026-09-09 00:30'::timestamp - INTERVAL '8 hours'
                     AND '2026-09-09 00:30'::timestamp + INTERVAL '12 hours') AS po_polnoci,
              -- ten isty zapas podla povodneho filtra "dnesny den"
              ('2026-09-08 19:00'::timestamp::date = '2026-09-09 00:30'::timestamp::date) AS stary_filter`);
        check(okno[0].po_polnoci === true, 'NOVE OKNO ZACHYTI ZAPAS AJ PO POLNOCI');
        check(okno[0].stary_filter === false, 'povodny denny filter by ho vynechal');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
