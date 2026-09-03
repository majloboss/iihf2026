#!/usr/bin/env node
// Overi dopyty a kontroly zo spravy ciselnika faz.
//
// Bezi v transakcii, ktora sa vrati spat — ciselnik zostane nedotknuty.
//
// Overuje sa to, co by sa inak prejavilo az chybou v admine: ci sa da riadok
// pridat a upravit, ci UNIQUE zachyti duplicitny kod zapasu a ci CHECK odmietne
// neznamu farbu.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

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
        // --- Citanie ---
        const { rows } = await c.query(`
            SELECT id, phase_code, phase_name, match_stat_code, match_stat_desc,
                   color_code, sort_order, is_active
              FROM admin.competition_phases
             WHERE competition_id = 3
             ORDER BY sort_order, match_stat_code`);
        check(rows.length === 17, `UCL má ${rows.length} fáz (očakáva sa 17)`);

        // --- Pridanie ---
        const { rows: novy } = await c.query(`
            INSERT INTO admin.competition_phases
                (competition_id, phase_code, phase_name, match_stat_code,
                 match_stat_desc, color_code, sort_order, is_active)
            VALUES (3, 'TEST', 'Testovacia fáza', 'TST1', 'Test — 1. zápas',
                    'NEUTRAL', 999, TRUE)
            RETURNING id`);
        check(novy.length === 1, 'riadok sa dá pridať');
        const testId = novy[0].id;

        // --- Uprava ---
        const upr = await c.query(`
            UPDATE admin.competition_phases
               SET phase_name = 'Zmenený názov', updated_at = NOW()
             WHERE id = $1`, [testId]);
        check(upr.rowCount === 1, 'riadok sa dá upraviť');

        // --- Duplicitny kod zapasu musi zlyhat ---
        try {
            await c.query(`
                INSERT INTO admin.competition_phases
                    (competition_id, phase_code, phase_name, match_stat_code,
                     match_stat_desc, color_code, sort_order)
                VALUES (3, 'X', 'Iná fáza', 'TST1', 'Duplicita', 'NEUTRAL', 1000)`);
            check(false, 'duplicitný kód zápasu MAL byť odmietnutý');
        } catch (e) {
            check(e.message.includes('phases_stat_uniq'),
                  'duplicitný kód zápasu odmietnutý (' + e.message.slice(0, 40) + '…)');
            await c.query('ROLLBACK'); await c.query('BEGIN');
        }

        // --- Neznama farba musi zlyhat ---
        try {
            await c.query(`
                INSERT INTO admin.competition_phases
                    (competition_id, phase_code, phase_name, match_stat_code,
                     match_stat_desc, color_code, sort_order)
                VALUES (3, 'Y', 'Fáza', 'TST9', 'Test', 'DUHOVA', 1001)`);
            check(false, 'neznáma farba MALA byť odmietnutá');
        } catch (e) {
            check(e.message.includes('phases_color_chk'), 'neznáma farba odmietnutá');
            await c.query('ROLLBACK'); await c.query('BEGIN');
        }

        // --- Rovnaky kod zapasu v INEJ sutazi prejst musi ---
        const { rows: ina } = await c.query(`
            INSERT INTO admin.competition_phases
                (competition_id, phase_code, phase_name, match_stat_code,
                 match_stat_desc, color_code, sort_order)
            VALUES (2, 'LF', 'Ligová fáza', 'LF1', 'Test v inej súťaži', 'GROUP', 999)
            RETURNING id`);
        check(ina.length === 1, 'rovnaký kód v inej súťaži je povolený');

    } catch (e) {
        check(false, 'neočakávaná chyba: ' + e.message);
    } finally {
        await c.query('ROLLBACK');
        console.log('\n(zmeny vrátené späť, číselník je nedotknutý)');
        await c.end();
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
