#!/usr/bin/env node
// Overi, kedy sa tlacidlo ALL zvyrazni.
//
// ALL rusi vsetky filtre, takze svietit ma len vtedy, ked ziadny filter
// nebezi. Predtym sledovalo iba fazu a svietilo aj pri zapnutom klube,
// dni alebo 1x2.
//
// Skript nic necita z DB ani nemeni.
let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Rovnaka podmienka ako v PhaseFilter.jsx.
const svieti = (hodnota, ineFiltre) => hodnota === '' && !ineFiltre;

// Ako to vola UclGames.jsx.
const stav = ({ phase = '', club = '', day = '', onlyUntipped = false }) =>
    svieti(phase, Boolean(club || day || onlyUntipped));

const pripady = [
    [{},                                   true,  'nic nie je zapnute'],
    [{ phase: 'LF3' },                     false, 'zvolene kolo'],
    [{ club: 'ARS' },                      false, 'zvoleny klub'],
    [{ day: '2026-09-08' },                false, 'zvoleny den'],
    [{ onlyUntipped: true },               false, 'zapnute 1x2'],
    [{ phase: 'QF-1', club: 'ARS' },       false, 'kolo aj klub'],
    [{ club: 'ARS', day: '2026-09-08' },   false, 'klub aj den'],
    [{ phase: '', onlyUntipped: true },    false, 'iba 1x2 bez kola'],
];

pripady.forEach(([s, ocakavane, popis]) => {
    check(stav(s) === ocakavane,
          `${popis}: ALL ${ocakavane ? 'svieti' : 'nesvieti'}`);
});

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
