#!/usr/bin/env node
// Nanecisto spusti produkcnu migraciu a porovna vysledok s vyvojovou schemou.
//
// Skript bezi v transakcii, ktora sa na konci VRATI SPAT — databaza zostane
// nedotknuta. Tabulky sa zakladaju do docasnej schemy, takze sa nemoze stat,
// ze by prepisali existujuce data.
//
// Overuje sa to, na com zalezi: ze skript prejde bez chyby, ze vzniknu vsetky
// tabulky so spravnymi stlpcami a ze ciselniky maju rovnaky pocet riadkov.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const SUBOR = path.join(__dirname, '../api/migrations/070_ucl_production.sql');
const TEST_SCHEMA = 'lm2026-27';
const SKUSOBNA = '_test_lm2026';       // sem sa presmeruje "lm2026-27"
const SKUSOBNY_ADMIN = '_test_admin';  // sem sa presmeruje "admin"

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
        let sql = fs.readFileSync(SUBOR, 'utf8');

        // Presmerovanie do skusobnych schem, aby sa nedotklo skutocnych dat.
        sql = sql.replace(/BEGIN;|COMMIT;/g, '')
                 .replace(new RegExp(`"${TEST_SCHEMA}"`, 'g'), `"${SKUSOBNA}"`)
                 .replace(/"admin"\./g, `"${SKUSOBNY_ADMIN}".`)
                 .replace(/\badmin\.(countries|uefa_clubs|group_viewers|livescore_log|friend_groups|schema_versions)\b/g,
                          `"${SKUSOBNY_ADMIN}".$1`)
                 // GRANTy a DEFAULT PRIVILEGES sa v teste preskocia — aplikacny
                 // pouzivatel ich sam sebe udelit nemoze.
                 .replace(/^\s*(GRANT|ALTER DEFAULT PRIVILEGES)[\s\S]*?;\s*$/gm, '')
                 // pg_get_serial_sequence potrebuje skutocne meno schemy.
                 .replace(new RegExp(`'${TEST_SCHEMA}\\.`, 'g'), `'${SKUSOBNA}.`)
                 .replace(/'admin\./g, `'${SKUSOBNY_ADMIN}.`)
                 // Mena schem v podmienkach na existenciu constraintov.
                 .replace(new RegExp(`nspname = '${TEST_SCHEMA}'`, 'g'), `nspname = '${SKUSOBNA}'`)
                 .replace(/nspname = 'admin'/g, `nspname = '${SKUSOBNY_ADMIN}'`);

        await c.query(`CREATE SCHEMA "${SKUSOBNY_ADMIN}"`);
        // users, friend_groups a schema_versions uz na produkcii existuju — v
        // teste sa vytvoria len ich kluce, na ktore sa migracia odkazuje.
        await c.query(`CREATE TABLE "${SKUSOBNY_ADMIN}".users (id SERIAL PRIMARY KEY)`);
        await c.query(`CREATE TABLE "${SKUSOBNY_ADMIN}".friend_groups (id SERIAL PRIMARY KEY)`);
        await c.query(`CREATE TABLE "${SKUSOBNY_ADMIN}".schema_versions (
            version INTEGER PRIMARY KEY, description VARCHAR(255), applied_at TIMESTAMP DEFAULT NOW())`);

        await c.query(sql);
        check(true, 'skript prebehol bez chyby');

        // --- Porovnanie so skutocnou schemou ---
        const tabulky = [
            ['countries', SKUSOBNY_ADMIN, 'admin', true],
            ['uefa_clubs', SKUSOBNY_ADMIN, 'admin', true],
            ['group_viewers', SKUSOBNY_ADMIN, 'admin', false],
            ['livescore_log', SKUSOBNY_ADMIN, 'admin', false],
            ['scoring_config', SKUSOBNA, TEST_SCHEMA, true],
            ['games_pdf', SKUSOBNA, TEST_SCHEMA, true],
            ['games', SKUSOBNA, TEST_SCHEMA, false],
            ['group_standings', SKUSOBNA, TEST_SCHEMA, false],
            ['tips', SKUSOBNA, TEST_SCHEMA, false],
        ];

        for (const [meno, nova, povodna, sDatami] of tabulky) {
            const stlpce = async (schema) => (await c.query(`
                SELECT column_name, data_type, is_nullable
                  FROM information_schema.columns
                 WHERE table_schema = $1 AND table_name = $2
                 ORDER BY column_name`, [schema, meno])).rows;

            const a = await stlpce(nova);
            const b = await stlpce(povodna);

            check(a.length === b.length && a.length > 0,
                  `${meno}: ${a.length} stĺpcov (očakáva sa ${b.length})`);

            const rozdiel = b.filter((x, i) =>
                !a[i] || a[i].column_name !== x.column_name
                      || a[i].data_type !== x.data_type
                      || a[i].is_nullable !== x.is_nullable);
            if (rozdiel.length) {
                check(false, `      líšia sa: ${rozdiel.map(r => r.column_name).join(', ')}`);
            }

            if (sDatami) {
                const n = async (schema) =>
                    Number((await c.query(`SELECT COUNT(*) c FROM "${schema}".${meno}`)).rows[0].c);
                const [x, y] = [await n(nova), await n(povodna)];
                check(x === y, `      dáta: ${x} riadkov (očakáva sa ${y})`);
            }
        }

        // Stlpec visibility musi pribudnut do existujucej tabulky.
        const { rows: vis } = await c.query(`
            SELECT column_name FROM information_schema.columns
             WHERE table_schema = $1 AND table_name = 'friend_groups'
               AND column_name = 'visibility'`, [SKUSOBNY_ADMIN]);
        check(vis.length === 1, 'friend_groups dostala stĺpec visibility');

        // Zapis do evidencie migracii.
        const { rows: ver } = await c.query(
            `SELECT version FROM "${SKUSOBNY_ADMIN}".schema_versions WHERE version = 70`);
        check(ver.length === 1, 'migrácia sa zapísala do schema_versions');

        // Opakovane spustenie nesmie spadnut.
        await c.query(sql);
        check(true, 'OPAKOVANÉ spustenie prejde tiež (skript je idempotentný)');

    } catch (e) {
        check(false, 'skript zlyhal: ' + e.message);
    } finally {
        await c.query('ROLLBACK');
        console.log('\n(zmeny vrátené späť, databáza je nedotknutá)');
        await c.end();
    }

    console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
