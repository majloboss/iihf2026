-- Migration 010: konečné skóre zápasu (po predĺžení/nájazdoch)
ALTER TABLE iihf2026.games ADD COLUMN IF NOT EXISTS final1 INT;
ALTER TABLE iihf2026.games ADD COLUMN IF NOT EXISTS final2 INT;
