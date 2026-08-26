// Overi, ze migracia 055 zachova vsetky stlpce, indexy a obmedzenia.
const fs = require('fs');
const sql = fs.readFileSync('api/migrations/055_admin_countries_reorder.sql', 'utf8');

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Stlpce, ktore tabulka ma mat (zo vsetkych predchadzajucich migracii)
const expected = [
    'source_id', 'country_code', 'country_code2',
    'sport_code_fifa', 'sport_code_iihf', 'sport_code_uefa',
    'name_sk', 'name_sk_long', 'name_en', 'name_original',
    'flag_file', 'flag_file_big', 'flag_check',
    'is_active', 'created_at', 'updated_at',
];

// --- 1. CREATE obsahuje vsetky stlpce v zadanom poradi ---
const createBlock = sql.split('CREATE TABLE admin.countries_new (')[1].split('CONSTRAINT countries_pkey')[0];
const created = [...createBlock.matchAll(/^\s{4}([a-z_0-9]+)\s+(?:INTEGER|VARCHAR|BOOLEAN|TIMESTAMP)/gm)].map(m => m[1]);
check(JSON.stringify(created) === JSON.stringify(expected),
    'CREATE ma vsetkych ' + expected.length + ' stlpcov v spravnom poradi');
if (JSON.stringify(created) !== JSON.stringify(expected)) {
    console.log('      ocakavane: ' + expected.join(', '));
    console.log('      najdene:   ' + created.join(', '));
}

// --- 2. INSERT kopiruje vsetky stlpce, cielovy aj zdrojovy zoznam rovnaky ---
const insBlock = sql.split('INSERT INTO admin.countries_new (')[1].split('FROM admin.countries;')[0];
const [targetPart, sourcePart] = insBlock.split('SELECT');
const cols = s => s.replace(/\)/g, '').split(',').map(x => x.trim()).filter(x => /^[a-z_0-9]+$/.test(x));
const target = cols(targetPart), source = cols(sourcePart);
check(JSON.stringify(target) === JSON.stringify(expected), 'INSERT vklada vsetky stlpce');
check(JSON.stringify(target) === JSON.stringify(source), 'INSERT: cielove a zdrojove stlpce sa zhoduju');

// --- 3. Ziadny stlpec sa nestrati ---
const missing = expected.filter(c => !target.includes(c));
check(missing.length === 0, 'ziadny stlpec sa nestrati' + (missing.length ? ': ' + missing.join(', ') : ''));

// --- 4. Vsetky indexy z 052/053 sa obnovia ---
for (const idx of ['countries_code2_uniq', 'countries_source_id_uniq', 'countries_sport_fifa_uniq',
                   'countries_sport_iihf_uniq', 'countries_sport_uefa_uniq', 'countries_sport_codes_idx']) {
    check(sql.includes('CREATE UNIQUE INDEX ' + idx) || sql.includes('CREATE INDEX ' + idx),
        'index ' + idx + ' sa obnovi');
}

// --- 5. Obmedzenia ---
check(/CONSTRAINT countries_pkey PRIMARY KEY \(country_code\)/.test(sql), 'primarny kluc na country_code');
check(/countries_code_format[\s\S]{0,120}\{2,3\}/.test(sql), 'CHECK na country_code povoluje GB-ENG');
check(/countries_code2_format/.test(sql), 'CHECK na country_code2');

// --- 6. FK sa odpoji a znova napoji ---
check(/DROP CONSTRAINT IF EXISTS ucl_teams_admin_country_code_fkey/.test(sql), 'FK sa odpoji pred prestavbou');
check(/ADD CONSTRAINT ucl_teams_admin_country_code_fkey/.test(sql), 'FK sa znova napoji');

// --- 7. Granty ---
check(/GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin\.countries TO "dbbet-admin"/.test(sql),
    'granty pre dbbet-admin sa obnovia');

// --- 8. Poistky a transakcia ---
check(/RAISE EXCEPTION 'Prestavba zrusena: povodne/.test(sql), 'kontroluje pocet skopirovanych riadkov');
check(/RAISE EXCEPTION 'Prestavba zrusena: % klubov/.test(sql), 'kontroluje platnost kodov klubov');
check(/^BEGIN;/m.test(sql) && /^COMMIT;/m.test(sql), 'bezi v jednej transakcii');

// --- 9. Poradie operacii: DROP az po INSERT, RENAME az po DROP ---
const pos = s => sql.indexOf(s);
check(pos('INSERT INTO admin.countries_new') < pos('DROP TABLE admin.countries'),
    'data sa skopiruju pred zahodenim starej tabulky');
check(pos('DROP TABLE admin.countries') < pos('RENAME TO countries'),
    'stara tabulka sa zahodi pred premenovanim novej');
check(pos('RENAME TO countries') < pos('ADD CONSTRAINT ucl_teams_admin_country_code_fkey'),
    'FK sa napoji az na premenovanu tabulku');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVSETKY KONTROLY PRESLI');
process.exit(fail ? 1 : 0);
