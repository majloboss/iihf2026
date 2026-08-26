-- Migration 055: prestavba admin.countries do logickeho poradia stlpcov
--
-- Poradie stlpcov bolo dane historiou migracii (050 -> 052 -> 053), nie logikou:
-- country_code2 az za updated_at, flag_file daleko od flag_file_big a pod.
-- Postgres nevie poradie existujucich stlpcov zmenit, preto sa tabulka prestavia
-- cez docasnu kopiu.
--
-- Nove poradie: identifikatory -> kody -> nazvy -> vlajky -> metadata.
-- Nazvy stlpcov, typy ani obmedzenia sa nemenia, iba poradie.
--
-- Cela migracia bezi v jednej transakcii: pri chybe sa nic nezmeni.

BEGIN;

-- 1. Odpojit UCL kluby, inak sa stara tabulka neda zahodit.
ALTER TABLE "lm2026-27".teams DROP CONSTRAINT IF EXISTS ucl_teams_admin_country_code_fkey;

-- 2. Nova tabulka v spravnom poradi.
CREATE TABLE admin.countries_new (
    source_id       INTEGER,
    country_code    VARCHAR(6)   NOT NULL,
    country_code2   VARCHAR(6),
    sport_code_fifa VARCHAR(6),
    sport_code_iihf VARCHAR(6),
    sport_code_uefa VARCHAR(6),
    name_sk         VARCHAR(100) NOT NULL,
    name_sk_long    VARCHAR(150),
    name_en         VARCHAR(100) NOT NULL,
    name_original   VARCHAR(100),
    flag_file       VARCHAR(255),
    flag_file_big   VARCHAR(255),
    flag_check      VARCHAR(50),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),

    -- Nazvy obmedzeni su v ramci schemy unikatne, a stara tabulka ich este drzi.
    -- Preto docasne nazvy; po zahodeni starej tabulky sa premenuju na cielove.
    CONSTRAINT countries_new_pkey PRIMARY KEY (country_code),
    CONSTRAINT countries_new_code_format
        CHECK (country_code ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$'),
    CONSTRAINT countries_new_code2_format
        CHECK (country_code2 IS NULL OR country_code2 ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$')
);

-- 3. Prekopirovat vsetky data.
INSERT INTO admin.countries_new (
    source_id, country_code, country_code2,
    sport_code_fifa, sport_code_iihf, sport_code_uefa,
    name_sk, name_sk_long, name_en, name_original,
    flag_file, flag_file_big, flag_check,
    is_active, created_at, updated_at
)
SELECT
    source_id, country_code, country_code2,
    sport_code_fifa, sport_code_iihf, sport_code_uefa,
    name_sk, name_sk_long, name_en, name_original,
    flag_file, flag_file_big, flag_check,
    is_active, created_at, updated_at
FROM admin.countries;

-- 4. Overit, ze sa neztratil ziadny riadok.
DO $$
DECLARE old_count INTEGER; new_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_count FROM admin.countries;
    SELECT COUNT(*) INTO new_count FROM admin.countries_new;
    IF old_count <> new_count THEN
        RAISE EXCEPTION 'Prestavba zrusena: povodne % riadkov, nove %', old_count, new_count;
    END IF;
END $$;

-- 5. Vymenit tabulky.
DROP TABLE admin.countries;
ALTER TABLE admin.countries_new RENAME TO countries;

-- 5b. Premenovat obmedzenia z docasnych nazvov na cielove.
ALTER TABLE admin.countries RENAME CONSTRAINT countries_new_pkey         TO countries_pkey;
ALTER TABLE admin.countries RENAME CONSTRAINT countries_new_code_format  TO countries_code_format;
ALTER TABLE admin.countries RENAME CONSTRAINT countries_new_code2_format TO countries_code2_format;

-- 6. Obnovit indexy (nazvy zostavaju rovnake ako pred prestavbou).
CREATE UNIQUE INDEX countries_code2_uniq
    ON admin.countries (country_code2) WHERE country_code2 IS NOT NULL;
CREATE UNIQUE INDEX countries_source_id_uniq
    ON admin.countries (source_id) WHERE source_id IS NOT NULL;
CREATE UNIQUE INDEX countries_sport_fifa_uniq
    ON admin.countries (sport_code_fifa) WHERE sport_code_fifa IS NOT NULL;
CREATE UNIQUE INDEX countries_sport_iihf_uniq
    ON admin.countries (sport_code_iihf) WHERE sport_code_iihf IS NOT NULL;
CREATE UNIQUE INDEX countries_sport_uefa_uniq
    ON admin.countries (sport_code_uefa) WHERE sport_code_uefa IS NOT NULL;
CREATE INDEX countries_sport_codes_idx
    ON admin.countries (sport_code_fifa, sport_code_iihf, sport_code_uefa);

-- 7. Obnovit komentare stlpcov.
COMMENT ON COLUMN admin.countries.source_id       IS 'id zo zdrojoveho CSV statov';
COMMENT ON COLUMN admin.countries.flag_file       IS 'Mala vlajka, nazov suboru v /flags/';
COMMENT ON COLUMN admin.countries.flag_file_big   IS 'Velka vlajka, nazov suboru v /flags/';
COMMENT ON COLUMN admin.countries.sport_code_fifa IS 'Kod pouzivany FIFA, napr. GER, NED, KSA';
COMMENT ON COLUMN admin.countries.sport_code_iihf IS 'Kod pouzivany IIHF, napr. GER, SLO, LAT, GBR';
COMMENT ON COLUMN admin.countries.sport_code_uefa IS 'Kod pouzivany UEFA, napr. GER, NED, SVN, LVA';

-- 8. Obnovit granty.
GRANT USAGE ON SCHEMA admin TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin.countries TO "dbbet-admin";

-- 9. Znova napojit UCL kluby.
ALTER TABLE "lm2026-27".teams
    ADD CONSTRAINT ucl_teams_admin_country_code_fkey
    FOREIGN KEY (country_code) REFERENCES admin.countries(country_code);

-- 10. Overit, ze kazdy klub ma platny kod statu.
DO $$
DECLARE bad_count INTEGER; bad_list TEXT;
BEGIN
    SELECT COUNT(*), string_agg(DISTINCT t.country_code, ', ')
      INTO bad_count, bad_list
      FROM "lm2026-27".teams t
     WHERE t.country_code IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM admin.countries c WHERE c.country_code = t.country_code);
    IF bad_count > 0 THEN
        RAISE EXCEPTION 'Prestavba zrusena: % klubov ma neplatny kod statu (%)', bad_count, bad_list;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (55, 'Prestavba admin.countries do logickeho poradia stlpcov')
ON CONFLICT (version) DO NOTHING;

COMMIT;
