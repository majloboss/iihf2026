#!/usr/bin/env node
// Overi ochranu rozpisanej spravy:
//   1. appka sa neobnovi, kym clovek pise alebo ma nieco rozpisane,
//   2. rozpisany text sa odklada, takze prezije aj obnovenie stranky.
//
// Skript iba cita zdrojove subory.
const fs = require('fs');
const path = require('path');

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const src = p => fs.readFileSync(path.join(__dirname, '../web/src', p), 'utf8');

// ── 1. Obnovenie appky ──────────────────────────────────────────────────────
const main = src('main.jsx');
check(/const pisePrave = /.test(main), 'zisťuje sa, či je kurzor v poli');
check(/const maRozpisane = /.test(main), 'zisťuje sa aj rozpísaný text mimo poľa');
check(/if \(pisePrave\(\) \|\| maRozpisane\(\)\) \{[\s\S]*?setTimeout\(obnovit/.test(main),
      'obnovenie sa odloží, nezruší — nová verzia príde neskôr');
check(main.indexOf('pisePrave() || maRozpisane()') < main.indexOf('window.location.reload()'),
      'kontrola beží pred obnovením');

// ── 2. Odkladanie konceptu ──────────────────────────────────────────────────
for (const [subor, popis] of [
    ['pages/user/Messages.jsx', 'chat hráča'],
    ['pages/admin/AdminMessages.jsx', 'chat admina'],
]) {
    const t = src(subor);
    check(/localStorage\.setItem\(konceptKluc/.test(t), `${popis}: text sa odkladá pri písaní`);
    check(/localStorage\.getItem\(konceptKluc/.test(t), `${popis}: text sa obnoví po návrate`);
    check(/localStorage\.removeItem\(konceptKluc\)/.test(t), `${popis}: po odoslaní sa koncept zmaže`);
    // Sukromne okno alebo plna pamat nesmie zhodit obrazovku.
    const pocetTry = (t.match(/try \{[\s\S]{0,220}?localStorage/g) || []).length;
    check(pocetTry >= 3, `${popis}: prístup k úložisku je ošetrený (${pocetTry} miest)`);
}

// Admin pise viacerym hracom — koncepty sa nesmu prepisat.
check(/koncept_admin_\$\{activeUser/.test(src('pages/admin/AdminMessages.jsx')),
      'admin má koncept zvlášť pre každého hráča');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
