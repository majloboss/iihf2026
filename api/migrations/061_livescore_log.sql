-- Migration 061: docasny zaznamnik odpovedi livescore modelu
--
-- Ucel je zistit, ktore udaje z Flashscore ma zmysel ukladat natrvalo.
-- Kazde volanie modelu sa tu zapise so vsetkym, co vratil, aj so surovym JSON.
-- Po vyhodnoteni sa tabulka zmaze aj s tymto zaznamnikom.
--
-- Tabulka je v admin, nie v rocnikovej scheme — netyka sa konkretnej sutaze.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.livescore_log (
    id            SERIAL PRIMARY KEY,
    checked_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    url           VARCHAR(500),
    match_id      VARCHAR(20),
    model         VARCHAR(100),

    home_team     VARCHAR(100),
    away_team     VARCHAR(100),
    competition   VARCHAR(100),

    started       BOOLEAN,
    finished      BOOLEAN,
    minute        SMALLINT,
    minute_note   VARCHAR(50),
    period        VARCHAR(50),
    status        VARCHAR(50),

    home_score            SMALLINT,
    away_score            SMALLINT,
    home_score_halftime   SMALLINT,
    away_score_halftime   SMALLINT,
    home_yellow_cards     SMALLINT,
    away_yellow_cards     SMALLINT,
    home_red_cards        SMALLINT,
    away_red_cards        SMALLINT,

    start_time_text VARCHAR(100),   -- ako to vratil model, bez prevodu
    notes           TEXT,
    raw             JSONB,          -- cela odpoved, aj polia ktore tu stlpec nemaju

    tokens        INTEGER,
    took_ms       INTEGER
);

COMMENT ON TABLE admin.livescore_log IS
    'Docasny zaznamnik odpovedi livescore modelu — sluzi na rozhodnutie, co ukladat natrvalo';

CREATE INDEX IF NOT EXISTS livescore_log_time_idx  ON admin.livescore_log (checked_at DESC);
CREATE INDEX IF NOT EXISTS livescore_log_match_idx ON admin.livescore_log (match_id, checked_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin.livescore_log TO "dbbet-admin";
GRANT USAGE, SELECT ON SEQUENCE admin.livescore_log_id_seq TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (61, 'Docasny zaznamnik odpovedi livescore modelu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
