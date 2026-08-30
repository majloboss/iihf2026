// Vygeneruje migraciu 062_ucl_games_pdf.sql z rozparsovaneho rozpisu.
const fs = require('fs');
const games = require('../sources/lm2026-27/LM2026-27_games.json');

// Flashscore nazov -> club_code v admin.uefa_clubs.
// Ciselnik pouziva kratke kody (ARS, RMA), niektore s predponou X.
const MAP = {
    'AEK Athens': 'XAEK', 'AS Roma': 'ROM', 'Arsenal': 'ARS',
    'Aston Villa': 'AVL', 'Atl. Madrid': 'ATM', 'Barcelona': 'BAR',
    'Bayern Munich': 'BAY', 'Betis': 'BET', 'Bodo/Glimt': 'BOD',
    'Club Brugge KV': 'BRU', 'Como': 'XCOM', 'Dortmund': 'BVB',
    'FC Porto': 'POR', 'Fenerbahce': 'FEN', 'Feyenoord': 'FEY',
    'Galatasaray': 'GAL', 'Inter': 'INT', 'LASK': 'XLAS', 'Lens': 'XLEN',
    'Lille': 'LIL', 'Liverpool': 'LIV', 'Manchester City': 'MCI',
    'Manchester Utd': 'MUN', 'Napoli': 'NAP', 'PSG': 'PSG', 'PSV': 'PSV',
    'RB Leipzig': 'RBL', 'Real Madrid': 'RMA', 'Sabah Baku': 'XSAB',
    'Shakhtar Donetsk': 'SHK', 'Slavia Prague': 'SLA',
    'Slovan Bratislava': 'SLB', 'Sporting CP': 'SPO',
    'Stuttgart': 'STU', 'Viking': 'XVIK', 'Villarreal': 'VIL',
};
for (const g of games) for (const t of [g.home, g.away])
    if (!MAP[t]) throw new Error('Nemapovany klub: ' + t);

