#!/usr/bin/env node
// Porovna lm_url.csv s rozpisom z PDF: dvojice, datumy a casy sa musia zhodovat.
// Nic nezapisuje — sluzi na overenie pred pripravou migracie.
const fs = require('fs');
const path = require('path');

const pdf = require('../sources/lm2026-27/LM2026-27_games.json');
const csvText = fs.readFileSync(
    path.join(__dirname, '../sources/lm2026-27/lm_url.csv'), 'utf8');

// CSV: id,flashscore_url,club_domaci,club_hostia,match_date,match_time,match_stadium
// URL ziadnu ciarku neobsahuje, ale nazvy klubov ani stadionov to nezarucuju,
// preto sa rozdeluje s ohladom na uvodzovky.
function splitCsvLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
}

const lines = csvText.split(/\r?\n/).filter(l => l.trim());
const header = splitCsvLine(lines[0]);
const rows = lines.slice(1).map(l => {
    const c = splitCsvLine(l);
    return Object.fromEntries(header.map((h, i) => [h, c[i] ?? '']));
});

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

check(rows.length === 144, `CSV ma ${rows.length} zapasov (cakam 144)`);

// DD.MM.YYYY -> YYYY-MM-DD
const isoDate = s => {
    const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const key = (h, a, d) => `${d}|${h}|${a}`;
const pdfMap = new Map(pdf.map(g => [key(g.home, g.away, g.date), g]));

const chybaVPdf = [];
const inyCas = [];
const stadionChyba = [];
const urlChyba = [];
const videneKluby = new Set();

for (const r of rows) {
    const d = isoDate(r.match_date);
    if (!d) { check(false, `neplatny datum: ${r.match_date}`); continue; }
    videneKluby.add(r.club_domaci);
    videneKluby.add(r.club_hostia);

    const g = pdfMap.get(key(r.club_domaci, r.club_hostia, d));
    if (!g) { chybaVPdf.push(`${d} ${r.club_domaci} - ${r.club_hostia}`); continue; }
    if (g.time !== r.match_time) {
        inyCas.push(`${d} ${r.club_domaci}-${r.club_hostia}: PDF ${g.time}, CSV ${r.match_time}`
                    + (g.time_known ? '' : ' (v PDF odhadnuty)'));
    }
    if (!r.match_stadium) stadionChyba.push(`${d} ${r.club_domaci}`);
    if (!/^https?:\/\//.test(r.flashscore_url)) urlChyba.push(`${d} ${r.club_domaci}`);
    pdfMap.delete(key(r.club_domaci, r.club_hostia, d));
}

check(chybaVPdf.length === 0,
      `vsetky zapasy z CSV su aj v PDF${chybaVPdf.length ? ':\n      ' + chybaVPdf.join('\n      ') : ''}`);
check(pdfMap.size === 0,
      `vsetky zapasy z PDF su aj v CSV${pdfMap.size ? ':\n      ' + [...pdfMap.keys()].join('\n      ') : ''}`);
check(stadionChyba.length === 0, `kazdy zapas ma stadion${stadionChyba.length ? ` (chyba ${stadionChyba.length})` : ''}`);
check(urlChyba.length === 0, `kazdy zapas ma platnu URL${urlChyba.length ? ` (chyba ${urlChyba.length})` : ''}`);

// Rozdielne casy nie su nutne chyba: kola 7 a 8 v PDF cas nemali a doplnili sa
// odhadom, takze CSV je pri nich spolahlivejsie.
if (inyCas.length) {
    console.log(`\nOdlisny cas v ${inyCas.length} zapasoch:`);
    inyCas.forEach(x => console.log('  ' + x));
} else {
    console.log('\nCasy sa zhoduju vo vsetkych zapasoch.');
}

const klubov = [...videneKluby].sort();
console.log(`\nKlubov v CSV: ${klubov.length}`);
const stadiony = new Set(rows.map(r => r.match_stadium).filter(Boolean));
console.log(`Roznych stadionov: ${stadiony.size}`);

// Klub hrajuci doma na viacerych stadionoch — napriklad Sachtar kvoli vojne.
const podlaKlubu = {};
for (const r of rows) {
    (podlaKlubu[r.club_domaci] = podlaKlubu[r.club_domaci] || new Set()).add(r.match_stadium);
}
const viacero = Object.entries(podlaKlubu).filter(([, s]) => s.size > 1);
if (viacero.length) {
    console.log('\nKluby hrajuce doma na viacerych stadionoch:');
    viacero.forEach(([k, s]) => console.log(`  ${k}: ${[...s].join(' | ')}`));
}

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nCSV je konzistentne s rozpisom');
process.exit(fail ? 1 : 0);
