// Overi vygenerovanu migraciu 054 proti zdrojovym datam.
const fs = require('fs');
const sql = fs.readFileSync('api/migrations/054_countries_import.sql', 'utf8');

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// --- 1. Sekcia s mapovanim sportovych kodov ---
const mapSection = sql.split('AS s(iso, fifa, iihf, uefa)')[0].split('FROM (VALUES')[1];
const uefaCodes = new Set(), isoInMap = new Set();
for (const m of mapSection.matchAll(/\('([A-Z-]+)', (NULL|'[A-Z]+'), (NULL|'[A-Z]+'), (NULL|'[A-Z]+')\)/g)) {
    isoInMap.add(m[1]);
    if (m[4] !== 'NULL') uefaCodes.add(m[4].replace(/'/g, ''));
}

// --- 2. Vsetky kody vlozene do ciselnika ---
const inserted = new Set();
const insertSection = sql.split('VALUES')[1].split('-- 4.')[0];
for (const m of insertSection.matchAll(/^\s+\((?:\d+|NULL), '([A-Z-]+)'/gm)) inserted.add(m[1]);
check(inserted.size === 254, 'vlozenych statov: ' + inserted.size + ' (ocakavane 254)');

// --- 3. Kazdy ISO kod v mapovani existuje v ciselniku ---
const orphans = [...isoInMap].filter(c => !inserted.has(c));
check(orphans.length === 0, 'mapovanie odkazuje len na existujuce staty' + (orphans.length ? ': ' + orphans.join(', ') : ''));

// --- 4. Vsetky UCL kody klubov sa premapuju ---
const ucl = new Set(fs.readFileSync('sources/lm2026-27/kluby_loga_staty.csv', 'utf8')
    .split(/\r?\n/).slice(1).filter(Boolean)
    .map(l => l.split(';')[2].replace(/"/g, '').trim()));
const notMapped = [...ucl].filter(c => !uefaCodes.has(c));
check(notMapped.length === 0, 'UCL kodov ' + ucl.size + ', vsetky pokryte UEFA mapovanim' + (notMapped.length ? ' | NEPOKRYTE: ' + notMapped.join(', ') : ''));

// --- 5. Vsetky vlajky existuju ---
const have = new Set(fs.readdirSync('sources/flags').filter(f => f.endsWith('.png')));
const wanted = new Set();
for (const m of insertSection.matchAll(/'(flag_[a-z0-9-]+_\d+\.png)'/g)) wanted.add(m[1]);
const missingFlags = [...wanted].filter(f => !have.has(f));
check(missingFlags.length === 0, 'vlajok pozadovanych ' + wanted.size + ', vsetky existuju' + (missingFlags.length ? ' | CHYBA: ' + missingFlags.slice(0, 5).join(', ') : ''));

// --- 6. Ziadny doslovny "-" v datach ---
check(!/'-'/.test(insertSection), 'ziadna hodnota "-" sa neuklada doslovne');

// --- 7. Transakcia je uzavreta ---
check(/^BEGIN;/m.test(sql) && /^COMMIT;/m.test(sql), 'migracia je obalena v BEGIN/COMMIT');

// --- 8. FK sa odpoji aj znova napoji ---
check(/DROP CONSTRAINT IF EXISTS ucl_teams_admin_country_code_fkey/.test(sql) &&
      /ADD CONSTRAINT ucl_teams_admin_country_code_fkey/.test(sql), 'FK sa odpoji a znova napoji');

// --- 9. Konflikty IIHF vs UEFA su spravne ---
const row = code => (mapSection.match(new RegExp("\\('" + code + "'[^)]*\\)")) || [''])[0];
check(row('SVN').includes("'SLO'") && row('SVN').includes("'SVN'"), 'Slovinsko: IIHF=SLO, UEFA=SVN  -> ' + row('SVN'));
check(row('LVA').includes("'LAT'") && row('LVA').includes("'LVA'"), 'Lotyssko: IIHF=LAT, UEFA=LVA  -> ' + row('LVA'));
check(row('GBR').includes("'GBR'"), 'UK ako IIHF tim            -> ' + row('GBR'));
check(row('GB-ENG').includes("'ENG'"), 'Anglicko ako FIFA/UEFA tim -> ' + row('GB-ENG'));

// --- 10. Sportovy kod nepatri dvom statom ---
for (const key of [1, 2, 3]) {
    const seen = {}; const dups = [];
    for (const m of mapSection.matchAll(/\('([A-Z-]+)', (NULL|'[A-Z]+'), (NULL|'[A-Z]+'), (NULL|'[A-Z]+')\)/g)) {
        const v = m[key + 1];
        if (v === 'NULL') continue;
        if (seen[v]) dups.push(v + ' (' + seen[v] + ' aj ' + m[1] + ')');
        seen[v] = m[1];
    }
    check(dups.length === 0, ['FIFA', 'IIHF', 'UEFA'][key - 1] + ' kody su unikatne' + (dups.length ? ': ' + dups.join('; ') : ''));
}

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVSETKY KONTROLY PRESLI');
process.exit(fail ? 1 : 0);
