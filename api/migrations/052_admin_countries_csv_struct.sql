-- Migration 052: rozsirenie admin.countries o strukturu zo zdrojoveho CSV statov
-- CSV: id;state_code_2;state_code_3;state_name_origin;state_name_english;
--      state_name_slovak;state_name_slovak_long;state_flag_big;state_flag_small;flag_check
-- country_code (alpha-3) zostava primarnym klucom, aby existujuce FK na tímy platili.

ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS source_id     INTEGER;
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS country_code2 VARCHAR(2);
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS name_sk_long  VARCHAR(150);
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS flag_file_big VARCHAR(255);
ALTER TABLE admin.countries ADD COLUMN IF NOT EXISTS flag_check    VARCHAR(50);

-- flag_file je od teraz mala vlajka; velka je flag_file_big.
COMMENT ON COLUMN admin.countries.flag_file     IS 'Mala vlajka, nazov suboru v /flags/';
COMMENT ON COLUMN admin.countries.flag_file_big IS 'Velka vlajka, nazov suboru v /flags/';
COMMENT ON COLUMN admin.countries.source_id     IS 'id zo zdrojoveho CSV statov';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'countries_code2_format') THEN
        ALTER TABLE admin.countries ADD CONSTRAINT countries_code2_format
            CHECK (country_code2 IS NULL OR country_code2 ~ '^[A-Z]{2}$');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS countries_code2_uniq
    ON admin.countries (country_code2) WHERE country_code2 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS countries_source_id_uniq
    ON admin.countries (source_id) WHERE source_id IS NOT NULL;

INSERT INTO admin.schema_versions (version, description)
VALUES (52, 'admin.countries rozsirene o code2, dlhy SK nazov, velku vlajku a source_id')
ON CONFLICT (version) DO NOTHING;
