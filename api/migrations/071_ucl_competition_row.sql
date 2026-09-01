-- Migration 071: zaradenie sutaze UCL 2026/27 medzi sutaze
--
-- Migracia 070 preniesla schemu a ciselniky, ale nie riadok v
-- admin.competitions. Bez neho sa sutaz v aplikacii vobec neobjavi: prepinac
-- sutazi cita prave tuto tabulku a vsetky UCL obrazovky sa vyberaju podla
-- slug 'ucl2026'.
--
-- Tabulka competitions nebola sucastou 070 preto, ze na produkcii uz existuje
-- a generator prenasal iba tabulky, ktore tam chybali.
--
-- Spustat po migracii 070.

BEGIN;

-- id sa necha na databaze; aplikacia sa riadi slugom, nie cislom.
INSERT INTO admin.competitions (slug, name, sport, season, is_active, starts_at, ends_at)
VALUES ('ucl2026', 'UEFA Champions League 2026/27', 'football', '2026/27', TRUE,
        '2026-09-08 00:00:00', '2027-05-29 00:00:00')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO admin.schema_versions (version, description) VALUES
    (71, 'UCL 2026/27 - zaradenie sutaze medzi sutaze')
    ON CONFLICT DO NOTHING;

COMMIT;
