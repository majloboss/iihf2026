-- ============================================================
-- Migration 081: nazvy timov ako ukazovatel halucinacie
--
-- Test na zapase Pest Region - Federacion de Canarias odhalil, ze tri modely
-- vratili uplne vymyslene timy:
--   Pest Region (Am) - Federacion de Canarias   32x  (spravne)
--   Real Madrid - Arsenal                        2x  (vymyslene)
--   Real Madrid - Barcelona                      1x  (vymyslene)
--   Federacion de Canarias - "nazov hostujuceho timu alebo null"  1x
--
-- Vsetky styri mali success = TRUE, lebo test overoval len to, ci prisli
-- cisla. Model, ktory si vymysli timy, si vymyslel aj skore — a granite
-- bol medzi kandidatmi na produkciu.
--
-- Nazvy timov su lepsi ukazovatel nez samotne skore: skore sa moze zhodovat
-- nahodou (0:0 je bezne), nazvy timov nie.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_model_test
    ADD COLUMN IF NOT EXISTS teams_text VARCHAR(120);

-- Zhoda na nazvoch timov, vyhodnocuje sa rovnako ako zhoda na skore
ALTER TABLE admin.livescore_model_test
    ADD COLUMN IF NOT EXISTS teams_agree BOOLEAN;

COMMENT ON COLUMN admin.livescore_model_test.teams_text IS
    'Nazvy timov, ktore model vratil. Rozpor s vacsinou = halucinacia.';

INSERT INTO admin.schema_versions (version, description)
VALUES (81, 'Nazvy timov v teste modelov - odhalenie halucinacii')
ON CONFLICT (version) DO NOTHING;

COMMIT;
