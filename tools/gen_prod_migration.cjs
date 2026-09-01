#!/usr/bin/env node
// Vygeneruje jednu migraciu pre produkciu z aktualneho stavu vyvojovej DB.
//
// Migracie 044-069 vznikali postupne a niektore sa neskor menili (napr. 064
// prerobila vazbu z club_code na club_id, 065 zrusila UNIQUE). Spustat ich na
// produkcii v poradi znamena zopakovat aj slepe ulicky. Tento skript preto cita
// VYSLEDNY stav schemy a zapise ho ako jeden subor.
//
// Ciselniky (staty, kluby, rozpis zapasov, bodovanie) sa prenasaju aj s datami
// — bez nich sutaz nefunguje. Prevadzkove data (tipy, vysledky, livescore_log)
// sa neprenasaju, tie na produkcii vzniknu az hranim.
//
// Skript iba cita a zapisuje subor; do DB nezasahuje.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];

const SCHEMA = 'lm2026-27';
const VYSTUP = path.join(__dirname, '../api/migrations/070_ucl_production.sql');

// Tabulky v poradi zavislosti; `data: true` znamena preniest aj obsah.
const TABULKY = [
    { schema: 'admin',  name: 'countries',       data: true  },
    { schema: 'admin',  name: 'uefa_clubs',      data: true  },
    { schema: 'admin',  name: 'group_viewers',   data: false },
    { schema: 'admin',  name: 'livescore_log',   data: false },
    { schema: SCHEMA,   name: 'scoring_config',  data: true  },
    { schema: SCHEMA,   name: 'games_pdf',       data: true  },
    { schema: SCHEMA,   name: 'games',           data: false },
    { schema: SCHEMA,   name: 'group_standings', data: false },
    { schema: SCHEMA,   name: 'tips',            data: false },
];

