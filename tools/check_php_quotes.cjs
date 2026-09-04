#!/usr/bin/env node
// Najde v PHP suboroch neuzavrete retazce.
//
// PHP CLI na tomto stroji nie je, takze syntax error sa inak ukaze az v
// prehliadaci — tak sa do develop dostal rozbity pavuk: apostrof okolo
// 'LEAGUE' vnutri retazca v jednoduchych uvodzovkach ho predcasne ukoncil.
//
// Kontroluje sa iba parovanie uvodzoviek, nie cela gramatika jazyka.
// Pouzitie: node check_php_quotes.cjs <subor.php> [...]
const fs = require('fs');

let chyb = 0;

for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, 'utf8');
    let i = 0, riadok = 1, quote = null, zaciatok = 0;

    while (i < src.length) {
        const c = src[i];
        if (c === '\n') riadok++;

        if (quote) {
            if (c === '\\') { i += 2; continue; }          // escapovany znak
            if (c === quote) quote = null;
        } else if (c === "'" || c === '"') {
            quote = c; zaciatok = riadok;
        } else if (c === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        } else if (c === '#') {
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        } else if (c === '/' && src[i + 1] === '*') {
            i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
                if (src[i] === '\n') riadok++;
                i++;
            }
            i += 2;
            continue;
        }
        i++;
    }

    if (quote) {
        console.log(`CHYBA ${file}: neuzavrety retazec ${quote} otvoreny na riadku ${zaciatok}`);
        chyb++;
        continue;
    }

    // Retazec v jednoduchych uvodzovkach sa apostrofom vnutri predcasne ukonci:
    //   $pdo->prepare('... WHERE color <> 'GROUP') x ...')
    // Parovanie uvodzoviek to nezachyti — vyzera to ako tri uzavrete retazce.
    // Prejavi sa az v prehliadaci ako "syntax error, unexpected identifier".
    const zle = [];
    for (const m of src.matchAll(/prepare\(\s*'((?:[^'\\]|\\.)*)'/g)) {
        const sql = m[1];
        // SQL po zavreti retazca pokracuje — spoznat sa to da podla toho, ze
        // za nim nenasleduje ciarka, zatvorka ani bodkociarka. Biele znaky
        // vratane zalomenia sa preskakuju: uzavierka moze byt na dalsom riadku.
        const za = src.slice(m.index + m[0].length, m.index + m[0].length + 40);
        if (!/^\s*[,)\.;]/.test(za)) {
            const riadok = src.slice(0, m.index).split('\n').length;
            zle.push(`riadok ${riadok}: ${sql.trim().slice(0, 50)}…`);
        }
    }
    if (zle.length) {
        console.log(`CHYBA ${file}: apostrof vnutri SQL predcasne ukoncil retazec`);
        zle.forEach(z => console.log(`      ${z}`));
        chyb++;
    } else {
        console.log(`OK    ${file}`);
    }
}

process.exit(chyb ? 1 : 0);
