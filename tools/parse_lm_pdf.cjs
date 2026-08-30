// Parsuje flashscore rozpis LM 2026/27 z LM2026-27.txt do zoznamu zapasov.
// Vystup: sources/lm2026-27/LM2026-27_games.json
const fs = require('fs');
const txt = fs.readFileSync('./sources/lm2026-27/LM2026-27.txt', 'utf8');
const lines = txt.split('\n').map(l => l.replace(/\r$/, ''));

// Zapas ma tvar:  "Domaci"  /  "Hostia \t DD.MM. HH:MM"  alebo "Hostia \t DD.MM.YYYY"
const RE = /^(.*?)\s*\t\s*(\d{2})\.(\d{2})\.(?:(\d{4})|\s*(\d{2}):(\d{2}))\s*$/;

const games = [];
for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(RE);
    if (!m) continue;
    const home = lines[i - 1].trim();
    const away = m[1].trim();
    if (!home || !away) continue;
    const [, , dd, mm, yyyy, hh, mi] = m;
    // Rok: 09-12 = 2026, 01-06 = 2027 (ak nie je uvedeny v PDF)
    const year = yyyy ? Number(yyyy) : (Number(mm) >= 7 ? 2026 : 2027);
    games.push({
        home, away,
        date: `${year}-${mm}-${dd}`,
        // Kola 7 a 8 nemaju v PDF cas -> 21:00 SEC ako predvolena hodnota
        time: hh ? `${hh}:${mi}` : '21:00',
        time_known: Boolean(hh),
    });
}

// Odfiltruj duplicity zo zhrnutia na konci PDF a nezmyselne riadky.
const seen = new Set();
const clean = games.filter(g => {
    const k = `${g.date} ${g.home} ${g.away}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
});

// Kolo podla datumu: 8 blokov, kazdy 2-3 dni.
const dates = [...new Set(clean.map(g => g.date))].sort();
const ROUNDS = [
    ['2026-09-08', '2026-09-10'],
    ['2026-10-13', '2026-10-14'],
    ['2026-10-20', '2026-10-21'],
    ['2026-11-03', '2026-11-04'],
    ['2026-11-24', '2026-11-25'],
    ['2026-12-08', '2026-12-09'],
    ['2027-01-19', '2027-01-20'],
    ['2027-01-27', '2027-01-27'],
];
clean.forEach(g => {
    const r = ROUNDS.findIndex(([a, b]) => g.date >= a && g.date <= b);
    g.round = r + 1;
});

console.log('zapasov:', clean.length);
console.log('datumy:', dates.join(' '));
const perRound = {};
clean.forEach(g => { perRound[g.round] = (perRound[g.round] || 0) + 1; });
console.log('podla kola:', JSON.stringify(perRound));
const teams = [...new Set(clean.flatMap(g => [g.home, g.away]))].sort();
console.log('timov:', teams.length);
console.log(teams.join(' | '));
fs.writeFileSync('./sources/lm2026-27/LM2026-27_games.json', JSON.stringify(clean, null, 1));
