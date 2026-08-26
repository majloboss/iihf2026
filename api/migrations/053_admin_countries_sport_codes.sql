-- Migration 053: sportove kody a uvolnenie formatu kodu statu
--
-- Ciselnik statov je od teraz ISO 3166 (alpha-3, pri britskych krajinach ISO 3166-2).
-- Sportove kody sa lisia od ISO a navzajom aj medzi sutazami, preto ma kazda sutaz
-- vlastny stlpec. Aplikacia si pri kazdom sporte povie, ktory kod ma zobrazovat.
--
-- Zname konflikty medzi sutazami:
--   Slovinsko  IIHF SLO  vs  UEFA SVN
--   Lotyssko   IIHF LAT  vs  UEFA LVA
--   UK         IIHF GBR (jeden tim)  vs  FIFA/UEFA ENG, SCO, WAL, NIR (styri timy)

ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS sport_code_fifa VARCHAR(6);
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS sport_code_iihf VARCHAR(6);
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS sport_code_uefa VARCHAR(6);

COMMENT ON COLUMN admin.countries.sport_code_fifa IS 'Kod pouzivany FIFA, napr. GER, NED, KSA';
COMMENT ON COLUMN admin.countries.sport_code_iihf IS 'Kod pouzivany IIHF, napr. GER, SLO, LAT, GBR';
COMMENT ON COLUMN admin.countries.sport_code_uefa IS 'Kod pouzivany UEFA, napr. GER, NED, SVN, LVA';

-- ISO 3166-2 kody britskych krajin (GB-ENG) sa nezmestia do povodneho formatu.
ALTER TABLE admin.countries ALTER COLUMN country_code  TYPE VARCHAR(6);
ALTER TABLE admin.countries ALTER COLUMN country_code2 TYPE VARCHAR(6);

-- FK stlpce musia mat rovnaky typ ako referencovany kluc.
ALTER TABLE "lm2026-27".teams ALTER COLUMN country_code TYPE VARCHAR(6);

ALTER TABLE admin.countries DROP CONSTRAINT IF EXISTS countries_code_format;
ALTER TABLE admin.countries ADD  CONSTRAINT countries_code_format
    CHECK (country_code ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$');

ALTER TABLE admin.countries DROP CONSTRAINT IF EXISTS countries_code2_format;
ALTER TABLE admin.countries ADD  CONSTRAINT countries_code2_format
    CHECK (country_code2 IS NULL OR country_code2 ~ '^[A-Z]{2,3}(-[A-Z]{2,3})?$');

-- Sportovy kod smie patrit najviac jednemu statu.
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_fifa_uniq
    ON admin.countries (sport_code_fifa) WHERE sport_code_fifa IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_iihf_uniq
    ON admin.countries (sport_code_iihf) WHERE sport_code_iihf IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS countries_sport_uefa_uniq
    ON admin.countries (sport_code_uefa) WHERE sport_code_uefa IS NOT NULL;

-- Vyhladavanie statu podla lubovolneho sportoveho kodu.
CREATE INDEX IF NOT EXISTS countries_sport_codes_idx
    ON admin.countries (sport_code_fifa, sport_code_iihf, sport_code_uefa);

INSERT INTO admin.schema_versions (version, description)
VALUES (53, 'admin.countries: sportove kody FIFA/IIHF/UEFA a uvolneny format country_code')
ON CONFLICT (version) DO NOTHING;
