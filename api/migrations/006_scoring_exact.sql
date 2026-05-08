-- Migration 006: nový bodovací systém — presný výsledok ako samostatná kategória
-- Skupinová fáza: presný tip = 3 body (1+1+1, pts_exact=0 — bez extra bonusu)
-- Play-off: presný tip = 5 bodov (1+1+1+2, pts_exact=2 — bonus na vrch čiastkových bodov)
-- Zmena: pts_winner play-off: 3 → 1 (víťaz má rovnakú hodnotu vo všetkých fázach)

ALTER TABLE iihf2026.scoring_config ADD COLUMN pts_exact SMALLINT NOT NULL DEFAULT 0;

UPDATE iihf2026.scoring_config SET pts_winner = 1 WHERE phase IN ('QF', 'SF', 'BRONZE', 'GOLD');
UPDATE iihf2026.scoring_config SET pts_exact  = 2 WHERE phase IN ('QF', 'SF', 'BRONZE', 'GOLD');
