-- Migration 029: FIFA games — flashscore_url stĺpec (parita s IIHF)
ALTER TABLE fifa2026.games
    ADD COLUMN IF NOT EXISTS flashscore_url VARCHAR(255);

INSERT INTO admin.schema_versions (version, description)
VALUES (29, 'FIFA games: flashscore_url')
ON CONFLICT (version) DO NOTHING;