const q = s => '"' + String(s).replace(/"/g, '""') + '"';

// Hodnota do SQL literalu. Pole a JSON maju vlastny zapis, datum ide v ISO.
const lit = v => {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
    if (Array.isArray(v) || typeof v === 'object') {
        return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
    }
    return `'${String(v).replace(/'/g, "''")}'`;
};

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const out = [];
    const w = s => out.push(s);

    w('-- Migration 070: UEFA Champions League 2026/27 — nasadenie do produkcie');
    w('--');
    w('-- Jediny skript namiesto migracii 044-069. Tie vznikali postupne a cast');
    w('-- z nich sa neskor menila (064 prerobila vazbu z club_code na club_id,');
    w('-- 065 zrusila UNIQUE), takze ich opakovanie na produkcii by prechadzalo');
    w('-- aj slepymi ulickami. Tento subor zapisuje rovno vysledny stav.');
    w('--');
    w('-- Vygenerovane skriptom tools/gen_prod_migration.cjs zo schemy vyvojovej DB.');
    w(`-- Datum: ${new Date().toISOString().slice(0, 10)}`);
    w('--');
    w('-- SPUSTAT AKO VLASTNIK SCHEM (dbdevbet-admin), nie ako aplikacny pouzivatel:');
    w('-- skript zaklada schemu a tabulky a nastavuje prava.');
    w('--');
    w('-- Prenasa sa struktura vsetkych tabuliek a obsah ciselnikov (staty, kluby,');
    w('-- rozpis zapasov z PDF, bodovanie). Tipy, vysledky a zaznamy livescore sa');
    w('-- neprenasaju — tie na produkcii vzniknu az hranim.');
    w('');
    w('BEGIN;');
    w('');
    w(`CREATE SCHEMA IF NOT EXISTS ${q(SCHEMA)};`);
    w('');

    for (const t of TABULKY) {
        const plne = `${q(t.schema)}.${q(t.name)}`;

        // --- Stlpce ---
        const { rows: cols } = await c.query(`
            SELECT column_name, data_type, udt_name, character_maximum_length AS len,
                   numeric_precision AS p, numeric_scale AS s,
                   is_nullable, column_default
              FROM information_schema.columns
             WHERE table_schema = $1 AND table_name = $2
             ORDER BY ordinal_position`, [t.schema, t.name]);

        if (!cols.length) { console.error('CHYBA: tabuľka neexistuje —', plne); process.exit(1); }

        const typ = r => {
            if (r.column_default && /^nextval\(/.test(r.column_default)) {
                return r.udt_name === 'int8' ? 'BIGSERIAL' : 'SERIAL';
            }
            switch (r.data_type) {
                case 'character varying': return r.len ? `VARCHAR(${r.len})` : 'VARCHAR';
                case 'character':         return `CHAR(${r.len})`;
                case 'numeric':           return r.p ? `NUMERIC(${r.p},${r.s})` : 'NUMERIC';
                case 'timestamp without time zone': return 'TIMESTAMP';
                case 'timestamp with time zone':    return 'TIMESTAMPTZ';
                case 'USER-DEFINED':      return r.udt_name;
                case 'ARRAY':             return r.udt_name.replace(/^_/, '') + '[]';
                default:                  return r.data_type.toUpperCase();
            }
        };

        w(`-- ── ${t.schema}.${t.name} ${'─'.repeat(Math.max(0, 46 - t.schema.length - t.name.length))}`);
        w(`CREATE TABLE IF NOT EXISTS ${plne} (`);
        const riadky = cols.map(r => {
            let d = `    ${q(r.column_name)} ${typ(r)}`;
            if (r.is_nullable === 'NO') d += ' NOT NULL';
            if (r.column_default && !/^nextval\(/.test(r.column_default)) {
                d += ` DEFAULT ${r.column_default}`;
            }
            return d;
        });
        w(riadky.join(',\n'));
        w(');');
        w('');

        // --- Kluce a indexy ---
        const { rows: idx } = await c.query(`
            SELECT indexdef FROM pg_indexes
             WHERE schemaname = $1 AND tablename = $2
             ORDER BY indexname`, [t.schema, t.name]);

        const { rows: cons } = await c.query(`
            SELECT con.conname, pg_get_constraintdef(con.oid) AS def, con.contype
              FROM pg_constraint con
              JOIN pg_class rel ON rel.oid = con.conrelid
              JOIN pg_namespace ns ON ns.oid = rel.relnamespace
             WHERE ns.nspname = $1 AND rel.relname = $2
             ORDER BY CASE con.contype WHEN 'p' THEN 1 WHEN 'u' THEN 2
                                       WHEN 'c' THEN 3 ELSE 4 END, con.conname`, [t.schema, t.name]);

        for (const k of cons) {
            // Podmienka na existenciu, aby sa skript dal spustit opakovane.
            // Odchytavanie vynimky nestaci: druhy PRIMARY KEY hlasi
            // invalid_table_definition, nie duplicate_object.
            w(`DO $$ BEGIN`);
            w(`    IF NOT EXISTS (SELECT 1 FROM pg_constraint con`);
            w(`                     JOIN pg_class rel ON rel.oid = con.conrelid`);
            w(`                     JOIN pg_namespace ns ON ns.oid = rel.relnamespace`);
            w(`                    WHERE ns.nspname = '${t.schema}' AND rel.relname = '${t.name}'`);
            w(`                      AND con.conname = '${k.conname}') THEN`);
            w(`        ALTER TABLE ${plne} ADD CONSTRAINT ${q(k.conname)} ${k.def};`);
            w(`    END IF;`);
            w(`END $$;`);
        }

        // Indexy, ktore nevznikli z constraintu.
        const zKlucov = new Set(cons.map(k => k.conname));
        for (const i of idx) {
            const meno = i.indexdef.match(/INDEX (\S+) ON/)?.[1];
            if (!meno || zKlucov.has(meno)) continue;
            w(i.indexdef.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS')
                        .replace('CREATE UNIQUE INDEX', 'CREATE UNIQUE INDEX IF NOT EXISTS') + ';');
        }
        w('');

        // --- Data ciselnikov ---
        if (t.data) {
            const { rows } = await c.query(`SELECT * FROM ${plne}`);
            if (rows.length) {
                const mena = cols.map(r => r.column_name);
                const pk = cons.find(k => k.contype === 'p');
                const konflikt = pk
                    ? ` ON CONFLICT ON CONSTRAINT ${q(pk.conname)} DO NOTHING`
                    : '';

                w(`-- ${rows.length} riadkov`);
                // Po davkach, aby jeden prikaz nebol privelky.
                const DAVKA = 100;
                for (let i = 0; i < rows.length; i += DAVKA) {
                    const cast = rows.slice(i, i + DAVKA);
                    w(`INSERT INTO ${plne} (${mena.map(q).join(', ')}) VALUES`);
                    w(cast.map(r => '    (' + mena.map(m => lit(r[m])).join(', ') + ')').join(',\n')
                      + konflikt + ';');
                }

                // Sekvencie musia pokracovat za najvyssim prenesenym id.
                for (const r of cols) {
                    if (r.column_default && /^nextval\(/.test(r.column_default)) {
                        w(`SELECT setval(pg_get_serial_sequence('${t.schema}.${t.name}', '${r.column_name}'),`
                          + ` COALESCE((SELECT MAX(${q(r.column_name)}) FROM ${plne}), 1));`);
                    }
                }
                w('');
            }
        }
    }

    // --- Prava aplikacneho pouzivatela ---
    w('-- ── Prava aplikacneho pouzivatela ──────────────────────');
    w("-- Aplikacia sa pripaja ako dbbet-admin a potrebuje DML nad vsetkym v schéme.");
    w(`GRANT USAGE ON SCHEMA ${q(SCHEMA)} TO "dbbet-admin";`);
    w(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${q(SCHEMA)} TO "dbbet-admin";`);
    w(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${q(SCHEMA)} TO "dbbet-admin";`);
    w(`ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(SCHEMA)}`);
    w(`    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "dbbet-admin";`);
    w('GRANT SELECT, INSERT, UPDATE, DELETE ON admin.countries, admin.uefa_clubs,');
    w('      admin.group_viewers, admin.livescore_log TO "dbbet-admin";');
    w('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA admin TO "dbbet-admin";');
    w('');

    // --- Stlpec v existujucej tabulke ---
    w('-- ── Skryte skupiny ─────────────────────────────────────');
    w("-- friend_groups uz na produkcii existuje, pribuda jediny stlpec.");
    w("ALTER TABLE admin.friend_groups");
    w("    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public';");
    w('');

    w('INSERT INTO admin.schema_versions (version, description) VALUES');
    w("    (70, 'UCL 2026/27 - nasadenie do produkcie (nahrada za 044-069)')");
    w('    ON CONFLICT DO NOTHING;');
    w('');
    w('COMMIT;');
    w('');

    fs.writeFileSync(VYSTUP, out.join('\n'), 'utf8');
    console.log('zapisane:', VYSTUP);
    console.log('riadkov:', out.length);

    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
