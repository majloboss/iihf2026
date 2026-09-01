-- Migration 048: UCL ciselnik statov
-- Stat je samostatny ciselnik a kluby na neho odkazuju cez country_code.

CREATE TABLE IF NOT EXISTS "lm2026-27".countries (
    country_code VARCHAR(3) PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL
);

INSERT INTO "lm2026-27".countries (country_code, country_name)
SELECT DISTINCT country_code, country_name
FROM "lm2026-27".teams
WHERE country_code IS NOT NULL AND country_code <> ''
ON CONFLICT (country_code) DO UPDATE SET country_name = EXCLUDED.country_name;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ucl_teams_country_code_fkey'
          AND conrelid = '"lm2026-27".teams'::regclass
    ) THEN
        ALTER TABLE "lm2026-27".teams
            ADD CONSTRAINT ucl_teams_country_code_fkey
            FOREIGN KEY (country_code) REFERENCES "lm2026-27".countries(country_code)
            NOT VALID;
    END IF;
END $$;

ALTER TABLE "lm2026-27".teams
    VALIDATE CONSTRAINT ucl_teams_country_code_fkey;

UPDATE "lm2026-27".teams t
SET country_name = c.country_name
FROM "lm2026-27".countries c
WHERE c.country_code = t.country_code;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "lm2026-27".countries TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (48, 'UCL ciselnik statov a vazba klubov na country_code')
ON CONFLICT (version) DO NOTHING;
