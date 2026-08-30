#!/usr/bin/env node
// Vygeneruje migraciu 066: doplni flashscore_url a venue do games_pdf z lm_url.csv.
//
// Parovanie ide cez dvojicu klubov a datum, nie cez id z CSV — je to odolnejsie
// a skript check_lm_url_csv.cjs overil, ze sedi vo vsetkych 144 zapasoch.
const fs = require('fs');
const path = require('path');

const pdf = require('../sources/lm2026-27/LM2026-27_games.json');
const csvText = fs.readFileSync(
    path.join(__dirname, '../sources/lm2026-27/lm_url.csv'), 'utf8');

function splitCsvLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
        else cur += ch;
    }
    out.push(cur);
    return out.map(s => s.trim());
}

const lines = csvText.split(/\r?\n/).filter(l => l.trim());
const header = splitCsvLine(lines[0]);
const rows = lines.slice(1).map(l => {
    const c = splitCsvLine(l);
    return Object.fromEntries(header.map((h, i) => [h, c[i] ?? '']));
});

const isoDate = s => {
    const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!m) throw new Error('Neplatny datum v CSV: ' + s);
    return `${m[3]}-${m[2]}-${m[1]}`;
};

// game_number priradi rozpis z PDF — to je to iste cislo, ake ma games_pdf.
const key = (h, a, d) => `${d}|${h}|${a}`;
const cislo = new Map();
{
    // Cislovanie sa musi zhodovat s gen_lm_games_pdf.cjs: kolo, datum, cas, domaci.
    const sorted = pdf.slice().sort((a, b) =>
        a.round - b.round || a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) || a.home.localeCompare(b.home));
    sorted.forEach((g, i) => cislo.set(key(g.home, g.away, g.date), i + 1));
}

const q = s => "'" + String(s).replace(/'/g, "''") + "'";

const updates = [];
for (const r of rows) {
    const d = isoDate(r.match_date);
    const n = cislo.get(key(r.club_domaci, r.club_hostia, d));
    if (!n) throw new Error(`Zapas nie je v rozpise: ${d} ${r.club_domaci} - ${r.club_hostia}`);
    if (!r.flashscore_url) throw new Error(`Chyba URL: ${d} ${r.club_domaci}`);
    if (!r.match_stadium)  throw new Error(`Chyba stadion: ${d} ${r.club_domaci}`);
    updates.push({ n, url: r.flashscore_url, venue: r.match_stadium,
                   popis: `${r.club_domaci} - ${r.club_hostia}` });
}
updates.sort((a, b) => a.n - b.n);

const riadky = updates.map(u =>
    `UPDATE "lm2026-27".games_pdf SET flashscore_url = ${q(u.url)},\n` +
    `       venue = ${q(u.venue)} WHERE game_number = ${u.n}; -- ${u.popis}`
).join('\n');

const sql = `-- Migration 066: URL zapasov a stadiony do games_pdf
--
-- Migracia iba aktualizuje riadky, takze ju zvladne aj tools/run_migration.cjs
-- (po migracii 064, ktora dala aplikacnemu pouzivatelovi potrebne prava).
--
-- Zdroj: sources/lm2026-27/lm_url.csv — ku kazdemu zapasu ligovej fazy odkaz na
-- Flashscore a stadion. Overene skriptom tools/check_lm_url_csv.cjs proti
-- rozpisu z PDF: 144 zapasov, dvojice, datumy aj casy sa zhoduju.
--
-- Stadion sa uklada ku KAZDEMU zapasu, nie ku klubu. Klub totiz nemusi hrat
-- doma na svojom stadione: Viking hostí PSV 20.01.2027 na MHPArena v Stuttgarte,
-- kym zvysne tri domace zapasy hra na Lyse Arena.
--
-- Vyradovacia cast tu nie je — kluby ani dejiska sa dozvieme az po zrebe.
-- Vynimkou je finale, ktoreho stadion uz zapisala migracia 062.

BEGIN;

${riadky}

-- Kontrola: vsetkych 144 ligovych zapasov ma URL aj stadion.
DO $$
DECLARE bez_url INTEGER; bez_stadiona INTEGER;
BEGIN
    SELECT COUNT(*) INTO bez_url FROM "lm2026-27".games_pdf
     WHERE phase = 'LEAGUE' AND (flashscore_url IS NULL OR flashscore_url = '');
    IF bez_url > 0 THEN RAISE EXCEPTION '% ligovych zapasov nema URL', bez_url; END IF;

    SELECT COUNT(*) INTO bez_stadiona FROM "lm2026-27".games_pdf
     WHERE phase = 'LEAGUE' AND (venue IS NULL OR venue = '');
    IF bez_stadiona > 0 THEN RAISE EXCEPTION '% ligovych zapasov nema stadion', bez_stadiona; END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (66, 'URL zapasov a stadiony ligovej fazy LM v games_pdf')
ON CONFLICT (version) DO NOTHING;

COMMIT;
`;

fs.writeFileSync(path.join(__dirname, '../api/migrations/066_ucl_urls_venues.sql'), sql, 'utf8');
console.log('zapisane, aktualizovanych zapasov:', updates.length);
