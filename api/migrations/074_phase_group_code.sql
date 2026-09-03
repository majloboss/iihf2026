-- Migration 074: zoskupovanie fáz vo filtroch
--
-- Filtre nad zápasmi majú dnes zbaľovanie napevno v kóde: FIFA schová dvanásť
-- skupín za tlačidlo GRP, IIHF nezbaľuje nič. Pri ďalšej súťaži by sa to muselo
-- dopisovať znova.
--
-- `group_code` presúva rozhodnutie do číselníka: fázy s rovnakou hodnotou sa
-- schovajú za jedno tlačidlo a rozbalia sa až po kliknutí. Prázdna hodnota
-- znamená, že fáza stojí vo filtri samostatne.
--
-- Pozor, netýka sa to filtra KLUBY v UCL — ten filtruje podľa klubu, nie podľa
-- fázy, a s týmto číselníkom nesúvisí.

BEGIN;

ALTER TABLE admin.competition_phases
    ADD COLUMN IF NOT EXISTS group_code VARCHAR(20);

COMMENT ON COLUMN admin.competition_phases.group_code IS
    'Fázy s rovnakou hodnotou sa vo filtri zbalia za jedno tlačidlo; NULL = samostatne';

-- Hodnoty `group_code` sa tu uz nenastavuju — vklada ich 076, kde su aj
-- rucne opravy z admina. Tu zostava len pridanie stlpca.

INSERT INTO admin.schema_versions (version, description) VALUES
    (74, 'Zoskupovanie faz vo filtroch (group_code)')
    ON CONFLICT DO NOTHING;

COMMIT;
