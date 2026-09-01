#!/usr/bin/env node
// Overi, ktore konecne vysledky odvety maju prejst validaciou.
//
// Klucovy pripad: odveta moze skoncit REMIZOU a dvojica byt aj tak
// rozhodnuta. Prvy zapas 0:2, odveta po 90 min 2:0 (sucet 2:2), v predlzeni
// hostia daju dva goly — odveta konci 2:2, dvojica 4:2 a postupuje hostujuci
// tim. Stara validacia to odmietala, lebo pozerala na vysledok jedneho zapasu.
//
// Skript nesiaha na DB, iba prepocitava rovnaku logiku ako
// api/v1/admin/ucl_game_update.php.

let fail = false;
const check = (ok, msg) => { console.log((ok ? 'OK    ' : 'CHYBA ') + msg); if (!ok) fail = true; };

// Rovnake pravidla ako na serveri. Vracia null ked je vysledok prijaty,
// inak text chyby.
function overit({ jeFinale, prvyH, prvyA, h90, a90, hf, af }) {
    // Goly prveho zapasu z pohladu tymov odvety (domaci odvety bol hostom).
    const prevHome = jeFinale ? 0 : prvyA;
    const prevAway = jeFinale ? 0 : prvyH;

    const sumHome = h90 + prevHome;
    const sumAway = a90 + prevAway;
    const needsFinal = jeFinale ? h90 === a90 : sumHome === sumAway;

    const hasFinal = hf !== null && af !== null;
    if (!needsFinal) return hasFinal ? 'predlzenie sa tu nehra' : null;
    if (!hasFinal) return 'chyba konecny vysledok';
    if (hf < h90 || af < a90) return 'nizsi ako po 90 minutach';

    const finalHome = jeFinale ? hf : hf + prevHome;
    const finalAway = jeFinale ? af : af + prevAway;
    if (finalHome === finalAway) return 'po predlzeni musi byt rozhodnute';
    return null;
}

// --- Pripad zo screenshotu: Slavia — Arsenal ---
// Prvy zapas: Arsenal doma 2:0 nad Slaviou -> prvyH=2 (Arsenal), prvyA=0.
// V odvete je doma Slavia; prehodenie na pohlad odvety robi az prevHome/prevAway.
const zaklad = { jeFinale: false, prvyH: 2, prvyA: 0, h90: 2, a90: 0 };

let r = overit({ ...zaklad, hf: 2, af: 2 });
check(r === null, 'odveta 2:2 po predlzeni, dvojica 4:2 pre hosti — PRIJATE' +
                  (r ? ' (odmietnute: ' + r + ')' : ''));

r = overit({ ...zaklad, hf: 5, af: 2 });
check(r === null, 'odveta 5:2 (v predlzeni padlo 5 golov), dvojica 5:4 pre domacich — prijate'
                  + (r ? ' (' + r + ')' : ''));

r = overit({ ...zaklad, hf: 3, af: 0 });
check(r === null, 'odveta 3:0, dvojica 3:2 pre domacich — prijate' + (r ? ' (' + r + ')' : ''));

// Sucet zostal vyrovnany — postupujuci nie je urceny.
r = overit({ ...zaklad, hf: 2, af: 0 });
check(r === 'po predlzeni musi byt rozhodnute',
      'odveta 2:0, dvojica 2:2 — ODMIETNUTE, dvojica nie je rozhodnuta');

r = overit({ ...zaklad, hf: 3, af: 1 });
check(r === 'po predlzeni musi byt rozhodnute',
      'odveta 3:1, dvojica 3:3 — odmietnute');

// Konecny vysledok nemoze byt nizsi ako po 90 minutach.
r = overit({ ...zaklad, hf: 1, af: 0 });
check(r === 'nizsi ako po 90 minutach', 'odveta 1:0 — odmietnute, nizsie ako po 90 min');

// --- Finale: hra sa na jeden zapas, nic sa nepripocitava ---
r = overit({ jeFinale: true, prvyH: 0, prvyA: 0, h90: 1, a90: 1, hf: 2, af: 1 });
check(r === null, 'finale 1:1 po 90 min, 2:1 po predlzeni — prijate' + (r ? ' (' + r + ')' : ''));

r = overit({ jeFinale: true, prvyH: 0, prvyA: 0, h90: 1, a90: 1, hf: 2, af: 2 });
check(r === 'po predlzeni musi byt rozhodnute', 'finale 2:2 — odmietnute, vitaz nie je');

// --- Odveta s nevyrovnanym suctom: predlzenie sa nehra ---
r = overit({ jeFinale: false, prvyH: 2, prvyA: 0, h90: 1, a90: 0, hf: null, af: null });
check(r === null, 'odveta 1:0, dvojica 1:2 — bez predlzenia, prijate');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
