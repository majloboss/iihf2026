-- Migration 016: Tabulka games_pdf - referencna kopia rozpisu zo zdroja (PDF)
-- Zdroj: sources/IIHF2026.pdf (stav k 12.02.2026), casy UTC (PDF GMT+2 - 2h)
-- flashscore_url: syncuje sa automaticky z games pri kazdom ulozeni adminom
-- Play-off tymi (57-64): NULL, doplni admin po zostaveni parov

CREATE TABLE IF NOT EXISTS iihf2026.games_pdf (
    game_number   INT PRIMARY KEY,
    phase         VARCHAR(10)  NOT NULL,
    team1         CHAR(3),
    team2         CHAR(3),
    starts_at     TIMESTAMPTZ  NOT NULL,
    venue         VARCHAR(200),
    flashscore_url VARCHAR(500)
);

INSERT INTO iihf2026.games_pdf (game_number, phase, team1, team2, starts_at, venue) VALUES
-- ============================================================
-- SKUPINOVA FAZA - SKUPINA A  (Swiss Life Arena, Zurich)
-- ============================================================
-- FRI 15 MAY
( 1, 'A', 'FIN', 'GER', '2026-05-15 14:20:00+00', 'Swiss Life Arena, Zurich'),
( 3, 'A', 'USA', 'SUI', '2026-05-15 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- SAT 16 MAY
( 5, 'A', 'GBR', 'AUT', '2026-05-16 10:20:00+00', 'Swiss Life Arena, Zurich'),
( 7, 'A', 'HUN', 'FIN', '2026-05-16 14:20:00+00', 'Swiss Life Arena, Zurich'),
( 9, 'A', 'SUI', 'LAT', '2026-05-16 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- SUN 17 MAY
(11, 'A', 'GBR', 'USA', '2026-05-17 10:20:00+00', 'Swiss Life Arena, Zurich'),
(13, 'A', 'AUT', 'HUN', '2026-05-17 14:20:00+00', 'Swiss Life Arena, Zurich'),
(15, 'A', 'GER', 'LAT', '2026-05-17 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- MON 18 MAY
(17, 'A', 'FIN', 'USA', '2026-05-18 14:20:00+00', 'Swiss Life Arena, Zurich'),
(19, 'A', 'GER', 'SUI', '2026-05-18 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- TUE 19 MAY
(21, 'A', 'LAT', 'AUT', '2026-05-19 14:20:00+00', 'Swiss Life Arena, Zurich'),
(23, 'A', 'HUN', 'GBR', '2026-05-19 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- WED 20 MAY
(25, 'A', 'AUT', 'SUI', '2026-05-20 14:20:00+00', 'Swiss Life Arena, Zurich'),
(27, 'A', 'USA', 'GER', '2026-05-20 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- THU 21 MAY
(29, 'A', 'LAT', 'FIN', '2026-05-21 14:20:00+00', 'Swiss Life Arena, Zurich'),
(31, 'A', 'SUI', 'GBR', '2026-05-21 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- FRI 22 MAY
(33, 'A', 'GER', 'HUN', '2026-05-22 14:20:00+00', 'Swiss Life Arena, Zurich'),
(35, 'A', 'FIN', 'GBR', '2026-05-22 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- SAT 23 MAY
(37, 'A', 'LAT', 'USA', '2026-05-23 10:20:00+00', 'Swiss Life Arena, Zurich'),
(39, 'A', 'SUI', 'HUN', '2026-05-23 14:20:00+00', 'Swiss Life Arena, Zurich'),
(41, 'A', 'AUT', 'GER', '2026-05-23 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- SUN 24 MAY
(43, 'A', 'GBR', 'LAT', '2026-05-24 14:20:00+00', 'Swiss Life Arena, Zurich'),
(45, 'A', 'FIN', 'AUT', '2026-05-24 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- MON 25 MAY
(47, 'A', 'USA', 'HUN', '2026-05-25 14:20:00+00', 'Swiss Life Arena, Zurich'),
(49, 'A', 'GER', 'GBR', '2026-05-25 18:20:00+00', 'Swiss Life Arena, Zurich'),
-- TUE 26 MAY
(51, 'A', 'HUN', 'LAT', '2026-05-26 10:20:00+00', 'Swiss Life Arena, Zurich'),
(53, 'A', 'USA', 'AUT', '2026-05-26 14:20:00+00', 'Swiss Life Arena, Zurich'),
(55, 'A', 'SUI', 'FIN', '2026-05-26 18:20:00+00', 'Swiss Life Arena, Zurich'),

-- ============================================================
-- SKUPINOVA FAZA - SKUPINA B  (BCF Arena, Fribourg)
-- ============================================================
-- FRI 15 MAY
( 2, 'B', 'CAN', 'SWE', '2026-05-15 14:20:00+00', 'BCF Arena, Fribourg'),
( 4, 'B', 'CZE', 'DEN', '2026-05-15 18:20:00+00', 'BCF Arena, Fribourg'),
-- SAT 16 MAY
( 6, 'B', 'SVK', 'NOR', '2026-05-16 10:20:00+00', 'BCF Arena, Fribourg'),
( 8, 'B', 'ITA', 'CAN', '2026-05-16 14:20:00+00', 'BCF Arena, Fribourg'),
(10, 'B', 'SLO', 'CZE', '2026-05-16 18:20:00+00', 'BCF Arena, Fribourg'),
-- SUN 17 MAY
(12, 'B', 'ITA', 'SVK', '2026-05-17 10:20:00+00', 'BCF Arena, Fribourg'),
(14, 'B', 'DEN', 'SWE', '2026-05-17 14:20:00+00', 'BCF Arena, Fribourg'),
(16, 'B', 'NOR', 'SLO', '2026-05-17 18:20:00+00', 'BCF Arena, Fribourg'),
-- MON 18 MAY
(18, 'B', 'CAN', 'DEN', '2026-05-18 14:20:00+00', 'BCF Arena, Fribourg'),
(20, 'B', 'SWE', 'CZE', '2026-05-18 18:20:00+00', 'BCF Arena, Fribourg'),
-- TUE 19 MAY
(22, 'B', 'ITA', 'NOR', '2026-05-19 14:20:00+00', 'BCF Arena, Fribourg'),
(24, 'B', 'SLO', 'SVK', '2026-05-19 18:20:00+00', 'BCF Arena, Fribourg'),
-- WED 20 MAY
(26, 'B', 'CZE', 'ITA', '2026-05-20 14:20:00+00', 'BCF Arena, Fribourg'),
(28, 'B', 'SWE', 'SLO', '2026-05-20 18:20:00+00', 'BCF Arena, Fribourg'),
-- THU 21 MAY
(30, 'B', 'CAN', 'NOR', '2026-05-21 14:20:00+00', 'BCF Arena, Fribourg'),
(32, 'B', 'DEN', 'SVK', '2026-05-21 18:20:00+00', 'BCF Arena, Fribourg'),
-- FRI 22 MAY
(34, 'B', 'CAN', 'SLO', '2026-05-22 14:20:00+00', 'BCF Arena, Fribourg'),
(36, 'B', 'SWE', 'ITA', '2026-05-22 18:20:00+00', 'BCF Arena, Fribourg'),
-- SAT 23 MAY
(38, 'B', 'DEN', 'SLO', '2026-05-23 10:20:00+00', 'BCF Arena, Fribourg'),
(40, 'B', 'SVK', 'CZE', '2026-05-23 14:20:00+00', 'BCF Arena, Fribourg'),
(42, 'B', 'NOR', 'SWE', '2026-05-23 18:20:00+00', 'BCF Arena, Fribourg'),
-- SUN 24 MAY
(44, 'B', 'DEN', 'ITA', '2026-05-24 14:20:00+00', 'BCF Arena, Fribourg'),
(46, 'B', 'SVK', 'CAN', '2026-05-24 18:20:00+00', 'BCF Arena, Fribourg'),
-- MON 25 MAY
(48, 'B', 'CZE', 'NOR', '2026-05-25 14:20:00+00', 'BCF Arena, Fribourg'),
(50, 'B', 'SLO', 'ITA', '2026-05-25 18:20:00+00', 'BCF Arena, Fribourg'),
-- TUE 26 MAY
(52, 'B', 'NOR', 'DEN', '2026-05-26 10:20:00+00', 'BCF Arena, Fribourg'),
(54, 'B', 'SWE', 'SVK', '2026-05-26 14:20:00+00', 'BCF Arena, Fribourg'),
(56, 'B', 'CZE', 'CAN', '2026-05-26 18:20:00+00', 'BCF Arena, Fribourg'),

-- ============================================================
-- PLAY-OFF (games 57-64) - tymy NULL, doplni admin
-- ============================================================
-- THU 28 MAY - Stvrtfinale
(57, 'QF',     NULL, NULL, '2026-05-28 14:20:00+00', 'Swiss Life Arena, Zurich'),
(58, 'QF',     NULL, NULL, '2026-05-28 14:20:00+00', 'BCF Arena, Fribourg'),
(59, 'QF',     NULL, NULL, '2026-05-28 18:20:00+00', 'Swiss Life Arena, Zurich'),
(60, 'QF',     NULL, NULL, '2026-05-28 18:20:00+00', 'BCF Arena, Fribourg'),
-- SAT 30 MAY - Semifinale
(61, 'SF',     NULL, NULL, '2026-05-30 13:20:00+00', 'Swiss Life Arena, Zurich'),
(62, 'SF',     NULL, NULL, '2026-05-30 18:00:00+00', 'Swiss Life Arena, Zurich'),
-- SUN 31 MAY
(63, 'BRONZE', NULL, NULL, '2026-05-31 13:30:00+00', 'Swiss Life Arena, Zurich'),
(64, 'GOLD',   NULL, NULL, '2026-05-31 18:20:00+00', 'Swiss Life Arena, Zurich')

ON CONFLICT (game_number) DO NOTHING;
