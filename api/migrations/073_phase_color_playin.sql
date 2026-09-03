-- Migration 073: farba PLAYIN pre baráž
--
-- Baráž o postup do play-off zdieľala farbu so zápasom o 3. miesto (BRONZE),
-- hoci sú to úplne rozdielne veci — baráž rozhoduje o postupe, bronz o medaile.
-- Pribúda preto vlastná farba PLAYIN (fialová), ktorá sa odlišuje od modrej
-- (skupiny) aj zelenej (play-off).
--
-- BRONZE zostáva pre zápasy o 3. miesto v IIHF a FIFA.

BEGIN;

-- CHECK sa nedá rozšíriť, musí sa nahradiť.
ALTER TABLE admin.competition_phases DROP CONSTRAINT IF EXISTS phases_color_chk;
ALTER TABLE admin.competition_phases
    ADD CONSTRAINT phases_color_chk CHECK (
        color_code IN ('GROUP','PLAYOFF','PLAYIN','BRONZE','GOLD','NEUTRAL'));

-- Baráž má dnes BRONZE; presúva sa na novú farbu. Kód fázy sa medzitým mohol
-- v admine zmeniť (PO → BAR), preto sa hľadá podľa názvu.
-- Prefarbenie baráže sa tu uz nerobi — 076 zapisuje farby rovno spravne.
-- Zostava len rozsirenie povolenych hodnot o PLAYIN.

INSERT INTO admin.schema_versions (version, description) VALUES
    (73, 'Farba PLAYIN pre baraz')
    ON CONFLICT DO NOTHING;

COMMIT;
