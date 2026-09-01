-- Migration 045: UCL klubovy ciselnik
-- Rozsiruje timy o udaje editovatelne adminom.

ALTER TABLE "lm2026-27".teams
    ALTER COLUMN team_code TYPE VARCHAR(20),
    ADD COLUMN IF NOT EXISTS country_code VARCHAR(3),
    ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS logo_file VARCHAR(255);

INSERT INTO admin.schema_versions (version, description)
VALUES (45, 'UCL klubovy ciselnik: presny nazov klubu, stat, kod statu a logo')
ON CONFLICT (version) DO NOTHING;
