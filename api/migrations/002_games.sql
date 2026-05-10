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

-- ============================================================
-- FLASHSCORE URLs (vyzaduje run_014.sql - stlpec flashscore_url)
-- Zdroj: https://www.flashscore.sk/hokej/svet/majstrovstva-sveta/program/
-- Slugy: abecedne podla slovenskeho nazvu timu
-- Play-off (57-64): doplnit manualne po zostaveni parov
-- ============================================================
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/nemecko-vgQVYBeh/'        WHERE game_number = 1;  -- FIN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/svedsko-vBLjQRXp/'        WHERE game_number = 2;  -- CAN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/usa-GYgp4SO3/'       WHERE game_number = 3;  -- SUI vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/dansko-2mX8FleU/'          WHERE game_number = 4;  -- CZE vs DEN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/velka-britania-C2UJnT9A/' WHERE game_number = 5;  -- AUT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovensko-ruzLVmAN/'      WHERE game_number = 6;  -- NOR vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/madarsko-fBiWomPG/'       WHERE game_number = 7;  -- FIN vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/taliansko-IqPZXVAb/'      WHERE game_number = 8;  -- CAN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/svajciarsko-buO3jBAo/' WHERE game_number = 9;  -- LAT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovinsko-x2ZOU7PT/'       WHERE game_number = 10; -- CZE vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/usa-GYgp4SO3/velka-britania-C2UJnT9A/'    WHERE game_number = 11; -- USA vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/taliansko-IqPZXVAb/'   WHERE game_number = 12; -- SVK vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/rakusko-xWM7kVPi/'      WHERE game_number = 13; -- HUN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/svedsko-vBLjQRXp/'        WHERE game_number = 14; -- DEN vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/nemecko-vgQVYBeh/'      WHERE game_number = 15; -- LAT vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovinsko-x2ZOU7PT/'      WHERE game_number = 16; -- NOR vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/usa-GYgp4SO3/'            WHERE game_number = 17; -- FIN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/kanada-dSsR389c/'         WHERE game_number = 18; -- DEN vs CAN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/svajciarsko-buO3jBAo/'   WHERE game_number = 19; -- GER vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/svedsko-vBLjQRXp/'         WHERE game_number = 20; -- CZE vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/rakusko-xWM7kVPi/'     WHERE game_number = 21; -- LAT vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/taliansko-IqPZXVAb/'      WHERE game_number = 22; -- NOR vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/velka-britania-C2UJnT9A/' WHERE game_number = 23; -- HUN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/slovinsko-x2ZOU7PT/'   WHERE game_number = 24; -- SVK vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/svajciarsko-buO3jBAo/'  WHERE game_number = 25; -- AUT vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/taliansko-IqPZXVAb/'       WHERE game_number = 26; -- CZE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/usa-GYgp4SO3/'           WHERE game_number = 27; -- GER vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/svedsko-vBLjQRXp/'    WHERE game_number = 28; -- SLO vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/lotyssko-44JaYkQ4/'       WHERE game_number = 29; -- FIN vs LAT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/norsko-nDtCX9uB/'         WHERE game_number = 30; -- CAN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/velka-britania-C2UJnT9A/' WHERE game_number = 31; -- SUI vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovensko-ruzLVmAN/'      WHERE game_number = 32; -- DEN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/nemecko-vgQVYBeh/'      WHERE game_number = 33; -- HUN vs GER
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovinsko-x2ZOU7PT/'      WHERE game_number = 34; -- CAN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/velka-britania-C2UJnT9A/' WHERE game_number = 35; -- FIN vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/svedsko-vBLjQRXp/taliansko-IqPZXVAb/'    WHERE game_number = 36; -- SWE vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/usa-GYgp4SO3/'          WHERE game_number = 37; -- LAT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovinsko-x2ZOU7PT/'      WHERE game_number = 38; -- DEN vs SLO
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/svajciarsko-buO3jBAo/' WHERE game_number = 39; -- HUN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovensko-ruzLVmAN/'       WHERE game_number = 40; -- CZE vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/rakusko-xWM7kVPi/'       WHERE game_number = 41; -- GER vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/svedsko-vBLjQRXp/'        WHERE game_number = 42; -- NOR vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/velka-britania-C2UJnT9A/' WHERE game_number = 43; -- LAT vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/taliansko-IqPZXVAb/'      WHERE game_number = 44; -- DEN vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/rakusko-xWM7kVPi/'        WHERE game_number = 45; -- FIN vs AUT
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovensko-ruzLVmAN/'      WHERE game_number = 46; -- CAN vs SVK
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/usa-GYgp4SO3/'          WHERE game_number = 47; -- HUN vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/norsko-nDtCX9uB/'          WHERE game_number = 48; -- CZE vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/velka-britania-C2UJnT9A/' WHERE game_number = 49; -- GER vs GBR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/taliansko-IqPZXVAb/'  WHERE game_number = 50; -- SLO vs ITA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/madarsko-fBiWomPG/'    WHERE game_number = 51; -- LAT vs HUN
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/norsko-nDtCX9uB/'         WHERE game_number = 52; -- DEN vs NOR
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/usa-GYgp4SO3/'           WHERE game_number = 53; -- AUT vs USA
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/svedsko-vBLjQRXp/'    WHERE game_number = 54; -- SVK vs SWE
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/svajciarsko-buO3jBAo/'   WHERE game_number = 55; -- FIN vs SUI
UPDATE iihf2026.games SET flashscore_url = 'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/kanada-dSsR389c/'          WHERE game_number = 56; -- CZE vs CAN
