-- IIHF2026 - Migration 002: Naplnenie zapasov
-- DB: DB-BET
-- Spusti ako: psql -h [host] -U [user] -d DB-BET -f migrate_002_games.sql
-- Zdroj: sources/IIHF2026.pdf (stav k 12.02.2026)
-- Casy ulozene v UTC (PDF udava GMT+2, odpocitane 2 hodiny)
-- Playoff zapasy (57-64): home/away_team_id = NULL, tips_open = FALSE
--   (tips_open sa nastavi na TRUE az ked admin schvali tabulku a vygeneruje par)

INSERT INTO iihf2026.games
    (game_id, home_team_id, away_team_id, start_time, venue, tips_open, game_type_code, game_type_name)
VALUES
-- ============================================================
-- SKUPINOVA FAZA - SKUPINA A  (games 1-56, GROUP_A)
-- Swiss Life Arena, Zurich
-- ============================================================
-- FRI 15 MAY
(1,  (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), '2026-05-15 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(3,  (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), '2026-05-15 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- SAT 16 MAY
(5,  (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), '2026-05-16 10:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(7,  (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), '2026-05-16 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(9,  (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), '2026-05-16 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- SUN 17 MAY
(11, (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), '2026-05-17 10:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(13, (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), '2026-05-17 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(15, (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), '2026-05-17 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- MON 18 MAY
(17, (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), '2026-05-18 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(19, (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), '2026-05-18 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- TUE 19 MAY
(21, (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), '2026-05-19 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(23, (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), '2026-05-19 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- WED 20 MAY
(25, (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), '2026-05-20 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(27, (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), '2026-05-20 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- THU 21 MAY
(29, (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), '2026-05-21 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(31, (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), '2026-05-21 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- FRI 22 MAY
(33, (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), '2026-05-22 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(35, (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), '2026-05-22 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- SAT 23 MAY
(37, (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), '2026-05-23 10:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(39, (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), '2026-05-23 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(41, (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), '2026-05-23 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- SUN 24 MAY
(43, (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), '2026-05-24 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(45, (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), '2026-05-24 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- MON 25 MAY
(47, (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), '2026-05-25 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(49, (SELECT team_id FROM iihf2026.teams WHERE team_code='GER'), (SELECT team_id FROM iihf2026.teams WHERE team_code='GBR'), '2026-05-25 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
-- TUE 26 MAY
(51, (SELECT team_id FROM iihf2026.teams WHERE team_code='HUN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='LAT'), '2026-05-26 10:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(53, (SELECT team_id FROM iihf2026.teams WHERE team_code='USA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='AUT'), '2026-05-26 14:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),
(55, (SELECT team_id FROM iihf2026.teams WHERE team_code='SUI'), (SELECT team_id FROM iihf2026.teams WHERE team_code='FIN'), '2026-05-26 18:20:00', 'Swiss Life Arena, Zurich',   TRUE, 'GROUP_A', 'Skupinova faza - Skupina A'),

-- ============================================================
-- SKUPINOVA FAZA - SKUPINA B  (games 2-56, GROUP_B)
-- BCF Arena, Fribourg
-- ============================================================
-- FRI 15 MAY
(2,  (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), '2026-05-15 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(4,  (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), '2026-05-15 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- SAT 16 MAY
(6,  (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), '2026-05-16 10:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(8,  (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), '2026-05-16 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(10, (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), '2026-05-16 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- SUN 17 MAY
(12, (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), '2026-05-17 10:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(14, (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), '2026-05-17 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(16, (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), '2026-05-17 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- MON 18 MAY
(18, (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), '2026-05-18 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(20, (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), '2026-05-18 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- TUE 19 MAY
(22, (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), '2026-05-19 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(24, (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), '2026-05-19 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- WED 20 MAY
(26, (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), '2026-05-20 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(28, (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), '2026-05-20 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- THU 21 MAY
(30, (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), '2026-05-21 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(32, (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), '2026-05-21 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- FRI 22 MAY
(34, (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), '2026-05-22 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(36, (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), '2026-05-22 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- SAT 23 MAY
(38, (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), '2026-05-23 10:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(40, (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), '2026-05-23 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(42, (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), '2026-05-23 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- SUN 24 MAY
(44, (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), '2026-05-24 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(46, (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), '2026-05-24 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- MON 25 MAY
(48, (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), '2026-05-25 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(50, (SELECT team_id FROM iihf2026.teams WHERE team_code='SLO'), (SELECT team_id FROM iihf2026.teams WHERE team_code='ITA'), '2026-05-25 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
-- TUE 26 MAY
(52, (SELECT team_id FROM iihf2026.teams WHERE team_code='NOR'), (SELECT team_id FROM iihf2026.teams WHERE team_code='DEN'), '2026-05-26 10:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(54, (SELECT team_id FROM iihf2026.teams WHERE team_code='SWE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='SVK'), '2026-05-26 14:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),
(56, (SELECT team_id FROM iihf2026.teams WHERE team_code='CZE'), (SELECT team_id FROM iihf2026.teams WHERE team_code='CAN'), '2026-05-26 18:20:00', 'BCF Arena, Fribourg',        TRUE, 'GROUP_B', 'Skupinova faza - Skupina B'),

-- ============================================================
-- PLAY-OFF (games 57-64)
-- home/away_team_id = NULL (doplni admin po schvaleni tabulky)
-- tips_open = FALSE (otvori sa az po nastaveni parov)
-- ============================================================
-- THU 28 MAY - Stvrtfinale
(57, NULL, NULL, '2026-05-28 14:20:00', 'Swiss Life Arena, Zurich',   FALSE, 'QF', 'Stvrtfinale'),
(58, NULL, NULL, '2026-05-28 14:20:00', 'BCF Arena, Fribourg',        FALSE, 'QF', 'Stvrtfinale'),
(59, NULL, NULL, '2026-05-28 18:20:00', 'Swiss Life Arena, Zurich',   FALSE, 'QF', 'Stvrtfinale'),
(60, NULL, NULL, '2026-05-28 18:20:00', 'BCF Arena, Fribourg',        FALSE, 'QF', 'Stvrtfinale'),
-- SAT 30 MAY - Semifinale
(61, NULL, NULL, '2026-05-30 13:20:00', 'Swiss Life Arena, Zurich',   FALSE, 'SF', 'Semifinale'),
(62, NULL, NULL, '2026-05-30 18:00:00', 'Swiss Life Arena, Zurich',   FALSE, 'SF', 'Semifinale'),
-- SUN 31 MAY - O bronz + Finale
(63, NULL, NULL, '2026-05-31 13:30:00', 'Swiss Life Arena, Zurich',   FALSE, 'BM', 'O bronz'),
(64, NULL, NULL, '2026-05-31 18:20:00', 'Swiss Life Arena, Zurich',   FALSE, 'F',  'Finale');

-- ============================================================
-- VERZIA
-- ============================================================
INSERT INTO admin.schema_versions (version, description)
VALUES (2, 'iihf2026.games: naplnenie 64 zapasov podla IIHF2026.pdf');

