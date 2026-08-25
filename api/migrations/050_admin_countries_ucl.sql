-- Migration 050: spolocny ciselnik statov v admin pre UCL
-- FIFA je primarny zdroj; doplnia sa chybajuce IIHF a UCL kody.

CREATE TABLE IF NOT EXISTS admin.countries (
    country_code  VARCHAR(3) PRIMARY KEY,
    name_sk       VARCHAR(100) NOT NULL,
    name_en       VARCHAR(100) NOT NULL,
    name_original VARCHAR(100),
    flag_file     VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT countries_code_format CHECK (country_code ~ '^[A-Z]{3}$')
);

-- FIFA: primarny zdroj nazvu a vlajok.
INSERT INTO admin.countries (country_code, name_sk, name_en, name_original, flag_file)
SELECT DISTINCT team_code, team_name, team_name, team_name,
       'fifa_flag_' || lower(team_code) || '.png'
FROM fifa2026.teams
WHERE team_code ~ '^[A-Z]{3}$'
ON CONFLICT (country_code) DO NOTHING;

-- IIHF: dopln iba kody, ktore FIFA nema.
INSERT INTO admin.countries (country_code, name_sk, name_en, name_original, flag_file)
SELECT DISTINCT code, name, name, name,
       'team_flag_' || lower(code) || '.png'
FROM iihf2026.teams
WHERE code ~ '^[A-Z]{3}$'
  AND NOT EXISTS (SELECT 1 FROM admin.countries c WHERE c.country_code = iihf2026.teams.code);

-- UCL: dopln kody potrebne pre kluby, ktore nie su vo FIFA/IIHF.
INSERT INTO admin.countries (country_code, name_sk, name_en, name_original, flag_file)
SELECT DISTINCT country_code, country_name, country_name, country_name, NULL
FROM "lm2026-27".countries u
WHERE country_code ~ '^[A-Z]{3}$'
  AND NOT EXISTS (SELECT 1 FROM admin.countries c WHERE c.country_code = u.country_code);

ALTER TABLE "lm2026-27".teams
    ADD CONSTRAINT ucl_teams_admin_country_code_fkey
    FOREIGN KEY (country_code) REFERENCES admin.countries(country_code)
    NOT VALID;

ALTER TABLE "lm2026-27".teams
    VALIDATE CONSTRAINT ucl_teams_admin_country_code_fkey;

GRANT USAGE ON SCHEMA admin TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin.countries TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (50, 'Spolocny ciselnik admin.countries pre UCL, zaklad FIFA + doplnene IIHF a UCL')
ON CONFLICT (version) DO NOTHING;
