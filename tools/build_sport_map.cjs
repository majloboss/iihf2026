// Zostavi mapovanie sportovy kod -> ISO kod z CSV podla slovenskeho nazvu statu.
const fs = require('fs');

const IIHF = 'AUT CAN CZE DEN FIN GBR GER HUN ITA LAT NOR SLO SUI SVK SWE USA'.split(' ');
const FIFA = 'ALG ARG AUS AUT BEL BIH BRA CAN CIV COD COL CPV CRO CUW CZE ECU EGY ENG ESP FRA GER GHA HAI IRN IRQ JOR JPN KOR KSA MAR MEX NED NOR NZL PAN PAR POR QAT RSA SCO SEN SUI SWE TUN TUR URU USA UZB'.split(' ');
const UEFA = 'ALB AND ARM AUT AZE BEL BIH BLR BUL CRO CYP CZE DEN ENG ESP EST FIN FRA FRO GEO GER GIB GRE HUN IRL ISL ISR ITA KAZ KOS LTU LUX LVA MDA MKD MLT MNE NED NIR NOR POL POR ROU SCO SMR SRB SUI SVK SVN SWE TUR UKR WAL'.split(' ');

// Sportovy kod -> slovensky nazov v CSV. Uvedene su len kody, ktore sa lisia od ISO
// alebo kde nazov v CSV nie je jednoznacny.
const TO_NAME = {
    ALG: 'Alžírsko', BUL: 'Bulharsko', CRO: 'Chorvátsko', DEN: 'Dánsko',
    ENG: 'Anglicko', GER: 'Nemecko', GRE: 'Grécko', HAI: 'Haiti',
    KOS: 'Kosovo', KSA: 'Saudská Arábia', LAT: 'Lotyšsko', NED: 'Holandsko',
    NIR: 'Severné Írsko', PAR: 'Paraguaj', POR: 'Portugalsko', RSA: 'Juhoafrická republika',
    SCO: 'Škótsko', SLO: 'Slovinsko', SUI: 'Švajčiarsko', URU: 'Uruguaj',
    WAL: 'Wales', GBR: 'Spojené kráľovstvo',
    // SVN a LVA su ISO kody, ktore UEFA pouziva priamo
    SVN: 'Slovinsko', LVA: 'Lotyšsko',
};

const rows = fs.readFileSync('sources/flags/state_flag_list.csv', 'utf8')
    .replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean)
    .map(l => l.split(';').map(x => x.trim()));

const isoSet = new Set(rows.map(r => r[2]));
const byName = {};
for (const r of rows) byName[r[5]] = r[2];

const problems = [];
function toIso(code) {
    if (TO_NAME[code]) {
        const iso = byName[TO_NAME[code]];
        if (!iso) { problems.push(code + ': nazov "' + TO_NAME[code] + '" nie je v CSV'); return null; }
        return iso;
    }
    if (isoSet.has(code)) return code;
    problems.push(code + ': nema ISO ekvivalent ani mapovanie');
    return null;
}

// iso -> {fifa, iihf, uefa}
const map = {};
const assign = (codes, key) => {
    for (const c of codes) {
        const iso = toIso(c);
        if (!iso) continue;
        map[iso] = map[iso] || {};
        if (map[iso][key] && map[iso][key] !== c) {
            problems.push(iso + ' ' + key + ': konflikt ' + map[iso][key] + ' vs ' + c);
        }
        map[iso][key] = c;
    }
};
assign(FIFA, 'fifa');
assign(IIHF, 'iihf');
assign(UEFA, 'uefa');

if (problems.length) {
    console.error('PROBLEMY:\n  ' + problems.join('\n  '));
    process.exit(1);
}

// Kontrola: sportovy kod smie patrit len jednemu statu
for (const key of ['fifa', 'iihf', 'uefa']) {
    const seen = {};
    for (const [iso, m] of Object.entries(map)) {
        if (!m[key]) continue;
        if (seen[m[key]]) problems.push(key + ' kod ' + m[key] + ' pouzity pre ' + seen[m[key]] + ' aj ' + iso);
        seen[m[key]] = iso;
    }
}
if (problems.length) { console.error('DUPLICITY:\n  ' + problems.join('\n  ')); process.exit(1); }

const entries = Object.entries(map).sort();
console.log('Statov so sportovym kodom: ' + entries.length);
const q = v => (v ? "'" + v + "'" : 'NULL');
const lines = entries.map(([iso, m]) =>
    '    (' + [q(iso), q(m.fifa), q(m.iihf), q(m.uefa)].join(', ') + ')');
fs.writeFileSync(process.argv[2] || 'sport_map.txt', lines.join(',\n'), 'utf8');

// Prehlad odlisnych
console.log('\nOdlisne od ISO:');
for (const [iso, m] of entries) {
    const codes = [m.fifa, m.iihf, m.uefa].filter(Boolean);
    if (codes.some(c => c !== iso)) {
        console.log('  ' + iso.padEnd(7) + 'FIFA=' + (m.fifa || '-').padEnd(5) +
            'IIHF=' + (m.iihf || '-').padEnd(5) + 'UEFA=' + (m.uefa || '-'));
    }
}
