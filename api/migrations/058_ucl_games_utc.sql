-- Migration 058: oprava casu vykopu zapasov LM na UTC
--
-- start_time sa v celej aplikacii uklada ako naive UTC (rovnako ako FIFA a IIHF)
-- a rozhranie ho prepocitava na miestny cas pouzivatela.
--
-- Generator vsak zapisal 21:00 v zmysle miestneho casu. Ulozene ako UTC to znamena
-- vykop o 23:00 stredoeuropskeho casu, co je pre futbalovy zapas nezmysel.
-- Bezny vykop LM je 21:00 SELC = 19:00 UTC, preto sa casy posunu o 2 hodiny spat.
--
-- Posun sa tyka iba zapasov s povodnym casom 21:00 — rucne upravene zapasy
-- zostanu nedotknute.

BEGIN;

UPDATE "lm2026-27".games
   SET start_time = start_time - INTERVAL '2 hours',
       updated_at = NOW()
 WHERE start_time::time = TIME '21:00:00';

-- Kontrola: po oprave nesmie zostat ziadny zapas s povodnym casom 21:00.
DO $$
DECLARE zvysok INTEGER;
BEGIN
    SELECT COUNT(*) INTO zvysok
      FROM "lm2026-27".games
     WHERE start_time::time = TIME '21:00:00';
    IF zvysok > 0 THEN
        RAISE EXCEPTION 'Oprava zlyhala: % zapasov ma stale cas 21:00', zvysok;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (58, 'Oprava casu vykopu zapasov LM na 19:00 UTC (21:00 miestneho)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
