-- ============================================================
-- Migration 087: vysledky volania po zapasoch
--
-- Vysledky sa ukladali ako jeden retazec za cele volanie, takze v detaile
-- konkretneho zapasu sa zobrazili aj vsetky ostatne. Rozdelit sa spatne nedaju:
-- nazvy timov z modelu nemusia sediet s nazvami v ciselniku.
--
-- Ukladame preto JSON kluceny podla game_id — v detaile sa vyberie len ta
-- polozka, ktora patri danemu zapasu.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS vysledky_json JSONB;

COMMENT ON COLUMN admin.livescore_log.vysledky_json IS
    'Co volanie vratilo, kluceny podla game_id: {"1": {"skore": "2:0", ...}}';

INSERT INTO admin.schema_versions (version, description)
VALUES (87, 'Vysledky volania kluceny podla zapasu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
