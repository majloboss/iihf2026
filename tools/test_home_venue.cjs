#!/usr/bin/env node
// Overi migraciu 067 (domaci stadion klubu) proti DB.
// Bezi v transakcii, ktora sa na konci vrati spat.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

// Migracia ma vlastny BEGIN/COMMIT — vo vnutri testovacej transakcie by ju ukoncil.
const sql = fs.readFileSync(path.join(__dirname, '../api/migrations/067_uefa_clubs_home_venue.sql'), 'utf8')
    .replace(/^BEGIN;$/m, '')
    .replace(/^COMMIT;$/m, '');

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
        // ALTER TABLE na admin.uefa_clubs vyzaduje vlastnika, ktorym aplikacny
        // pouzivatel nie je. Logika naplnenia sa preto overi na docasnej kopii
        // v schéme public — samotny ALTER spusti admin z konzoly.
        await c.query(`CREATE TEMP TABLE uefa_clubs AS
                       SELECT club_id, club_code, club_name, NULL::varchar(200) AS home_venue,
                              updated_at FROM admin.uefa_clubs`);
        const naplnenie = sql
            .slice(sql.indexOf('WITH pocty AS'))
            .replace(/admin\.uefa_clubs/g, 'uefa_clubs')
            .replace(/INSERT INTO uefa_clubs[\s\S]*$/, '');
        await c.query(naplnenie);

        const { rows: pocet } = await c.query(
            'SELECT COUNT(*) AS n FROM uefa_clubs WHERE home_venue IS NOT NULL');
        check(Number(pocet[0].n) === 36, `domaci stadion dostalo ${pocet[0].n} klubov (cakam 36)`);

        // Klub ligovej fazy bez stadiona by znamenal dieru v datach.
        const { rows: bez } = await c.query(`
            SELECT COUNT(*) AS n FROM uefa_clubs c
             WHERE c.home_venue IS NULL
               AND EXISTS (SELECT 1 FROM "lm2026-27".games_pdf p
                            WHERE p.phase = 'LEAGUE' AND p.home_team_id = c.club_id)`);
        check(Number(bez[0].n) === 0, 'kazdy klub ligovej fazy ma domaci stadion');

        // Viking hra doma na dvoch stadionoch — domaci ma byt ten castejsi.
        const { rows: viking } = await c.query(`
            SELECT c.club_name, c.home_venue,
                   (SELECT string_agg(DISTINCT p.venue, ' | ') FROM "lm2026-27".games_pdf p
                     WHERE p.home_team_id = c.club_id AND p.phase = 'LEAGUE') AS vsetky
              FROM uefa_clubs c WHERE c.club_name LIKE 'Viking%'`);
        check(viking[0]?.home_venue === 'Lyse Arena',
              `Viking ma domaci stadion ${viking[0]?.home_venue} (hra na: ${viking[0]?.vsetky})`);

        // Kolko zapasov sa bude zobrazovat ako iny stadion.
        const { rows: ine } = await c.query(`
            SELECT COUNT(*) AS n FROM "lm2026-27".games_pdf p
              JOIN uefa_clubs c ON c.club_id = p.home_team_id
             WHERE p.phase = 'LEAGUE' AND NULLIF(p.venue, '') IS NOT NULL
               AND p.venue <> c.home_venue`);
        console.log(`\nZapasov na inom nez domacom stadione: ${ine[0].n}`);

        const { rows: zoznam } = await c.query(`
            SELECT c.club_name, c.home_venue, p.venue AS hra_sa_na,
                   to_char(p.starts_at, 'DD.MM.YYYY') AS den
              FROM "lm2026-27".games_pdf p
              JOIN uefa_clubs c ON c.club_id = p.home_team_id
             WHERE p.phase = 'LEAGUE' AND NULLIF(p.venue, '') IS NOT NULL
               AND p.venue <> c.home_venue
             ORDER BY p.starts_at`);
        if (zoznam.length) console.table(zoznam);

        console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    } finally {
        await c.query('ROLLBACK');
        console.log('(zmeny vratene spat, DB je nedotknuta)');
        await c.end();
    }
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
