-- ============================================================
-- Migration 078: oprava start_time zapasov UCL 2026/27
--
-- PROBLEM
-- Importny skript (tools/import_ucl_league.cjs) prepocitaval miestny cas na
-- UTC opacnym smerom — offset odpocital namiesto pripocitania. Do DB sa tak
-- ulozil cas o 2 hodiny (letny cas) resp. 1 hodinu (zimny cas) mensi.
--
-- Prejav: hraci videli zaciatky zapasov o 2 hodiny skor
--         (napr. 16:45 namiesto 18:45).
--
-- STAV PRED OPRAVOU                    MA BYT (UTC)
--   sep-okt (CEST):  14:45 / 17:00       16:45 / 19:00
--   nov-mar (CET):   16:45 / 19:00       17:45 / 20:00
--
-- RIESENIE
-- K ulozenemu casu treba DST offset PRIPOCITAT:
--   'AT TIME ZONE UTC' oznaci hodnotu ako UTC (vznikne timestamptz),
--   'AT TIME ZONE Europe/Bratislava' ju prevedie na miestny cas.
-- Postgres pritom sam vyriesi leto/zimu — bez rucnej DST logiky, ktora
-- chybu sposobila.
--
-- Overene nasucho na produkcnych datach (BEGIN ... ROLLBACK): vsetkych 189
-- zapasov ma po oprave spravny cas, 30x 18:45 a 159x 21:00 miestneho casu.
--
-- Dotyka sa VYLUCNE stlpca start_time v jednej tabulke. Tipy, vysledky ani
-- nic ine sa nemeni.
-- ============================================================

BEGIN;

-- Poistka: keby sa migracia spustila druhy raz, casy by sa posunuli znova.
-- Prvy zapas ma po oprave zacinat 2026-09-08 16:45 UTC (18:45 SELC).
-- Ked uz opraveny je, cely blok sa preskoci.
DO $$
DECLARE
    prvy TIME;
    posunutych INT;
BEGIN
    SELECT MIN(start_time)::time INTO prvy FROM "lm2026-27".games;

    IF prvy = TIME '16:45' THEN
        RAISE NOTICE 'Casy su uz opravene (prvy zapas o %), migracia preskocena.', prvy;
        RETURN;
    END IF;

    IF prvy <> TIME '14:45' THEN
        RAISE EXCEPTION 'Neocakavany stav dat: prvy zapas zacina o %, cakalo sa 14:45 (pred opravou) alebo 16:45 (po oprave). Migracia zastavena.', prvy;
    END IF;

    -- Vlastna oprava: k ulozenemu casu sa pripocita DST offset.
    UPDATE "lm2026-27".games
       SET start_time = (start_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava';

    GET DIAGNOSTICS posunutych = ROW_COUNT;
    RAISE NOTICE 'Opravenych zapasov: %', posunutych;
END $$;

-- Kontrola vysledku: prvy zapas musi zacinat 16:45 UTC = 18:45 SELC.
DO $$
DECLARE
    prvy TIMESTAMP;
    sk   TEXT;
BEGIN
    SELECT MIN(start_time) INTO prvy FROM "lm2026-27".games;
    sk := to_char((prvy AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava', 'YYYY-MM-DD HH24:MI');

    IF prvy::time <> TIME '16:45' THEN
        RAISE EXCEPTION 'Kontrola zlyhala: prvy zapas je % UTC (v SK %), cakalo sa 16:45 UTC.', prvy, sk;
    END IF;
    RAISE NOTICE 'Kontrola OK: prvy zapas % UTC = % miestneho casu.', prvy, sk;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (78, 'Oprava start_time UCL 2026/27: import odpocital DST offset namiesto pripocitania')
ON CONFLICT (version) DO NOTHING;

COMMIT;
