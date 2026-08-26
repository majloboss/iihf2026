-- Migration 058: oprava casu zapasov LM na UTC
--
-- start_time sa v celej aplikacii uklada ako naive UTC (rovnako ako FIFA a IIHF)
-- a frontend ho tak aj cita (new Date(start_time + 'Z')).
--
-- Generator vsak zapisal 21:00 v zmysle miestneho casu, co sa cita ako 23:00 CEST.
-- Vykop 21:00 stredoeurospkeho casu je 19:00 UTC, preto sa casy posunu o 2 hodiny.
--
-- Posun sa tyka iba zapasov, ktore este maju povodny cas 21:00 — rucne upravene
-- zapasy zostanu nedotknute.

BEGIN;

UPDATE "lm2026-27".games
   SET start_time = start_time - INTERVAL '2 hours',
       updated_at = NOW()
 WHERE start_time::time = TIME '21:00:00';

-- Kontrola: po oprave nesmie zostat ziadny zapas s casom 21:00.
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
VALUES (58, 'Oprava casu zapasov LM z miestneho na UTC (posun o 2 hodiny)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
