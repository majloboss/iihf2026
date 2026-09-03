#!/usr/bin/env node
// Vygeneruje migraciu 076 z aktualneho obsahu ciselnika na DEV.
//
// Migracie 072-074 ho zakladaju s povodnymi hodnotami, ale tie boli potom
// rucne opravene v admine (FIFA SKA -> A, PO -> BAR, farby, skupiny). Do
// produkcie preto nejde 072-074, ale jeden skript s tym, co realne plati.
//
// competition_id sa medzi DEV a produkciou lisi, preto sa v migracii dohladava
// podla slugu, nie zapisuje cislom.
//
// Skript iba cita a zapisuje subor migracie.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const conf = fs.readFileSync(path.join(__dirname, '../api/config/db.php'), 'utf8');
const val = k => conf.match(new RegExp("define\\('" + k + "'\\s*,\\s*'([^']*)'"))[1];
const q = v => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;

(async () => {
    const c = new Client({
        host: val('DB_HOST'), port: Number(val('DB_PORT')), database: val('DB_NAME'),
        user: val('DB_USER'), password: val('DB_PASS'), ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    const { rows } = await c.query(`
        SELECT k.slug, p.phase_code, p.phase_name, p.match_stat_code, p.match_stat_desc,
               p.color_code, p.group_code, p.sort_order, p.is_active
          FROM admin.competition_phases p
          JOIN admin.competitions k ON k.id = p.competition_id
         ORDER BY k.slug, p.sort_order, p.match_stat_code`);

    const riadky = rows.map(r =>
        `    (${q(r.slug)}, ${q(r.phase_code)}, ${q(r.phase_name)}, ${q(r.match_stat_code)},` +
        ` ${q(r.match_stat_desc)}, ${q(r.color_code)}, ${q(r.group_code)}, ${r.sort_order}, ${r.is_active})`);

    const sql = `-- Migration 076: obsah ciselnika faz z DEV
--
-- Migracie 072-074 ciselnik zakladaju, ale hodnoty v nich su povodne — po ich
-- spusteni sa este rucne opravovali v admine (FIFA SKA -> A, PO -> BAR, farby,
-- zoskupenia). Tento skript zapise stav, ktory realne plati a proti ktoremu su
-- odskusane filtre.
--
-- Spusta sa PO 072-074. Je opakovatelny: existujuci riadok prepise, chybajuci
-- doplni. Riadky navyse nemaze — v produkcii moze byt sutaz, ktora na DEV nie je.
--
-- competition_id sa medzi prostrediami lisi (DEV 3, produkcia 5), preto sa
-- sutaz dohladava podla slugu.

BEGIN;

CREATE TEMP TABLE _fazy (
    slug            VARCHAR(50),
    phase_code      VARCHAR(20),
    phase_name      VARCHAR(100),
    match_stat_code VARCHAR(20),
    match_stat_desc VARCHAR(150),
    color_code      VARCHAR(20),
    group_code      VARCHAR(20),
    sort_order      INTEGER,
    is_active       BOOLEAN
) ON COMMIT DROP;

INSERT INTO _fazy VALUES
${riadky.join(',\n')};

-- Sutaz, ktora v tomto prostredi nie je, sa ticho preskoci.
INSERT INTO admin.competition_phases
    (competition_id, phase_code, phase_name, match_stat_code, match_stat_desc,
     color_code, group_code, sort_order, is_active)
SELECT k.id, f.phase_code, f.phase_name, f.match_stat_code, f.match_stat_desc,
       f.color_code, f.group_code, f.sort_order, f.is_active
  FROM _fazy f
  JOIN admin.competitions k ON k.slug = f.slug
    ON CONFLICT (competition_id, match_stat_code) DO UPDATE
   SET phase_code      = EXCLUDED.phase_code,
       phase_name      = EXCLUDED.phase_name,
       match_stat_desc = EXCLUDED.match_stat_desc,
       color_code      = EXCLUDED.color_code,
       group_code      = EXCLUDED.group_code,
       sort_order      = EXCLUDED.sort_order,
       is_active       = EXCLUDED.is_active,
       updated_at      = NOW();

INSERT INTO admin.schema_versions (version, description) VALUES
    (76, 'Obsah ciselnika faz z DEV')
    ON CONFLICT DO NOTHING;

COMMIT;
`;

    const cesta = path.join(__dirname, '../api/migrations/076_ciselnik_faz_obsah.sql');
    fs.writeFileSync(cesta, sql, 'utf8');
    console.log(`Zapisane: ${path.basename(cesta)}`);
    console.log(`Faz: ${rows.length}`);
    const podla = {};
    rows.forEach(r => { podla[r.slug] = (podla[r.slug] || 0) + 1; });
    Object.entries(podla).forEach(([s, n]) => console.log(`  ${s.padEnd(12)}${n}`));
    await c.end();
})().catch(e => { console.error('CHYBA:', e.message); process.exit(1); });
