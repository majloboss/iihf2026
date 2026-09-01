-- Migration 056: presun klubov UEFA do trvaleho ciselnika admin.uefa_clubs
--
-- Kluby nie su viazane na jeden rocnik: klub, ktory sa tento rok nekvalifikoval,
-- v ciselniku zostava a o rok sa moze vratit. Preto patria do schemy admin,
-- nie do rocnikovej "lm2026-27".
--
-- Namiesto mazania sa pouziva is_active: klub s historiou zapasov sa nesmie
-- fyzicky zmazat, iba deaktivovat.
--
-- Rocnikove schemy sa na ciselnik odkazuju cez club_id.
-- "lm2026-27".games si zachova svoje FK, len uz na novu tabulku.
--
-- Cela migracia bezi v jednej transakcii: pri chybe sa nic nezmeni.

BEGIN;

-- 1. Trvaly ciselnik klubov.
CREATE TABLE IF NOT EXISTS admin.uefa_clubs (
    club_id      SERIAL PRIMARY KEY,
    club_code    VARCHAR(20)  NOT NULL UNIQUE,
    club_name    VARCHAR(100) NOT NULL,
    country_code VARCHAR(6)   REFERENCES admin.countries(country_code),
    logo_file    VARCHAR(255),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uefa_clubs_code_format CHECK (club_code ~ '^[A-Z0-9_-]{2,20}$')
);

COMMENT ON TABLE  admin.uefa_clubs           IS 'Trvaly ciselnik klubov UEFA naprieč rocnikmi';
COMMENT ON COLUMN admin.uefa_clubs.is_active IS 'Neaktivny klub zostava v ciselniku, iba sa neponuka pri zadavani';

CREATE INDEX IF NOT EXISTS uefa_clubs_country_idx ON admin.uefa_clubs (country_code);
CREATE INDEX IF NOT EXISTS uefa_clubs_active_idx  ON admin.uefa_clubs (is_active) WHERE is_active;

-- 2. Prekopirovat kluby a zachovat povodne team_id ako club_id,
--    aby existujuce odkazy v games nadalej sedeli.
INSERT INTO admin.uefa_clubs (club_id, club_code, club_name, country_code, logo_file)
SELECT team_id, team_code, team_name, country_code, logo_file
FROM "lm2026-27".teams
ON CONFLICT (club_id) DO NOTHING;

-- Posunut sekvenciu za najvyssie prevzate id.
SELECT setval('admin.uefa_clubs_club_id_seq',
              COALESCE((SELECT MAX(club_id) FROM admin.uefa_clubs), 1),
              TRUE);

-- 3. Overit, ze sa prekopirovali vsetky kluby.
DO $$
DECLARE old_count INTEGER; new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM "lm2026-27".teams;
    SELECT COUNT(*) INTO new_count FROM admin.uefa_clubs;
    IF old_count <> new_count THEN
        RAISE EXCEPTION 'Presun zruseny: povodne % klubov, novych %', old_count, new_count;
    END IF;
END $$;

-- 4. Prepojit zapasy na novy ciselnik.
ALTER TABLE "lm2026-27".games DROP CONSTRAINT IF EXISTS games_home_team_id_fkey;
ALTER TABLE "lm2026-27".games DROP CONSTRAINT IF EXISTS games_away_team_id_fkey;

ALTER TABLE "lm2026-27".games
    ADD CONSTRAINT games_home_team_id_fkey
    FOREIGN KEY (home_team_id) REFERENCES admin.uefa_clubs(club_id);
ALTER TABLE "lm2026-27".games
    ADD CONSTRAINT games_away_team_id_fkey
    FOREIGN KEY (away_team_id) REFERENCES admin.uefa_clubs(club_id);

-- 5. Stara tabulka klubov uz nie je potrebna.
DROP TABLE "lm2026-27".teams;

-- 6. Granty.
GRANT USAGE ON SCHEMA admin TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin.uefa_clubs TO "dbbet-admin";
GRANT USAGE, SELECT ON SEQUENCE admin.uefa_clubs_club_id_seq TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (56, 'Trvaly ciselnik admin.uefa_clubs, presun klubov z lm2026-27 a priznak is_active')
ON CONFLICT (version) DO NOTHING;

COMMIT;
