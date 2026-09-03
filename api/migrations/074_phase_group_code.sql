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

-- FIFA: dvanásť skupín sa do riadku nezmestí, preto sa zbalia.
UPDATE admin.competition_phases
   SET group_code = 'GRP', updated_at = NOW()
 WHERE competition_id = 2
   AND (phase_name ILIKE 'skupina%' OR match_stat_desc ILIKE 'skupina%');

-- UCL: osem kôl ligovej fázy sa zbalí rovnako, nech filter zostane v riadku.
UPDATE admin.competition_phases
   SET group_code = 'LF', updated_at = NOW()
 WHERE competition_id = 3
   AND (phase_name ILIKE 'ligová fáza%' OR match_stat_desc ILIKE 'ligová fáza%');

INSERT INTO admin.schema_versions (version, description) VALUES
    (74, 'Zoskupovanie faz vo filtroch (group_code)')
    ON CONFLICT DO NOTHING;

COMMIT;
