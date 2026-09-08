-- ============================================================
-- Migration 079: sledovanie nakladov na livescore
--
-- Prinasa:
--   admin.ai_models                    ciselnik modelov s cenami
--   admin.livescore_day_config         model pre (sutaz, den) + denny strop
--   admin.livescore_competition_default predvoleny model sutaze
--   admin.livescore_model_test         vysledky testov modelov
--   rozsirenie admin.livescore_log     o naklady, sutaz, zapas a typ volania
--
-- Zadanie: ZADANIE_LIVESCORE_NAKLADY.md
-- ============================================================

BEGIN;

-- ============================================================
-- ADMIN.AI_MODELS — ciselnik modelov
--
-- Ceny su za MILION tokenov, tak ako ich uvadzaju cenniky. Ulozenie v inom
-- tvare (za jeden token) by pri rucnej kontrole zvadzalo k chybam o rady.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.ai_models (
    id                 SERIAL PRIMARY KEY,
    provider           VARCHAR(30)  NOT NULL DEFAULT 'openrouter',
    model_id           VARCHAR(150) NOT NULL UNIQUE,   -- 'minimax/minimax-m3'
    name               VARCHAR(200),

    is_free            BOOLEAN      NOT NULL DEFAULT FALSE,
    price_input_1m     NUMERIC(10,4),                  -- USD za 1M vstupnych tokenov
    price_output_1m    NUMERIC(10,4),                  -- USD za 1M vystupnych tokenov
    context_length     INT,

    -- pouzitelnost
    is_enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    unavailable_reason TEXT,                           -- preco vyradeny (trvala prekazka)

    -- suhrn z testov a ostrej prevadzky
    success_rate       NUMERIC(5,2),                   -- 0-100 %
    tests_total        INT          NOT NULL DEFAULT 0,
    tests_ok           INT          NOT NULL DEFAULT 0,
    avg_tokens         INT,
    avg_ms             INT,
    last_tested_at     TIMESTAMP,
    last_error         TEXT,

    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_models_vyber_idx
    ON admin.ai_models (is_enabled, is_free, success_rate DESC NULLS LAST);

COMMENT ON COLUMN admin.ai_models.price_input_1m IS
    'USD za 1 milion vstupnych tokenov; NULL pri bezplatnom modeli';

-- ============================================================
-- ADMIN.LIVESCORE_COMPETITION_DEFAULT — predvoleny model sutaze
--
-- Pouzije sa, ked pre konkretny den nie je nic nastavene.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.livescore_competition_default (
    competition_id   INT       PRIMARY KEY REFERENCES admin.competitions(id) ON DELETE CASCADE,
    model_id         INT       REFERENCES admin.ai_models(id) ON DELETE SET NULL,
    daily_budget_usd NUMERIC(8,4) NOT NULL DEFAULT 1.0,
    is_enabled       BOOLEAN   NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN.LIVESCORE_DAY_CONFIG — model pre konkretnu sutaz a den
--
-- Kluc je zlozeny, takze dve sutaze mozu v ten isty den bezat na roznych
-- modeloch. Vypnutie livescore plati len na dany den, nastavenie sutaze
-- zostava nedotknute.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.livescore_day_config (
    competition_id    INT          NOT NULL REFERENCES admin.competitions(id) ON DELETE CASCADE,
    den               DATE         NOT NULL,
    model_id          INT          REFERENCES admin.ai_models(id) ON DELETE SET NULL,

    is_enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    disabled_reason   TEXT,

    -- 'auto'   = vybral rany test
    -- 'admin'  = nastavil clovek
    -- 'budget' = prepnute po prekroceni 80 % stropu
    -- 'fail'   = prepnute po troch neuspechoch za sebou
    chosen_by         VARCHAR(10)  NOT NULL DEFAULT 'auto',
    chosen_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    chosen_by_user_id INT          REFERENCES admin.users(id) ON DELETE SET NULL,

    daily_budget_usd  NUMERIC(8,4) NOT NULL DEFAULT 1.0,

    -- kolko uz dnes minulo; drzi sa tu, aby sa nemuselo pri kazdom volani
    -- scitavat cez cely log
    spent_usd         NUMERIC(10,6) NOT NULL DEFAULT 0,
    calls_count       INT           NOT NULL DEFAULT 0,
    fails_in_row      INT           NOT NULL DEFAULT 0,

    -- ktore upozornenia uz odisli, aby sa neposielali opakovane
    warned_80_at      TIMESTAMP,
    stopped_150_at    TIMESTAMP,

    PRIMARY KEY (competition_id, den)
);

CREATE INDEX IF NOT EXISTS livescore_day_config_den_idx
    ON admin.livescore_day_config (den DESC);

-- ============================================================
-- ADMIN.LIVESCORE_MODEL_TEST — vysledky testov modelov
--
-- Uspesnost sa pocita z historie, nie z jedneho behu: model moze raz zlyhat
-- na docasnom vypadku a inokedy fungovat.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.livescore_model_test (
    id             SERIAL PRIMARY KEY,
    tested_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    den            DATE         NOT NULL DEFAULT CURRENT_DATE,
    competition_id INT          REFERENCES admin.competitions(id) ON DELETE SET NULL,

    model_id       INT          REFERENCES admin.ai_models(id) ON DELETE SET NULL,
    model_key      VARCHAR(150) NOT NULL,   -- text, aby zaznam prezil zmazanie modelu

    test_url       VARCHAR(500),            -- na akom zapase sa testovalo
    sport          VARCHAR(30),             -- futbal, hokej, volejbal...

    -- co model dokazal vytiahnut (tri povinne udaje)
    got_score      BOOLEAN      NOT NULL DEFAULT FALSE,
    got_period     BOOLEAN      NOT NULL DEFAULT FALSE,
    got_minute     BOOLEAN      NOT NULL DEFAULT FALSE,
    passed         BOOLEAN      NOT NULL DEFAULT FALSE,   -- skore AND cast hry

    prompt_tokens     INT,
    completion_tokens INT,
    total_tokens      INT,
    cost_usd          NUMERIC(10,6),
    took_ms           INT,

    error          TEXT,
    raw            JSONB
);

CREATE INDEX IF NOT EXISTS livescore_model_test_idx
    ON admin.livescore_model_test (den DESC, model_key);

-- ============================================================
-- Rozsirenie ADMIN.LIVESCORE_LOG
--
-- Tabulka vznikla v migracii 061 ako docasny zaznamnik. Struktura sedi,
-- doplnaju sa len naklady, vazba na sutaz a rozlisenie testu od ostreho
-- volania.
-- ============================================================
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS competition_id INT REFERENCES admin.competitions(id) ON DELETE SET NULL;
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS game_id INT;
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS provider VARCHAR(30) NOT NULL DEFAULT 'openrouter';

-- 'live' = ostre volanie pocas zapasu, 'test' = overovanie modelu.
-- Testovacie volania sa nesmu ratat do nakladov sutaze ani do statistiky.
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS call_type VARCHAR(10) NOT NULL DEFAULT 'live';

ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS prompt_tokens INT;
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS completion_tokens INT;

-- Cena sa uklada v case volania — cenniky sa menia a spatny prepocet zo
-- sucasneho cennika by skresloval historiu.
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,6);

ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS success BOOLEAN;
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS http_status INT;
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS error TEXT;

-- cast hry nezavisle od sportu (polcas / tretina / set / stvrtina)
ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS period_number SMALLINT;

CREATE INDEX IF NOT EXISTS livescore_log_naklady_idx
    ON admin.livescore_log (competition_id, checked_at DESC)
    WHERE call_type = 'live';

COMMENT ON TABLE admin.livescore_log IS
    'Log volani livescore modelu vratane nakladov (migracia 079)';

-- ============================================================
-- Predvolene nastavenie pre existujuce sutaze
-- ============================================================
INSERT INTO admin.livescore_competition_default (competition_id, daily_budget_usd)
SELECT id, 1.0 FROM admin.competitions
ON CONFLICT (competition_id) DO NOTHING;

-- ============================================================
-- Prava
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
    admin.ai_models,
    admin.livescore_day_config,
    admin.livescore_competition_default,
    admin.livescore_model_test
TO "dbbet-admin";

GRANT USAGE, SELECT ON SEQUENCE
    admin.ai_models_id_seq,
    admin.livescore_model_test_id_seq
TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (79, 'Sledovanie nakladov na livescore: ciselnik modelov, model per sutaz a den, testy, naklady v logu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
