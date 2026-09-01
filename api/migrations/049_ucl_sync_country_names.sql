-- Migration 049: zosynchronizovanie nazvov statov v UCL kluboch
-- Kompatibilita so starsim country_name stlpcom v teams.

UPDATE "lm2026-27".teams t
SET country_name = c.country_name
FROM "lm2026-27".countries c
WHERE c.country_code = t.country_code;

INSERT INTO admin.schema_versions (version, description)
VALUES (49, 'UCL synchronizacia nazvov statov v klubovom ciselniku')
ON CONFLICT (version) DO NOTHING;
