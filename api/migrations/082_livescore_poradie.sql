-- ============================================================
-- Migration 082: poradie nahradnych modelov
--
-- Admin nemoze sediet pri obrazovke cely vecer. Livescore preto potrebuje
-- zoznam modelov v poradi: ked prvy prestane fungovat (vycerpany denny limit
-- poskytovatela, vypadok), prepne sa sam na dalsi.
--
-- Typicke poradie: tri bezplatne, za nimi plateny ako poistka.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS admin.livescore_poradie (
    id             SERIAL PRIMARY KEY,
    competition_id INT  NOT NULL REFERENCES admin.competitions(id) ON DELETE CASCADE,
    poradie        INT  NOT NULL,          -- 1 = prvy na rade
    model_id       INT  NOT NULL REFERENCES admin.ai_models(id) ON DELETE CASCADE,
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (competition_id, poradie),
    UNIQUE (competition_id, model_id)
);

-- Ktory model z poradia prave bezi. Bez toho by sa po prepnuti nevedelo,
-- kde v zozname sme — a livescore by sa vracalo k prvemu, ktory nefunguje.
ALTER TABLE admin.livescore_day_config
    ADD COLUMN IF NOT EXISTS poradie_index INT NOT NULL DEFAULT 1;

-- Kolkokrat sa dnes prepinalo, aby sa v prehlade dalo vidiet, ze nieco
-- nesedi, aj ked livescore nakoniec bezi.
ALTER TABLE admin.livescore_day_config
    ADD COLUMN IF NOT EXISTS prepnuti_dnes INT NOT NULL DEFAULT 0;

COMMENT ON TABLE admin.livescore_poradie IS
    'Poradie nahradnych modelov: ked jeden zlyha, livescore prejde na dalsi';

INSERT INTO admin.schema_versions (version, description)
VALUES (82, 'Poradie nahradnych modelov pre livescore')
ON CONFLICT (version) DO NOTHING;

COMMIT;
