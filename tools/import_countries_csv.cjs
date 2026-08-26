#!/usr/bin/env node
// Vygeneruje SQL migraciu z CSV ciselnika statov.
// Pouzitie: node tools/import_countries_csv.cjs <csv> <vystupny.sql> [verzia]
// CSV hlavicka: id;state_code_2;state_code_3;state_name_origin;state_name_english;
//               state_name_slovak;state_name_slovak_long;state_flag_big;state_flag_small;flag_check

const fs = require('fs');

const [csvPath, outPath, versionArg] = process.argv.slice(2);
if (!csvPath || !outPath) {
    console.error('Pouzitie: node tools/import_countries_csv.cjs <csv> <vystupny.sql> [verzia]');
    process.exit(1);
}
const version = Number(versionArg || 53);

// CSV parser: oddelovac ;, volitelne uvodzovky, "" ako escapovana uvodzovka.
function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false, i = 0;
    text = text.replace(/^﻿/, '');
    while (i < text.length) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
            if (ch === '"') { quoted = false; i++; continue; }
            field += ch; i++; continue;
        }
        if (ch === '"') { quoted = true; i++; continue; }
        if (ch === ';') { row.push(field); field = ''; i++; continue; }
        if (ch === '\r') { i++; continue; }
        if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
        field += ch; i++;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
}

const q = v => (v === null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const clean = v => (v === undefined ? '' : String(v).trim());

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const header = rows.shift().map(h => clean(h).toLowerCase());
const need = ['id', 'state_code_2', 'state_code_3', 'state_name_origin', 'state_name_english',
    'state_name_slovak', 'state_name_slovak_long', 'state_flag_big', 'state_flag_small', 'flag_check'];
const missing = need.filter(n => !header.includes(n));
if (missing.length) { console.error('CSV nema stlpce: ' + missing.join(', ')); process.exit(1); }
const col = name => header.indexOf(name);

const seenCode3 = new Map(), seenCode2 = new Map(), problems = [];
const values = [];

rows.forEach((r, idx) => {
    const line = idx + 2;
    const code3 = clean(r[col('state_code_3')]).toUpperCase();
    const code2 = clean(r[col('state_code_2')]).toUpperCase();
    const nameEn = clean(r[col('state_name_english')]);
    const nameSk = clean(r[col('state_name_slovak')]);

    if (!/^[A-Z]{3}$/.test(code3)) { problems.push(`riadok ${line}: neplatny 3-pismenkovy kod "${code3}"`); return; }
    if (code2 && !/^[A-Z]{2}$/.test(code2)) { problems.push(`riadok ${line}: neplatny 2-pismenkovy kod "${code2}"`); return; }
    if (!nameEn || !nameSk) { problems.push(`riadok ${line} (${code3}): chyba anglicky alebo slovensky nazov`); return; }
    if (seenCode3.has(code3)) { problems.push(`riadok ${line}: duplicitny kod ${code3} (uz na riadku ${seenCode3.get(code3)})`); return; }
    if (code2 && seenCode2.has(code2)) { problems.push(`riadok ${line}: duplicitny kod ${code2} (uz na riadku ${seenCode2.get(code2)})`); return; }
    seenCode3.set(code3, line);
    if (code2) seenCode2.set(code2, line);

    const flagName = f => {
        const v = clean(f);
        if (!v) return null;
        if (v !== v.split(/[\/]/).pop()) { problems.push(`riadok ${line} (${code3}): vlajka nesmie obsahovat cestu "${v}"`); return null; }
        return v;
    };
    const idRaw = clean(r[col('id')]);

    values.push('    (' + [
        /^\d+$/.test(idRaw) ? idRaw : 'NULL',
        q(code3), q(code2 || null),
        q(nameSk), q(nameEn),
        q(clean(r[col('state_name_origin')]) || null),
        q(clean(r[col('state_name_slovak_long')]) || null),
        q(flagName(r[col('state_flag_small')])),
        q(flagName(r[col('state_flag_big')])),
        q(clean(r[col('flag_check')]) || null),
    ].join(', ') + ')');
});

if (problems.length) {
    console.error('CSV obsahuje chyby, migracia sa nevygenerovala:\n  ' + problems.join('\n  '));
    process.exit(1);
}

const sql = `-- Migration ${version}: naplnenie admin.countries zo zdrojoveho CSV statov
-- Vygenerovane: tools/import_countries_csv.cjs
-- Zdroj: ${csvPath.split(/[\/]/).pop()} (${values.length} statov)
-- Idempotentne: opakovane spustenie iba prepise nazvy a vlajky.

INSERT INTO admin.countries AS c
    (source_id, country_code, country_code2, name_sk, name_en, name_original,
     name_sk_long, flag_file, flag_file_big, flag_check)
VALUES
${values.join(',\n')}
ON CONFLICT (country_code) DO UPDATE SET
    source_id     = EXCLUDED.source_id,
    country_code2 = EXCLUDED.country_code2,
    name_sk       = EXCLUDED.name_sk,
    name_en       = EXCLUDED.name_en,
    name_original = COALESCE(EXCLUDED.name_original, c.name_original),
    name_sk_long  = EXCLUDED.name_sk_long,
    flag_file     = COALESCE(EXCLUDED.flag_file, c.flag_file),
    flag_file_big = COALESCE(EXCLUDED.flag_file_big, c.flag_file_big),
    flag_check    = EXCLUDED.flag_check,
    updated_at    = NOW();

INSERT INTO admin.schema_versions (version, description)
VALUES (${version}, 'Import ciselnika statov z CSV (${values.length} statov)')
ON CONFLICT (version) DO NOTHING;
`;

fs.writeFileSync(outPath, sql, 'utf8');
console.log(`OK: ${values.length} statov -> ${outPath}`);
