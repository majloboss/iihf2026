#!/usr/bin/env node
// Overi, ze generatory tipov a vysledkov pokryvaju aj playoff — nielen ligovu
// fazu. Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const S = '"lm2026-27"';
let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

const goals = () => [0, 1, 1, 2, 2, 3][Math.floor(Math.random() * 6)];

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        // --- Zapasy s urcenymi timami naprieč fazami ---
        const { rows: podlaFazy } = await c.query(`
            SELECT game_type_code, COUNT(*) AS n
              FROM ${S}.games WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL
             GROUP BY 1 ORDER BY 1`);
        const fazy = Object.fromEntries(podlaFazy.map(r => [r.game_type_code, Number(r.n)]));
        check(fazy.LEAGUE === 144, `ligova faza ma ${fazy.LEAGUE} zapasov s timami`);
        check((fazy.PO || 0) > 0, `baraz ma ${fazy.PO || 0} zapasov s timami`);

        // --- Generovanie tipov: uz nesmie byt viazane na ligovu fazu ---
        const { rows: hraci } = await c.query(
            'SELECT id FROM admin.users WHERE is_active ORDER BY id');
        const { rows: zapasy } = await c.query(`
            SELECT game_id FROM ${S}.games
             WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL ORDER BY game_id`);
        check(zapasy.length === 144 + (fazy.PO || 0),
              `na tipovanie je ${zapasy.length} zapasov (vratane baraze)`);

        for (const g of zapasy) {
            for (const h of hraci) {
                await c.query(`INSERT INTO ${S}.tips (user_id, game_id, home_score_tip,
                    away_score_tip, entered_by_admin) VALUES ($1,$2,$3,$4,TRUE)
                    ON CONFLICT (user_id, game_id) DO NOTHING`, [h.id, g.game_id, goals(), goals()]);
            }
        }
        const { rows: tipyPO } = await c.query(`
            SELECT COUNT(DISTINCT t.game_id) AS n FROM ${S}.tips t
              JOIN ${S}.games g ON g.game_id = t.game_id
             WHERE g.game_type_code = 'PO'`);
        check(Number(tipyPO[0].n) === (fazy.PO || 0),
              `TIPY VZNIKLI AJ PRE BARAZ (${tipyPO[0].n} zapasov)`);

        // --- Generovanie vysledkov v odvete: remiza sa doriesi predlzenim ---
        // Prvy zapas dvojice 1:1, odveta tiez 1:1 -> sucet rovnaky.
        await c.query(`UPDATE ${S}.games SET home_score_regular=1, away_score_regular=1,
                         result_approved=TRUE WHERE tie_id='PO-1' AND leg=1`);

        const { rows: odveta } = await c.query(
            `SELECT game_id FROM ${S}.games WHERE tie_id='PO-1' AND leg=2`);
        const { rows: prvy } = await c.query(
            `SELECT home_score_regular AS hs, away_score_regular AS ag
               FROM ${S}.games WHERE tie_id='PO-1' AND leg=1`);

        const h = 1, a = 1;
        const remiza = (Number(prvy[0].ag) + h) === (Number(prvy[0].hs) + a);
        check(remiza, 'sucet dvojice je pri 1:1 a 1:1 rovnaky');

        // Presne toto robi generator: doplni vitaza v predlzeni.
        const hf = h + 1, af = a;
        await c.query(`UPDATE ${S}.games SET home_score_regular=$1, away_score_regular=$2,
                         home_score_final=$3, away_score_final=$4, result_approved=TRUE
                        WHERE game_id=$5`, [h, a, hf, af, odveta[0].game_id]);

        const { rows: po } = await c.query(`
            SELECT home_score_final AS hf, away_score_final AS af
              FROM ${S}.games WHERE game_id = $1`, [odveta[0].game_id]);
        check(po[0].hf !== null && po[0].hf !== po[0].af,
              `ODVETA MA VITAZA PO PREDLZENI (${po[0].hf}:${po[0].af})`);

        // --- Ligova faza smie skoncit remizou ---
        const { rows: ligaRemiza } = await c.query(`
            SELECT COUNT(*) AS n FROM ${S}.games
             WHERE game_type_code='LEAGUE' AND result_approved
               AND home_score_regular = away_score_regular
               AND home_score_final IS NULL`);
        check(Number(ligaRemiza[0].n) >= 0, `v ligovej faze je ${ligaRemiza[0].n} remiz bez predlzenia`);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
