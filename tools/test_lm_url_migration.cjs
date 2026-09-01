#!/usr/bin/env node
// Overi migraciu 066 proti DB: kazdy UPDATE musi trafit spravny zapas.
// Bezi v transakcii, ktora sa na konci vrati spat — DB zostane nedotknuta.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const sql = fs.readFileSync(path.join(__dirname, '../api/migrations/066_ucl_urls_venues.sql'), 'utf8');

// Flashscore nazov -> club_code, rovnake mapovanie ako v gen_lm_games_pdf.cjs.
const MAP = {
    'AEK Athens': 'XAEK', 'AS Roma': 'ROM', 'Arsenal': 'ARS',
    'Aston Villa': 'AVL', 'Atl. Madrid': 'ATM', 'Barcelona': 'BAR',
    'Bayern Munich': 'BAY', 'Betis': 'BET', 'Bodo/Glimt': 'BOD',
    'Club Brugge KV': 'BRU', 'Como': 'XCOM', 'Dortmund': 'BVB',
    'FC Porto': 'POR', 'Fenerbahce': 'FEN', 'Feyenoord': 'FEY',
    'Galatasaray': 'GAL', 'Inter': 'INT', 'LASK': 'XLAS', 'Lens': 'XLEN',
    'Lille': 'LIL', 'Liverpool': 'LIV', 'Manchester City': 'MCI',
    'Manchester Utd': 'MUN', 'Napoli': 'NAP', 'PSG': 'PSG', 'PSV': 'PSV',
    'RB Leipzig': 'RBL', 'Real Madrid': 'RMA', 'Sabah Baku': 'XSAB',
    'Shakhtar Donetsk': 'SHK', 'Slavia Prague': 'SLA',
    'Slovan Bratislava': 'SLB', 'Sporting CP': 'SPO',
    'Stuttgart': 'STU', 'Viking': 'XVIK', 'Villarreal': 'VIL',
};

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Z komentara za kazdym UPDATE sa da precitat, ktoru dvojicu ma trafit.
const ocakavane = new Map();
for (const m of sql.matchAll(/WHERE game_number = (\d+); -- (.+?) - (.+)/g)) {
    ocakavane.set(Number(m[1]), { home: m[2].trim(), away: m[3].trim() });
}

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();
    await c.query('BEGIN');
    try {
        check(ocakavane.size === 144, `migracia aktualizuje ${ocakavane.size} zapasov`);

        // Migracia ma vlastny BEGIN/COMMIT — vo vnutri transakcie by COMMIT
        // ukoncil aj nasu, preto sa oba prikazy vynechaju.
        await c.query(sql.replace(/^BEGIN;$/m, '').replace(/^COMMIT;$/m, ''));

        // Kluby drzi tabulka bud cez club_id (po migracii 064), alebo este cez
        // kod. Test ma fungovat v oboch stavoch.
        const { rows: stlpce } = await c.query(`
            SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'lm2026-27' AND table_name = 'games_pdf'`);
        const maId = stlpce.some(x => x.column_name === 'home_team_id');
        console.log(maId ? '(tabulka pouziva club_id)' : '(tabulka este pouziva club_code)');

        const joinHome = maId ? 'h.club_id = p.home_team_id' : 'h.club_code = p.home_code';
        const joinAway = maId ? 'a.club_id = p.away_team_id' : 'a.club_code = p.away_code';

        const { rows } = await c.query(`
            SELECT p.game_number, p.venue, p.flashscore_url,
                   h.club_name AS home, a.club_name AS away
              FROM "lm2026-27".games_pdf p
              LEFT JOIN admin.uefa_clubs h ON ${joinHome}
              LEFT JOIN admin.uefa_clubs a ON ${joinAway}
             WHERE p.phase = 'LEAGUE' ORDER BY p.game_number`);

        check(rows.length === 144, `v DB je ${rows.length} ligovych zapasov`);
        check(rows.every(r => r.flashscore_url), 'kazdy ligovy zapas ma URL');
        check(rows.every(r => r.venue), 'kazdy ligovy zapas ma stadion');

        // Nazov v CSV ("Atl. Madrid") a v ciselniku ("Atlético de Madrid") sa
        // lisia, preto sa porovnava cez club_code — to iste mapovanie, ake
        // pouziva generator rozpisu.
        const kodPodlaCsv = MAP;
        const { rows: klubyDb } = await c.query(
            'SELECT club_id, club_code FROM admin.uefa_clubs');
        const kodPodlaId = Object.fromEntries(klubyDb.map(k => [k.club_id, k.club_code]));

        const { rows: dvojice } = await c.query(`
            SELECT game_number, ${maId ? 'home_team_id, away_team_id' :
                                        'home_code, away_code'}
              FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'`);
        const kodyVDb = new Map(dvojice.map(d => [d.game_number, maId
            ? [kodPodlaId[d.home_team_id], kodPodlaId[d.away_team_id]]
            : [d.home_code, d.away_code]]));

        const zle = [];
        for (const r of rows) {
            const o = ocakavane.get(r.game_number);
            if (!o) { zle.push(`${r.game_number}: chyba v migracii`); continue; }
            const [dbHome, dbAway] = kodyVDb.get(r.game_number) ?? [];
            if (kodPodlaCsv[o.home] !== dbHome || kodPodlaCsv[o.away] !== dbAway) {
                zle.push(`${r.game_number}: migracia ${o.home}-${o.away}`
                       + ` (${kodPodlaCsv[o.home]}-${kodPodlaCsv[o.away]}),`
                       + ` DB ${dbHome}-${dbAway}`);
            }
        }
        check(zle.length === 0,
              `kazdy UPDATE trafil spravny zapas${zle.length ? ':\n      ' + zle.slice(0, 10).join('\n      ') : ''}`);

        // Viking hra jeden domaci zapas inde — presne ten pripad, kvoli ktoremu
        // stadion patri k zapasu, nie ku klubu.
        const { rows: viking } = await c.query(`
            SELECT p.game_number, p.venue, p.starts_at::date AS den
              FROM "lm2026-27".games_pdf p
              JOIN admin.uefa_clubs h ON ${joinHome}
             WHERE h.club_name LIKE 'Viking%' AND p.phase = 'LEAGUE'
             ORDER BY p.starts_at`);
        const stadiony = new Set(viking.map(v => v.venue));
        check(stadiony.size === 2,
              `Viking ma doma dva rozne stadiony: ${[...stadiony].join(' | ')}`);

        // URL musia byt jedinecne — dve rovnake by znamenali chybu v parovani.
        const { rows: dup } = await c.query(`
            SELECT flashscore_url, COUNT(*) AS n FROM "lm2026-27".games_pdf
             WHERE phase = 'LEAGUE' GROUP BY 1 HAVING COUNT(*) > 1`);
        check(dup.length === 0, `ziadna URL sa neopakuje${dup.length ? ` (${dup.length} duplicit)` : ''}`);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
