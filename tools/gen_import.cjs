// Vygeneruje migraciu 054: vyprazdni ciselnik, nahra staty z CSV,
// doplni sportove kody a premapuje UCL kluby zo sportovych kodov na ISO.
const fs = require('fs');

const CSV = 'sources/flags/state_flag_list.csv';
const OUT = 'api/migrations/054_countries_import.sql';
const MAP = process.argv[2];

const q = v => (v === null || v === undefined || v === '' ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'");
// V CSV je "-" znacka pre chybajucu hodnotu.
const val = v => { const s = String(v == null ? '' : v).trim(); return (s === '' || s === '-') ? null : s; };

const rows = fs.readFileSync(CSV, 'utf8').replace(/^﻿/, '')
    .split(/\r?\n/).slice(1).filter(l => l.trim())
    .map(l => l.split(';').map(x => x.trim()));

const problems = [];
const seen3 = new Map(), seen2 = new Map(), seenId = new Map();
const values = [];

rows.forEach((r, i) => {
    const line = i + 2;
    const [id, c2, c3, origin, en, sk, skLong, flagBig, flagSmall, check] = r;

    if (!/^[A-Z]{2,3}(-[A-Z]{2,3})?$/.test(c3)) { problems.push('riadok ' + line + ': neplatny kod "' + c3 + '"'); return; }
    if (c2 && !/^[A-Z]{2,3}(-[A-Z]{2,3})?$/.test(c2)) { problems.push('riadok ' + line + ': neplatny kod2 "' + c2 + '"'); return; }
    if (!val(sk)) { problems.push('riadok ' + line + ' (' + c3 + '): chyba slovensky nazov'); return; }
    if (seen3.has(c3)) { problems.push('riadok ' + line + ': duplicitny kod ' + c3); return; }
    if (c2 && seen2.has(c2)) { problems.push('riadok ' + line + ': duplicitny kod2 ' + c2); return; }
    if (seenId.has(id)) { problems.push('riadok ' + line + ': duplicitne id ' + id); return; }
    seen3.set(c3, line); if (c2) seen2.set(c2, line); seenId.set(id, line);

    const flag = f => {
        const v = val(f);
        if (!v) return null;
        if (v !== v.split(/[\\/]/).pop()) { problems.push('riadok ' + line + ': vlajka s cestou "' + v + '"'); return null; }
        return v;
    };

    // name_en je NOT NULL; ak CSV nema anglicky nazov, pouzije sa slovensky.
    const nameEn = val(en) || val(sk);

    values.push('    (' + [
        /^\d+$/.test(id) ? id : 'NULL',
        q(c3), q(val(c2)), q(val(sk)), q(nameEn), q(val(origin)),
        q(val(skLong)), q(flag(flagSmall)), q(flag(flagBig)), q(val(check)),
    ].join(', ') + ')');
});

if (problems.length) { console.error('CHYBY:\n  ' + problems.join('\n  ')); process.exit(1); }

const sportMap = fs.readFileSync(MAP, 'utf8').trim();

// Kontrola, ze kazdy ISO kod v mapovani existuje v CSV
for (const m of sportMap.matchAll(/\('([A-Z-]+)'/g)) {
    if (!seen3.has(m[1])) { console.error('Mapovanie odkazuje na neexistujuci kod: ' + m[1]); process.exit(1); }
}

const sql = `-- Migration 054: naplnenie ciselnika statov zo zdrojoveho CSV
-- Zdroj: sources/flags/state_flag_list.csv (${values.length} statov), vlajky v sources/flags/
--
-- Ciselnik sa najprv vyprazdni, preto sa UCL kluby docasne odpoja od FK
-- a po importe znova napoja cez sportove kody UEFA.
-- Cela migracia bezi v jednej transakcii: pri chybe sa nic nezmeni.
--
-- V CSV je "-" znacka pre chybajucu hodnotu a uklada sa ako NULL.
-- Ak stat nema anglicky nazov, pouzije sa slovensky (name_en je NOT NULL).

BEGIN;

-- 1. Odpojit kluby od oboch ciselnikov, aby sa dali vyprazdnit.
--    Na teams.country_code su dva FK: z migracie 048 na stary "lm2026-27".countries
--    a z migracie 050 na admin.countries. Oba musia prec, inak stary FK zablokuje
--    ISO kody, ktore v starej tabulke nie su (napr. GB-ENG).
ALTER TABLE "lm2026-27".teams DROP CONSTRAINT IF EXISTS ucl_teams_admin_country_code_fkey;
ALTER TABLE "lm2026-27".teams DROP CONSTRAINT IF EXISTS ucl_teams_country_code_fkey;

-- 2. Vyprazdnit ciselnik.
DELETE FROM admin.countries;

-- 3. Nahrat staty z CSV.
INSERT INTO admin.countries
    (source_id, country_code, country_code2, name_sk, name_en, name_original,
     name_sk_long, flag_file, flag_file_big, flag_check)
VALUES
${values.join(',\n')};

-- 4. Doplnit sportove kody FIFA / IIHF / UEFA.
UPDATE admin.countries c SET
    sport_code_fifa = s.fifa,
    sport_code_iihf = s.iihf,
    sport_code_uefa = s.uefa
FROM (VALUES
${sportMap}
) AS s(iso, fifa, iihf, uefa)
WHERE c.country_code = s.iso;

-- 5. Premapovat UCL kluby zo sportovych kodov UEFA na ISO kody.
UPDATE "lm2026-27".teams t
SET country_code = c.country_code
FROM admin.countries c
WHERE c.sport_code_uefa = t.country_code
  AND t.country_code IS DISTINCT FROM c.country_code;

-- 6. Overit, ze kazdy klub ma platny kod; inak transakciu zrusit.
DO $$
DECLARE bad_count INTEGER; bad_list TEXT;
BEGIN
    SELECT COUNT(*), string_agg(DISTINCT t.country_code, ', ')
      INTO bad_count, bad_list
      FROM "lm2026-27".teams t
     WHERE t.country_code IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM admin.countries c WHERE c.country_code = t.country_code);
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'Import zruseny: % klubov ma neplatny kod statu (%)', bad_count, bad_list;
    END IF;
END $$;

-- 7. Znova napojit FK, uz iba na spolocny admin.countries.
ALTER TABLE "lm2026-27".teams
    ADD CONSTRAINT ucl_teams_admin_country_code_fkey
    FOREIGN KEY (country_code) REFERENCES admin.countries(country_code);

-- 8. Stary UCL ciselnik statov nahradil admin.countries, uz sa nepouziva.
DROP TABLE IF EXISTS "lm2026-27".countries;

INSERT INTO admin.schema_versions (version, description)
VALUES (54, 'Import ${values.length} statov z CSV, sportove kody a premapovanie UCL klubov na ISO')
ON CONFLICT (version) DO NOTHING;

COMMIT;
`;

fs.writeFileSync(OUT, sql, 'utf8');
console.log('OK: ' + values.length + ' statov -> ' + OUT);
console.log('    bez anglickeho nazvu (pouzity SK): ' +
    rows.filter(r => !val(r[4])).length);
