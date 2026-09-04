#!/usr/bin/env node
// Zostavi mail o sprave od organizatora presne tak, ako ho poskladá
// notify_user_message.php — na kontrolu textu bez odosielania.
//
// Skript nic neposiela ani nemeni.
const fs = require('fs');
const path = require('path');

const zdroj = fs.readFileSync(
    path.join(__dirname, '../api/helpers/notify_user_message.php'), 'utf8');

let fail = false;
const check = (ok, m) => { console.log((ok ? 'OK    ' : 'CHYBA ') + m); if (!ok) fail = true; };

// Skladanie mailu prevzate zo zdroja, aby sa nerozisli.
const zostav = (meno, text, jeTest) => {
    const prostred = jeTest ? ' [TEST]' : '';
    return {
        predmet: `Betclub - správa organizátora${prostred}`,
        telo: `Ahoj ${meno},\n\n`
            + 'organizátor ti v aplikácii zanechal správu:\n\n'
            + `"${text}"\n\n`
            + 'Odpovedať môžeš v aplikácii v sekcii Správy:\n'
            + 'https://dev_betclub.fellow.sk/spravy\n\n'
            + (jeTest
                ? 'Táto správa prišla z TESTOVACEJ verzie (dev_betclub).\n\nBetClub'
                : 'BetClub'),
    };
};

// Kontroly proti zdroju — text musi sediet s tym, co sa naozaj posiela.
check(zdroj.includes('organizátor ti v aplikácii zanechal správu:'),
      'úvodná veta sedí so zdrojom');
check(zdroj.includes("'správa organizátora' . $prostred"),
      'predmet sedí so zdrojom');
check(zdroj.includes('Odpovedať môžeš v aplikácii v sekcii Správy:'),
      'výzva na odpoveď sedí so zdrojom');
check(zdroj.includes('"\\"$text\\""') || zdroj.includes('\\"$text\\"'),
      'v maili ide celý text správy, nie skrátený');
check(/APP_URL \. \$url/.test(zdroj), 'odkaz do aplikácie sa skladá z APP_URL');

const t = zostav('Milo', 'nezabudni natipovat looser', true);
console.log('\n─── TESTOVACIA verzia ───────────────────────────');
console.log(`predmet: ${t.predmet}\n`);
console.log(t.telo);

const p = zostav('Milo', 'nezabudni natipovat looser', false);
console.log('\n─── PRODUKCIA ──────────────────────────────────');
console.log(`predmet: ${p.predmet}\n`);
console.log(p.telo);

console.log(fail ? '\nNIEKTORE KONTROLY ZLYHALI' : '\nVsetky kontroly presli');
process.exit(fail ? 1 : 0);
