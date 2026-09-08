-- ============================================================
-- Migration 080: zhoda modelov na vysledku
--
-- Prvy ostry test odhalil, ze `passed` nestaci. Z 11 modelov, ktore test
-- presli, vratilo 6 ROZNYCH skore toho isteho zapasu:
--   6:0 (3 modely), 1:0 (2), 2:2 (2), 5:6 (2), 0:0 (1), 6:5 (1)
--
-- `passed` overuje len to, ci model vratil cisla — nie ci su spravne.
-- Na vyber livescore modelu to nestaci: model, ktory si vymysli skore,
-- je horsi nez ziadny.
--
-- Preto pribuda zhoda s vacsinou: po dobehnuti testu sa zisti najcastejsie
-- skore a modely sa oznacia podla toho, ci ho vratili. Nie je to dokaz
-- spravnosti, ale model osamote proti vacsine je podozrivy.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_model_test
    ADD COLUMN IF NOT EXISTS score_text VARCHAR(20);

-- TRUE = model vratil najcastejsie skore v ramci behu
-- NULL = zhoda sa este nevyhodnotila
ALTER TABLE admin.livescore_model_test
    ADD COLUMN IF NOT EXISTS agrees BOOLEAN;

-- Beh testu, aby sa modely dali porovnat medzi sebou. Doteraz sa zoskupovali
-- podla casu, co je krehke — dva behy tesne po sebe by splynuli.
ALTER TABLE admin.livescore_model_test
    ADD COLUMN IF NOT EXISTS run_id BIGINT;

CREATE INDEX IF NOT EXISTS livescore_model_test_run_idx
    ON admin.livescore_model_test (run_id);

-- Uspesnost v ciselniku sa po tejto zmene pocita z modelov, ktore nielen
-- odpovedali, ale aj sa zhodli s vacsinou.
ALTER TABLE admin.ai_models
    ADD COLUMN IF NOT EXISTS agree_rate NUMERIC(5,2);

COMMENT ON COLUMN admin.livescore_model_test.agrees IS
    'Vratil model najcastejsie skore v ramci behu? Osamoteny vysledok je podozrivy.';

INSERT INTO admin.schema_versions (version, description)
VALUES (80, 'Zhoda modelov na vysledku: score_text, agrees, run_id, agree_rate')
ON CONFLICT (version) DO NOTHING;

COMMIT;
