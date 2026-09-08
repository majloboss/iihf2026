-- ============================================================
-- Migration 086: vysledky volania a rozlisenie stavu
--
-- V detaile volania nebolo vidno, co model vratil — skore islo rovno do
-- tabulky games a v logu zostali len tokeny. Ukladame preto kratky prehlad
-- vysledkov, aby sa dalo spatne overit, co ktore volanie hlasilo.
--
-- Zaroven sa rozlisi, preco volanie neprinieslo vysledok: iny je model, ktory
-- zlyhal, a iny stav "zapasy este nezacali" — v prehlade to nesmie vyzerat
-- rovnako ako chyba.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS vysledky TEXT,   -- "AEK 1:0 LASK · Brugge 1:3 Villa"
    ADD COLUMN IF NOT EXISTS stav     TEXT;   -- ok | chyba | nehra_sa | ciastocne

COMMENT ON COLUMN admin.livescore_log.vysledky IS
    'Co volanie vratilo — na spatne overenie, bez nutnosti citat raw odpoved';
COMMENT ON COLUMN admin.livescore_log.stav IS
    'ok = vratilo skore, nehra_sa = zapasy este nezacali, chyba = zlyhanie modelu';

INSERT INTO admin.schema_versions (version, description)
VALUES (86, 'Vysledky volania a rozlisenie stavu v livescore_log')
ON CONFLICT (version) DO NOTHING;

COMMIT;
