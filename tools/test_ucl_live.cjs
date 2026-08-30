#!/usr/bin/env node
// Overi rucne nastavenie priebezneho skore rovnakymi dopytmi, ake pouziva
// endpoint ucl_game_live. Bezi v transakcii, ktora sa na konci vrati spat.
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
        // Rozohrany zapas bez schvaleneho vysledku.
        const { rows: kandidat } = await c.query(`
            SELECT game_id FROM ${S}.games
             WHERE NOT result_approved AND home_team_id IS NOT NULL
             ORDER BY game_id LIMIT 1`);
        check(kandidat.length === 1, `na test sa pouzije zapas #${kandidat[0]?.game_id}`);
        const gid = kandidat[0].game_id;

        // --- Nastavenie ---
        await c.query(`UPDATE ${S}.games
                          SET ls_home = $1, ls_away = $2, ls_status = 'ručne',
                              ls_updated_at = NOW(), updated_at = NOW()
                        WHERE game_id = $3`, [2, 1, gid]);
        const { rows: po } = await c.query(
            `SELECT ls_home, ls_away, ls_status FROM ${S}.games WHERE game_id = $1`, [gid]);
        check(po[0].ls_home === 2 && po[0].ls_away === 1, `zive skore ulozene: ${po[0].ls_home}:${po[0].ls_away}`);
        check(po[0].ls_status === 'ručne', `stav oznaceny ako '${po[0].ls_status}'`);

        // --- Prevzatie do vysledku, ako to robi tlacidlo ---
        await c.query(`UPDATE ${S}.games
                          SET home_score_regular = ls_home, away_score_regular = ls_away,
                              result_approved = TRUE
                        WHERE game_id = $1`, [gid]);
        const { rows: schvaleny } = await c.query(
            `SELECT home_score_regular AS h, away_score_regular AS a, result_approved
               FROM ${S}.games WHERE game_id = $1`, [gid]);
        check(schvaleny[0].h === 2 && schvaleny[0].a === 1,
              `vysledok prevzaty zo zivého skore: ${schvaleny[0].h}:${schvaleny[0].a}`);
        check(schvaleny[0].result_approved === true, 'vysledok je schvaleny');

        // --- Zmazanie ---
        await c.query(`UPDATE ${S}.games
                          SET ls_home = NULL, ls_away = NULL, ls_status = NULL, ls_updated_at = NULL
                        WHERE game_id = $1`, [gid]);
        const { rows: zmazane } = await c.query(
            `SELECT ls_home, ls_status FROM ${S}.games WHERE game_id = $1`, [gid]);
        check(zmazane[0].ls_home === null && zmazane[0].ls_status === null, 'zive skore zmazane');

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
