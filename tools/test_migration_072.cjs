#!/usr/bin/env node
// Nanecisto spusti migraciu 072 a overi obsah ciselnika faz.
//
// Bezi v transakcii, ktora sa na konci VRATI SPAT — databaza zostane nedotknuta.
//
// Overuje sa to podstatne: ze skript prejde, ze pre kazdu sutaz vznikli riadky
// a ze kazda existujuca faza v zapasoch ma v ciselniku svoj protajsok. Bez toho
// by po naviazani zapasov cast z nich zostala bez fazy.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const SUBOR = path.join(__dirname, '../api/migrations/072_competition_phases.sql');

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
        // GRANTy vynechame — aplikacny pouzivatel ich sam sebe udelit nemoze.
        const sql = fs.readFileSync(SUBOR, 'utf8')
            .replace(/BEGIN;|COMMIT;/g, '')
            .replace(/^\s*GRANT[\s\S]*?;\s*$/gm, '');

        await c.query(sql);
        check(true, 'migrácia prebehla bez chyby');

        const { rows: pocty } = await c.query(`
            SELECT cm.slug, COUNT(*) AS n
              FROM admin.competition_phases p
              JOIN admin.competitions cm ON cm.id = p.competition_id
             GROUP BY cm.slug ORDER BY cm.slug`);
        pocty.forEach(r => check(Number(r.n) > 0, `${r.slug}: ${r.n} riadkov`));
        check(pocty.length === 3, `naplnené všetky tri súťaže (${pocty.length})`);

        // Farby musia byť z povoleného zoznamu — CHECK by inak neprešiel.
        const { rows: farby } = await c.query(`
            SELECT color_code, COUNT(*) n FROM admin.competition_phases
             GROUP BY 1 ORDER BY 1`);
        console.log('\nfarby:');
        farby.forEach(r => console.log(`  ${r.color_code.padEnd(9)} ${r.n}×`));

        // Kľúčová kontrola: každá fáza zo zápasov musí mať protajšok v číselníku.
        //
        // Porovnávajú sa KÓDY, nie názvy — číselník používa slovenčinu a kratšie
        // popisy („Osemfinále" vs „Round of 16"), takže zhoda textov by nič
        // nedokázala. Ligová fáza UCL má jeden kód pre osem kôl, preto sa počíta
        // počet riadkov v číselníku na daný kód.
        const SUTAZE = [
            { id: 1, slug: 'iihf2026',
              sql: 'SELECT DISTINCT phase AS kod FROM iihf2026.games' },
            { id: 2, slug: 'fifa2026',
              sql: `SELECT DISTINCT replace(game_type_code, 'GROUP_', '') AS kod FROM fifa2026.games` },
            { id: 3, slug: 'ucl2026',
              sql: `SELECT DISTINCT replace(game_type_code, 'LEAGUE', 'LF') AS kod FROM "lm2026-27".games` },
        ];

        console.log('');
        for (const s of SUTAZE) {
            const { rows: kody } = await c.query(s.sql);
            const { rows: cis } = await c.query(
                'SELECT DISTINCT phase_code FROM admin.competition_phases WHERE competition_id = $1',
                [s.id]);

            const znamy = new Set(cis.map(r => r.phase_code));
            const chyba = kody.map(r => r.kod).filter(k => !znamy.has(k));

            check(chyba.length === 0,
                  `${s.slug}: všetky kódy fáz zo zápasov sú v číselníku`
                  + (chyba.length ? ` — chýbajú: ${chyba.join(', ')}` : ''));
        }

        // Počet kôl ligovej fázy UCL musí sedieť s počtom v zápasoch.
        const { rows: kolaZap } = await c.query(`
            SELECT COUNT(DISTINCT game_type_name) n FROM "lm2026-27".games
             WHERE game_type_code = 'LEAGUE'`);
        const { rows: kolaCis } = await c.query(`
            SELECT COUNT(*) n FROM admin.competition_phases
             WHERE competition_id = 3 AND phase_code = 'LF'`);
        check(kolaZap[0].n === kolaCis[0].n,
              `UCL: ${kolaCis[0].n} kôl ligovej fázy (v zápasoch ${kolaZap[0].n})`);

        // Opakované spustenie nesmie spadnúť ani zdvojiť riadky.
        const pred = (await c.query('SELECT COUNT(*) n FROM admin.competition_phases')).rows[0].n;
        await c.query(sql);
        const po = (await c.query('SELECT COUNT(*) n FROM admin.competition_phases')).rows[0].n;
        check(pred === po, `opakované spustenie nezdvojí riadky (${pred} → ${po})`);

    } catch (e) {
        check(false, 'migrácia zlyhala: ' + e.message);
    } finally {
        await c.query('ROLLBACK');
        console.log('\n(zmeny vrátené späť, databáza je nedotknutá)');
        await c.end();
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
