-- Migration 034: FIFA živé skóre (manuálne zadávané adminom) — parita s IIHF
ALTER TABLE fifa2026.games
    ADD COLUMN IF NOT EXISTS ls_home       INT,
    ADD COLUMN IF NOT EXISTS ls_away       INT,
    ADD COLUMN IF NOT EXISTS ls_status     VARCHAR(10),
    ADD COLUMN IF NOT EXISTS ls_updated_at TIMESTAMP;

INSERT INTO admin.schema_versions (version, description)
VALUES (34, 'FIFA: ls_home/ls_away/ls_status/ls_updated_at (zive skore)')
ON CONFLICT (version) DO NOTHING;
