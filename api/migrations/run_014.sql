-- Migration 014: flashscore_url pre zapasy
ALTER TABLE iihf2026.games ADD COLUMN IF NOT EXISTS flashscore_url VARCHAR(500);
