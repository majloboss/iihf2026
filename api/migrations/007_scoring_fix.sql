-- Migration 007: oprava bodovacieho systemu
-- Vitaz/remiza: skupinova=3b, playoff=5b
-- Goly domaci/hostia: 1b (obe fazy)
-- pts_exact = 0 vsade (nepouziva sa)
UPDATE iihf2026.scoring_config SET pts_winner = 3, pts_exact = 0 WHERE phase IN ('A', 'B');
UPDATE iihf2026.scoring_config SET pts_winner = 5, pts_exact = 0 WHERE phase IN ('QF', 'SF', 'BRONZE', 'GOLD');
