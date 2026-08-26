// Overi, ze PHP retazce su spravne uzavrete a nekonci sa subor uprostred retazca.
// Odhali chybu typu: $x = 'SELECT ... 'vnorene' ...';
const fs = require('fs');

const SQ = "'", DQ = '"', BS = '\\', NL = '\n';

function scan(src) {
    let i = 0, line = 1, q = null, qLine = 0, lineC = false, blockC = false, heredoc = null;
    const issues = [];
    while (i < src.length) {
        const c = src[i], n = src[i + 1];
        if (c === NL) line++;

        if (heredoc) {
            if (c === NL) {
                const rest = src.slice(i + 1);
                const m = rest.match(/^[ \t]*([A-Za-z_][A-Za-z0-9_]*)/);
                if (m && m[1] === heredoc) { heredoc = null; i += 1 + m[0].length; continue; }
            }
            i++; continue;
        }
        if (lineC) { if (c === NL) lineC = false; i++; continue; }
        if (blockC) { if (c === '*' && n === '/') { blockC = false; i += 2; continue; } i++; continue; }

        if (q) {
            if (c === BS) { i += 2; continue; }
            if (c === q) { q = null; }
            i++; continue;
        }
        if (c === '/' && n === '/') { lineC = true; i += 2; continue; }
        if (c === '#') { lineC = true; i++; continue; }
        if (c === '/' && n === '*') { blockC = true; i += 2; continue; }
        if (c === '<' && src.slice(i, i + 3) === '<<<') {
            const m = src.slice(i + 3).match(/^[ \t]*'?([A-Za-z_][A-Za-z0-9_]*)'?/);
            if (m) { heredoc = m[1]; i += 3 + m[0].length; continue; }
        }
        if (c === SQ || c === DQ) { q = c; qLine = line; i++; continue; }
        i++;
    }
    if (q) issues.push('neuzavretý reťazec ' + q + ' otvorený na riadku ' + qLine);
    return issues;
}

let fail = false;
for (const p of process.argv.slice(2)) {
    const issues = scan(fs.readFileSync(p, 'utf8'));
    if (issues.length) fail = true;
    console.log((issues.length ? 'CHYBA ' : 'OK    ') + p + '  ' + issues.join('; '));
}
process.exit(fail ? 1 : 0);