// PDF uvadza stredoeuropsky cas. start_time sa uklada ako naive UTC,
// rovnako ako to robi generator rozlosovania.
const utc = (date, time) => {
    const off = date >= '2026-10-25' && date < '2027-03-28' ? 1 : 2; // CET / CEST
    const d = new Date(date + 'T' + time + ':00Z');
    d.setUTCHours(d.getUTCHours() - off);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

const rows = [];
let id = 0;
let lastRound = 0;
const sorted = games.slice().sort((a, b) =>
    a.round - b.round || a.date.localeCompare(b.date) ||
    a.time.localeCompare(b.time) || a.home.localeCompare(b.home));

for (const g of sorted) {
    if (g.round !== lastRound) { rows.push('-- ' + g.round + '. kolo'); lastRound = g.round; }
    rows.push('(' + String(++id).padStart(3) + ", 'LEAGUE', " + g.round +
              ", '" + MAP[g.home] + "', '" + MAP[g.away] + "', '" + utc(g.date, g.time) +
              "', NULL, NULL),");
}

// Vyradovacia cast: kluby zatial nezname, poznaju sa iba terminy.
const KO = [
    ['PO',  8, ['2027-02-16', '2027-02-17'], ['2027-02-23', '2027-02-24']],
    ['R16', 8, ['2027-03-09', '2027-03-10'], ['2027-03-16', '2027-03-17']],
    ['QF',  4, ['2027-04-06', '2027-04-07'], ['2027-04-13', '2027-04-14']],
    ['SF',  2, ['2027-04-27', '2027-04-28'], ['2027-05-04', '2027-05-05']],
];
for (const [code, pairs, leg1, leg2] of KO) {
    rows.push('-- ' + code);
    for (const [legNo, days] of [[1, leg1], [2, leg2]]) {
        for (let p = 0; p < pairs; p++) {
            // Polovica dvojic v prvy den, polovica v druhy.
            const day = days[p < Math.ceil(pairs / 2) ? 0 : 1];
            rows.push('(' + String(++id).padStart(3) + ", '" + code + "', NULL, NULL, NULL, '" +
                      utc(day, '21:00') + "', '" + code + '-' + (p + 1) + "', " + legNo + '),');
        }
    }
}
rows.push('-- Finale');
rows.push('(' + String(++id).padStart(3) + ", 'F', NULL, NULL, NULL, '" + utc('2027-06-05', '21:00') +
          "', NULL, NULL, 'Estadio Metropolitano, Madrid');");

// Finalovy riadok ma o stlpec viac, preto sa vklada zvlast.
const finalRow = rows.pop();
rows.pop(); // komentar '-- Finale'
// Posledny riadok vkladu konci bodkociarkou, nie ciarkou.
rows[rows.length - 1] = rows[rows.length - 1].replace(/,$/, ';');
const leagueAndKo = rows.join('\n');

const sql = `-- Migration 062: "lm2026-27".games_pdf — referencna kopia rozpisu zo zdroja (PDF)
--
-- Zdroj: sources/lm2026-27/LM2026-27.pdf (Flashscore, stav k 30.08.2026).
-- Ligova faza je vyzrebovana: 144 zapasov, 8 kol po 18 zapasov, 36 klubov,
-- kazdy klub 8 zapasov (4 doma). Kolo drzi stlpec round_no — rovnaka hodnota,
-- akou filtruje UclGames (LF1-LF8).
--
-- Vyradovacia cast zatial nema kluby — zname su iba terminy podla rozpisu UEFA.
-- Dvojica zapas-odveta zdiela tie_id, rovnako ako v tabulke games.
--
-- Cas: PDF uvadza stredoeuropsky cas, starts_at sa uklada ako naive UTC
--      (rovnako ako v "lm2026-27".games). Kola 7 a 8 nemaju v PDF uvedeny
--      vykop — pouziva sa 21:00 SEC.
--
-- Kluby sa zapisuju kodom z admin.uefa_clubs, nie club_id: kod je citatelny
-- a nezavisi na poradi importu.
--
-- Tabulka je referencna baza: pocas testovania sa z nej zapasy opakovane
-- nahravaju do "lm2026-27".games, preto sa pri kazdom spusteni zaklada nanovo.

BEGIN;

DROP TABLE IF EXISTS "lm2026-27".games_pdf;

CREATE TABLE "lm2026-27".games_pdf (
    game_number    INT          PRIMARY KEY,
    phase          VARCHAR(10)  NOT NULL,
    round_no       SMALLINT,
    home_code      VARCHAR(20)  REFERENCES admin.uefa_clubs(club_code),
    away_code      VARCHAR(20)  REFERENCES admin.uefa_clubs(club_code),
    starts_at      TIMESTAMP    NOT NULL,
    tie_id         VARCHAR(20),
    leg            SMALLINT,
    venue          VARCHAR(200),
    flashscore_url VARCHAR(500),
    CONSTRAINT games_pdf_leg_check   CHECK (leg IS NULL OR leg IN (1, 2)),
    CONSTRAINT games_pdf_round_check CHECK (
        (phase = 'LEAGUE' AND round_no BETWEEN 1 AND 8) OR
        (phase <> 'LEAGUE' AND round_no IS NULL)
    )
);

COMMENT ON TABLE  "lm2026-27".games_pdf          IS 'Referencny rozpis zo zdrojoveho PDF, baza pre naplnenie games';
COMMENT ON COLUMN "lm2026-27".games_pdf.round_no IS 'Kolo ligovej fazy 1-8, pouziva sa vo filtri; NULL vo vyradovacej casti';
COMMENT ON COLUMN "lm2026-27".games_pdf.tie_id   IS 'Dvojica zapas-odveta, napr. PO-3; NULL pre ligovu fazu a finale';

CREATE INDEX games_pdf_phase_idx ON "lm2026-27".games_pdf (phase, round_no);
CREATE INDEX games_pdf_start_idx ON "lm2026-27".games_pdf (starts_at);

INSERT INTO "lm2026-27".games_pdf
    (game_number, phase, round_no, home_code, away_code, starts_at, tie_id, leg) VALUES
${leagueAndKo}

INSERT INTO "lm2026-27".games_pdf
    (game_number, phase, round_no, home_code, away_code, starts_at, tie_id, leg, venue) VALUES
${finalRow}

-- Kontrola: 144 ligovych zapasov v 8 kolach a 61 zapasov vyradovacej casti.
DO $$
DECLARE liga INTEGER; ko INTEGER; zle INTEGER;
BEGIN
    SELECT COUNT(*) INTO liga FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE';
    SELECT COUNT(*) INTO ko   FROM "lm2026-27".games_pdf WHERE phase <> 'LEAGUE';
    IF liga <> 144 THEN RAISE EXCEPTION 'Ligova faza ma % zapasov, ocakava sa 144', liga; END IF;
    IF ko   <>  45 THEN RAISE EXCEPTION 'Vyradovacia cast ma % zapasov, ocakava sa 45', ko;  END IF;

    -- Kazde kolo ligovej fazy ma 18 zapasov.
    SELECT COUNT(*) INTO zle FROM (
        SELECT round_no FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
         GROUP BY round_no HAVING COUNT(*) <> 18
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% kol nema 18 zapasov', zle; END IF;

    -- Kazdy klub 8 zapasov.
    SELECT COUNT(*) INTO zle FROM (
        SELECT code FROM (
            SELECT home_code AS code FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
            UNION ALL
            SELECT away_code FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
        ) y GROUP BY code HAVING COUNT(*) <> 8
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% klubov nema 8 zapasov', zle; END IF;

    -- Z toho 4 doma.
    SELECT COUNT(*) INTO zle FROM (
        SELECT home_code FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
         GROUP BY home_code HAVING COUNT(*) <> 4
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% klubov nema 4 domace zapasy', zle; END IF;

    -- Ziadna dvojica sa nestretne dvakrat.
    SELECT COUNT(*) INTO zle FROM (
        SELECT LEAST(home_code, away_code) AS a, GREATEST(home_code, away_code) AS b
          FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
         GROUP BY 1, 2 HAVING COUNT(*) > 1
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% dvojic sa stretlo viackrat', zle; END IF;

    -- Kazda dvojica vyradovacej casti ma presne dva zapasy, prvy a odvetu.
    SELECT COUNT(*) INTO zle FROM (
        SELECT tie_id FROM "lm2026-27".games_pdf WHERE tie_id IS NOT NULL
         GROUP BY tie_id HAVING COUNT(*) <> 2 OR COUNT(DISTINCT leg) <> 2
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% chybnych dvojic zapas-odveta', zle; END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "lm2026-27".games_pdf TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (62, 'Referencny rozpis LM 2026/27 zo zdrojoveho PDF v games_pdf')
ON CONFLICT (version) DO NOTHING;

COMMIT;
`;
fs.writeFileSync('./api/migrations/062_ucl_games_pdf.sql', sql, 'utf8');
console.log('zapisane, zapasov spolu:', id);
