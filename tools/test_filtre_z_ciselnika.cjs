#!/usr/bin/env node
// Overi, ze filtre kol pouzivaju spolocny PhaseFilter a nie zoznam faz v kode.
//
// Zoznamy typu ['A','B','QF','SF','BRONZE','GOLD'] boli v kazdej obrazovke
// zvlast, takze zmena v ciselniku sa prejavila len na niektorych — odtial
// skratky SKA/SKB v Skupinach aj to, ze v UCL chybalo kolo, ktore FIFA mala.
//
// Skript iba cita zdrojove subory.
const fs = require('fs');
const path = require('path');

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const src = p => fs.readFileSync(path.join(__dirname, '../web/src', p), 'utf8');

// Obrazovky, ktore filtruju podla kola.
const OBRAZOVKY = [
    ['pages/user/Games.jsx', 'Zápasy IIHF'],
    ['pages/user/FifaGames.jsx', 'Zápasy FIFA'],
    ['pages/user/UclGames.jsx', 'Zápasy UCL'],
    ['pages/user/Standings.jsx', 'Skupiny'],
    ['pages/admin/UclAdminResults.jsx', 'Admin Výsledky UCL'],
    ['components/AdminGamesScreen.jsx', 'Admin Zápasy'],
];

for (const [subor, popis] of OBRAZOVKY) {
    const t = src(subor);
    check(/PhaseFilter/.test(t), `${popis}: používa PhaseFilter`);
}

// Zoznam faz napisany v kode. Hlada sa pole skratiek, nie kazda zmienka —
// jednotlivy kod v podmienke (napr. rozlisenie finale) je v poriadku.
const VZOR = /\[\s*'(?:A|R32|QF|PO|LEAGUE|GROUP_A)'\s*,[^\]]*\]/;
for (const [subor, popis] of OBRAZOVKY) {
    const bezKomentarov = src(subor)
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
    check(!VZOR.test(bezKomentarov), `${popis}: nemá zoznam fáz v kóde`);
}

// Skratky sa nesmu skladat z nazvu — tak vznikali SKA, SKB.
for (const [subor, popis] of OBRAZOVKY) {
    const t = src(subor);
    check(!/`SK\$\{/.test(t) && !/'SK'\s*\+/.test(t),
          `${popis}: neskladá skratky z názvu fázy`);
}

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
