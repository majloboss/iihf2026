-- Migration 062: "lm2026-27".games_pdf — referencna kopia rozpisu zo zdroja (PDF)
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
--      vykop. V kolach 1-6 plati bez vynimky, ze prve dva zapasy hracieho dna
--      zacinaju 18:45 a zvysok 21:00 — a rovnako to ukazuje oficialny rozpis
--      UEFA pre 20.01.2027, preto sa ten isty vzor pouzil aj tu.
--      Kolo 8 sa hra cele 27.01. v jeden den, vsetky zapasy o 21:00.
--
-- Klub sa v zdroji identifikuje kodom, v tabulke ale zije club_id — rovnako
-- ako v tabulke games. Kod je udaj, ktory admin bezne meni v ciselniku, takze
-- cudzi kluc na nom by premenovanie klubu zablokoval.
--
-- Tabulka je referencna baza: pocas testovania sa z nej zapasy opakovane
-- nahravaju do "lm2026-27".games, preto sa pri kazdom spusteni zaklada nanovo.

BEGIN;

DROP TABLE IF EXISTS "lm2026-27".games_pdf;

CREATE TABLE "lm2026-27".games_pdf (
    game_number    INT          PRIMARY KEY,
    phase          VARCHAR(10)  NOT NULL,
    round_no       SMALLINT,
    home_team_id   INT          REFERENCES admin.uefa_clubs(club_id),
    away_team_id   INT          REFERENCES admin.uefa_clubs(club_id),
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
    (game_number, phase, round_no, home_team_id, away_team_id, starts_at, tie_id, leg) VALUES
-- 1. kolo
(  1, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), '2026-09-08 16:45:00', NULL, NULL),
(  2, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), '2026-09-08 16:45:00', NULL, NULL),
(  3, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), '2026-09-08 19:00:00', NULL, NULL),
(  4, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), '2026-09-08 19:00:00', NULL, NULL),
(  5, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), '2026-09-08 19:00:00', NULL, NULL),
(  6, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), '2026-09-08 19:00:00', NULL, NULL),
(  7, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), '2026-09-09 16:45:00', NULL, NULL),
(  8, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), '2026-09-09 16:45:00', NULL, NULL),
(  9, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), '2026-09-09 19:00:00', NULL, NULL),
( 10, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), '2026-09-09 19:00:00', NULL, NULL),
( 11, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), '2026-09-09 19:00:00', NULL, NULL),
( 12, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), '2026-09-09 19:00:00', NULL, NULL),
( 13, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), '2026-09-10 16:45:00', NULL, NULL),
( 14, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), '2026-09-10 16:45:00', NULL, NULL),
( 15, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), '2026-09-10 19:00:00', NULL, NULL),
( 16, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), '2026-09-10 19:00:00', NULL, NULL),
( 17, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), '2026-09-10 19:00:00', NULL, NULL),
( 18, 'LEAGUE', 1, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), '2026-09-10 19:00:00', NULL, NULL),
-- 2. kolo
( 19, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), '2026-10-13 16:45:00', NULL, NULL),
( 20, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), '2026-10-13 16:45:00', NULL, NULL),
( 21, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), '2026-10-13 19:00:00', NULL, NULL),
( 22, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), '2026-10-13 19:00:00', NULL, NULL),
( 23, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), '2026-10-13 19:00:00', NULL, NULL),
( 24, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), '2026-10-13 19:00:00', NULL, NULL),
( 25, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), '2026-10-13 19:00:00', NULL, NULL),
( 26, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), '2026-10-13 19:00:00', NULL, NULL),
( 27, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), '2026-10-13 19:00:00', NULL, NULL),
( 28, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), '2026-10-14 16:45:00', NULL, NULL),
( 29, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), '2026-10-14 16:45:00', NULL, NULL),
( 30, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), '2026-10-14 19:00:00', NULL, NULL),
( 31, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), '2026-10-14 19:00:00', NULL, NULL),
( 32, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), '2026-10-14 19:00:00', NULL, NULL),
( 33, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), '2026-10-14 19:00:00', NULL, NULL),
( 34, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), '2026-10-14 19:00:00', NULL, NULL),
( 35, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), '2026-10-14 19:00:00', NULL, NULL),
( 36, 'LEAGUE', 2, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), '2026-10-14 19:00:00', NULL, NULL),
-- 3. kolo
( 37, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), '2026-10-20 16:45:00', NULL, NULL),
( 38, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), '2026-10-20 16:45:00', NULL, NULL),
( 39, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), '2026-10-20 19:00:00', NULL, NULL),
( 40, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), '2026-10-20 19:00:00', NULL, NULL),
( 41, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), '2026-10-20 19:00:00', NULL, NULL),
( 42, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), '2026-10-20 19:00:00', NULL, NULL),
( 43, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), '2026-10-20 19:00:00', NULL, NULL),
( 44, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), '2026-10-20 19:00:00', NULL, NULL),
( 45, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), '2026-10-20 19:00:00', NULL, NULL),
( 46, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), '2026-10-21 16:45:00', NULL, NULL),
( 47, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), '2026-10-21 16:45:00', NULL, NULL),
( 48, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), '2026-10-21 19:00:00', NULL, NULL),
( 49, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), '2026-10-21 19:00:00', NULL, NULL),
( 50, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), '2026-10-21 19:00:00', NULL, NULL),
( 51, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), '2026-10-21 19:00:00', NULL, NULL),
( 52, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), '2026-10-21 19:00:00', NULL, NULL),
( 53, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), '2026-10-21 19:00:00', NULL, NULL),
( 54, 'LEAGUE', 3, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), '2026-10-21 19:00:00', NULL, NULL),
-- 4. kolo
( 55, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), '2026-11-03 17:45:00', NULL, NULL),
( 56, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), '2026-11-03 17:45:00', NULL, NULL),
( 57, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), '2026-11-03 20:00:00', NULL, NULL),
( 58, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), '2026-11-03 20:00:00', NULL, NULL),
( 59, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), '2026-11-03 20:00:00', NULL, NULL),
( 60, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), '2026-11-03 20:00:00', NULL, NULL),
( 61, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), '2026-11-03 20:00:00', NULL, NULL),
( 62, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), '2026-11-03 20:00:00', NULL, NULL),
( 63, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), '2026-11-03 20:00:00', NULL, NULL),
( 64, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), '2026-11-04 17:45:00', NULL, NULL),
( 65, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), '2026-11-04 17:45:00', NULL, NULL),
( 66, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), '2026-11-04 20:00:00', NULL, NULL),
( 67, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), '2026-11-04 20:00:00', NULL, NULL),
( 68, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), '2026-11-04 20:00:00', NULL, NULL),
( 69, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), '2026-11-04 20:00:00', NULL, NULL),
( 70, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), '2026-11-04 20:00:00', NULL, NULL),
( 71, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), '2026-11-04 20:00:00', NULL, NULL),
( 72, 'LEAGUE', 4, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), '2026-11-04 20:00:00', NULL, NULL),
-- 5. kolo
( 73, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), '2026-11-24 17:45:00', NULL, NULL),
( 74, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), '2026-11-24 17:45:00', NULL, NULL),
( 75, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), '2026-11-24 20:00:00', NULL, NULL),
( 76, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), '2026-11-24 20:00:00', NULL, NULL),
( 77, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), '2026-11-24 20:00:00', NULL, NULL),
( 78, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), '2026-11-24 20:00:00', NULL, NULL),
( 79, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), '2026-11-24 20:00:00', NULL, NULL),
( 80, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), '2026-11-24 20:00:00', NULL, NULL),
( 81, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), '2026-11-24 20:00:00', NULL, NULL),
( 82, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), '2026-11-25 17:45:00', NULL, NULL),
( 83, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), '2026-11-25 17:45:00', NULL, NULL),
( 84, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), '2026-11-25 20:00:00', NULL, NULL),
( 85, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), '2026-11-25 20:00:00', NULL, NULL),
( 86, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), '2026-11-25 20:00:00', NULL, NULL),
( 87, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), '2026-11-25 20:00:00', NULL, NULL),
( 88, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), '2026-11-25 20:00:00', NULL, NULL),
( 89, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), '2026-11-25 20:00:00', NULL, NULL),
( 90, 'LEAGUE', 5, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), '2026-11-25 20:00:00', NULL, NULL),
-- 6. kolo
( 91, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), '2026-12-08 17:45:00', NULL, NULL),
( 92, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), '2026-12-08 17:45:00', NULL, NULL),
( 93, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), '2026-12-08 20:00:00', NULL, NULL),
( 94, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), '2026-12-08 20:00:00', NULL, NULL),
( 95, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), '2026-12-08 20:00:00', NULL, NULL),
( 96, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), '2026-12-08 20:00:00', NULL, NULL),
( 97, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), '2026-12-08 20:00:00', NULL, NULL),
( 98, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), '2026-12-08 20:00:00', NULL, NULL),
( 99, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), '2026-12-08 20:00:00', NULL, NULL),
(100, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), '2026-12-09 17:45:00', NULL, NULL),
(101, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), '2026-12-09 17:45:00', NULL, NULL),
(102, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), '2026-12-09 20:00:00', NULL, NULL),
(103, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), '2026-12-09 20:00:00', NULL, NULL),
(104, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), '2026-12-09 20:00:00', NULL, NULL),
(105, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), '2026-12-09 20:00:00', NULL, NULL),
(106, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), '2026-12-09 20:00:00', NULL, NULL),
(107, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), '2026-12-09 20:00:00', NULL, NULL),
(108, 'LEAGUE', 6, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), '2026-12-09 20:00:00', NULL, NULL),
-- 7. kolo
(109, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), '2027-01-19 17:45:00', NULL, NULL),
(110, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), '2027-01-19 17:45:00', NULL, NULL),
(111, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), '2027-01-19 20:00:00', NULL, NULL),
(112, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), '2027-01-19 20:00:00', NULL, NULL),
(113, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), '2027-01-19 20:00:00', NULL, NULL),
(114, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), '2027-01-19 20:00:00', NULL, NULL),
(115, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), '2027-01-19 20:00:00', NULL, NULL),
(116, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), '2027-01-19 20:00:00', NULL, NULL),
(117, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), '2027-01-19 20:00:00', NULL, NULL),
(118, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), '2027-01-20 17:45:00', NULL, NULL),
(119, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), '2027-01-20 17:45:00', NULL, NULL),
(120, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), '2027-01-20 20:00:00', NULL, NULL),
(121, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), '2027-01-20 20:00:00', NULL, NULL),
(122, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), '2027-01-20 20:00:00', NULL, NULL),
(123, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), '2027-01-20 20:00:00', NULL, NULL),
(124, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), '2027-01-20 20:00:00', NULL, NULL),
(125, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), '2027-01-20 20:00:00', NULL, NULL),
(126, 'LEAGUE', 7, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), '2027-01-20 20:00:00', NULL, NULL),
-- 8. kolo
(127, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ARS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XSAB'), '2027-01-27 20:00:00', NULL, NULL),
(128, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ROM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIL'), '2027-01-27 20:00:00', NULL, NULL),
(129, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'ATM'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEN'), '2027-01-27 20:00:00', NULL, NULL),
(130, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAR'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XCOM'), '2027-01-27 20:00:00', NULL, NULL),
(131, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BAY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BET'), '2027-01-27 20:00:00', NULL, NULL),
(132, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BRU'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BOD'), '2027-01-27 20:00:00', NULL, NULL),
(133, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'BVB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XAEK'), '2027-01-27 20:00:00', NULL, NULL),
(134, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'FEY'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RBL'), '2027-01-27 20:00:00', NULL, NULL),
(135, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLAS'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'POR'), '2027-01-27 20:00:00', NULL, NULL),
(136, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'LIV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XLEN'), '2027-01-27 20:00:00', NULL, NULL),
(137, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MCI'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SPO'), '2027-01-27 20:00:00', NULL, NULL),
(138, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'NAP'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'XVIK'), '2027-01-27 20:00:00', NULL, NULL),
(139, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSG'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'GAL'), '2027-01-27 20:00:00', NULL, NULL),
(140, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'PSV'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'STU'), '2027-01-27 20:00:00', NULL, NULL),
(141, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SHK'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'RMA'), '2027-01-27 20:00:00', NULL, NULL),
(142, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLA'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'AVL'), '2027-01-27 20:00:00', NULL, NULL),
(143, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'SLB'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'INT'), '2027-01-27 20:00:00', NULL, NULL),
(144, 'LEAGUE', 8, (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'VIL'), (SELECT club_id FROM admin.uefa_clubs WHERE club_code = 'MUN'), '2027-01-27 20:00:00', NULL, NULL),
-- PO
(145, 'PO', NULL, NULL, NULL, '2027-02-16 20:00:00', 'PO-1', 1),
(146, 'PO', NULL, NULL, NULL, '2027-02-16 20:00:00', 'PO-2', 1),
(147, 'PO', NULL, NULL, NULL, '2027-02-16 20:00:00', 'PO-3', 1),
(148, 'PO', NULL, NULL, NULL, '2027-02-16 20:00:00', 'PO-4', 1),
(149, 'PO', NULL, NULL, NULL, '2027-02-17 20:00:00', 'PO-5', 1),
(150, 'PO', NULL, NULL, NULL, '2027-02-17 20:00:00', 'PO-6', 1),
(151, 'PO', NULL, NULL, NULL, '2027-02-17 20:00:00', 'PO-7', 1),
(152, 'PO', NULL, NULL, NULL, '2027-02-17 20:00:00', 'PO-8', 1),
(153, 'PO', NULL, NULL, NULL, '2027-02-23 20:00:00', 'PO-1', 2),
(154, 'PO', NULL, NULL, NULL, '2027-02-23 20:00:00', 'PO-2', 2),
(155, 'PO', NULL, NULL, NULL, '2027-02-23 20:00:00', 'PO-3', 2),
(156, 'PO', NULL, NULL, NULL, '2027-02-23 20:00:00', 'PO-4', 2),
(157, 'PO', NULL, NULL, NULL, '2027-02-24 20:00:00', 'PO-5', 2),
(158, 'PO', NULL, NULL, NULL, '2027-02-24 20:00:00', 'PO-6', 2),
(159, 'PO', NULL, NULL, NULL, '2027-02-24 20:00:00', 'PO-7', 2),
(160, 'PO', NULL, NULL, NULL, '2027-02-24 20:00:00', 'PO-8', 2),
-- R16
(161, 'R16', NULL, NULL, NULL, '2027-03-09 20:00:00', 'R16-1', 1),
(162, 'R16', NULL, NULL, NULL, '2027-03-09 20:00:00', 'R16-2', 1),
(163, 'R16', NULL, NULL, NULL, '2027-03-09 20:00:00', 'R16-3', 1),
(164, 'R16', NULL, NULL, NULL, '2027-03-09 20:00:00', 'R16-4', 1),
(165, 'R16', NULL, NULL, NULL, '2027-03-10 20:00:00', 'R16-5', 1),
(166, 'R16', NULL, NULL, NULL, '2027-03-10 20:00:00', 'R16-6', 1),
(167, 'R16', NULL, NULL, NULL, '2027-03-10 20:00:00', 'R16-7', 1),
(168, 'R16', NULL, NULL, NULL, '2027-03-10 20:00:00', 'R16-8', 1),
(169, 'R16', NULL, NULL, NULL, '2027-03-16 20:00:00', 'R16-1', 2),
(170, 'R16', NULL, NULL, NULL, '2027-03-16 20:00:00', 'R16-2', 2),
(171, 'R16', NULL, NULL, NULL, '2027-03-16 20:00:00', 'R16-3', 2),
(172, 'R16', NULL, NULL, NULL, '2027-03-16 20:00:00', 'R16-4', 2),
(173, 'R16', NULL, NULL, NULL, '2027-03-17 20:00:00', 'R16-5', 2),
(174, 'R16', NULL, NULL, NULL, '2027-03-17 20:00:00', 'R16-6', 2),
(175, 'R16', NULL, NULL, NULL, '2027-03-17 20:00:00', 'R16-7', 2),
(176, 'R16', NULL, NULL, NULL, '2027-03-17 20:00:00', 'R16-8', 2),
-- QF
(177, 'QF', NULL, NULL, NULL, '2027-04-06 19:00:00', 'QF-1', 1),
(178, 'QF', NULL, NULL, NULL, '2027-04-06 19:00:00', 'QF-2', 1),
(179, 'QF', NULL, NULL, NULL, '2027-04-07 19:00:00', 'QF-3', 1),
(180, 'QF', NULL, NULL, NULL, '2027-04-07 19:00:00', 'QF-4', 1),
(181, 'QF', NULL, NULL, NULL, '2027-04-13 19:00:00', 'QF-1', 2),
(182, 'QF', NULL, NULL, NULL, '2027-04-13 19:00:00', 'QF-2', 2),
(183, 'QF', NULL, NULL, NULL, '2027-04-14 19:00:00', 'QF-3', 2),
(184, 'QF', NULL, NULL, NULL, '2027-04-14 19:00:00', 'QF-4', 2),
-- SF
(185, 'SF', NULL, NULL, NULL, '2027-04-27 19:00:00', 'SF-1', 1),
(186, 'SF', NULL, NULL, NULL, '2027-04-28 19:00:00', 'SF-2', 1),
(187, 'SF', NULL, NULL, NULL, '2027-05-04 19:00:00', 'SF-1', 2),
(188, 'SF', NULL, NULL, NULL, '2027-05-05 19:00:00', 'SF-2', 2);

INSERT INTO "lm2026-27".games_pdf
    (game_number, phase, round_no, home_team_id, away_team_id, starts_at, tie_id, leg, venue) VALUES
(189, 'F', NULL, NULL, NULL, '2027-06-05 19:00:00', NULL, NULL, 'Estadio Metropolitano, Madrid');

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
            SELECT home_team_id AS code FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
            UNION ALL
            SELECT away_team_id FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
        ) y GROUP BY code HAVING COUNT(*) <> 8
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% klubov nema 8 zapasov', zle; END IF;

    -- Z toho 4 doma.
    SELECT COUNT(*) INTO zle FROM (
        SELECT home_team_id FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE'
         GROUP BY home_team_id HAVING COUNT(*) <> 4
    ) x;
    IF zle > 0 THEN RAISE EXCEPTION '% klubov nema 4 domace zapasy', zle; END IF;

    -- Ziadna dvojica sa nestretne dvakrat.
    SELECT COUNT(*) INTO zle FROM (
        SELECT LEAST(home_team_id, away_team_id) AS a, GREATEST(home_team_id, away_team_id) AS b
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
