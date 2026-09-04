#!/usr/bin/env node
// Overi, ze vsetky predmety mailov maju jednotnu predponu "Betclub - ".
//
// Predponu doplna send_mail(), takze jednotlive skripty ju v texte nemaju.
// Kontroluje sa, ze ju nikde nepridavaju druhykrat a ze po nej predmet
// pokracuje malym pismenom.
//
// Skript iba cita zdrojove subory.
const fs = require('fs');
const path = require('path');

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

const api = path.join(__dirname, '../api');
const subory = [];
(function zbier(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) zbier(p);
        else if (f.name.endsWith('.php')) subory.push(p);
    }
})(api);

// Predpona sa doplna na jedinom mieste.
const mailer = fs.readFileSync(path.join(api, 'helpers/mailer.php'), 'utf8');
check(/function betclub_predmet/.test(mailer), 'predpona sa doplna v mailer.php');
check(/\$subject = betclub_predmet\(\$subject\);/.test(mailer),
      'send_mail predponu naozaj pouziva');

// Ziadny skript ju nesmie pridavat sam — vznikla by dvojita.
const dvojita = [];
const velke = [];
for (const p of subory) {
    if (p.endsWith('mailer.php')) continue;
    const text = fs.readFileSync(p, 'utf8');
    for (const m of text.matchAll(/\$subject\s*=\s*(.+)$/gm)) {
        const hodnota = m[1];
        if (/Betclub\s*-/i.test(hodnota)) dvojita.push(path.basename(p));
        // Prvy pismeno predmetu: po "Betclub - " ma nasledovat male.
        const prvy = hodnota.match(/^["'](\p{Lu})/u);
        if (prvy) velke.push(`${path.basename(p)}: ${hodnota.slice(0, 40)}`);
    }
}
check(dvojita.length === 0,
      'ziadny skript nepridava predponu sam' + (dvojita.length ? ` — ${[...new Set(dvojita)].join(', ')}` : ''));
check(velke.length === 0,
      'predmety pokracuju malym pismenom' + (velke.length ? `\n      ${velke.join('\n      ')}` : ''));

// Ukazka, ako to bude vyzerat.
console.log('\nvýsledné predmety:');
[
    'nová správa od admina',
    'nová správa od <hráč>',
    'výsledok: SVK – CAN',
    'začína zápas: SVK – CAN o 16:20',
    'netipovaný zápas: SVK – CAN o 16:20',
    'pozvánka do tipovačky',
    'reset hesla',
    'vitaj medzi nami!',
    'skúšobná správa',
].forEach(s => console.log(`  Betclub - ${s}`));

// Skupinove udalosti dostavaju titulok zvonku a sluzi aj ako titulok push
// notifikacie, kde velke pismeno patri: "Betclub - Pozvánka do skupiny".
console.log('');
console.log('  Betclub - Pozvánka do skupiny        (titulok z notify_group_event)');
console.log('  Betclub - Vstup do skupiny schválený');

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
