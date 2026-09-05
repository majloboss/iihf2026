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

// Tlacidla okolo filtra maju vyzerat rovnako vo vsetkych sutaziach. UCL malo
// 1x2 sive namiesto cerveneho a v IIHF sa TAB neodsadilo doprava.
const ZAPASY = [
    ['pages/user/Games.jsx', 'Zápasy IIHF'],
    ['pages/user/FifaGames.jsx', 'Zápasy FIFA'],
    ['pages/user/UclGames.jsx', 'Zápasy UCL'],
];
for (const [subor, popis] of ZAPASY) {
    const t = src(subor);
    check(/untippedBtnOn : styles\.untippedBtn/.test(t), `${popis}: 1x2 má červený štýl`);
    check(!/btnTabulkyInline/.test(t),
          `${popis}: odsadenie TAB rieši komponent, nie obrazovka`);
}

// Odsadenie doprava patri komponentu — inak zavisi od toho, ci je tlacidlo
// priamym potomkom flexu, co v IIHF neplatilo.
check(/marginLeft: 'auto'/.test(src('components/PhaseFilter.jsx')),
      'PhaseFilter odsadzuje `koniec` doprava');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
