-- Migration 044: UEFA Champions League 2026/27
-- Organizator sutaze: UEFA.
-- Pripravi prazdnu sutaz pre jednu spolocnu ligovu fazu a neskorsie knockout kola.
-- Timy a zapasy sa doplnia az po skonceni kvalifikacie a zrebe.

-- ============================================================
-- 1. admin.competitions
-- ============================================================
INSERT INTO admin.competitions (slug, name, sport, season, is_active, starts_at, ends_at)
VALUES ('ucl2026', 'Liga majstrov UEFA', 'football', '2026/27', FALSE, '2026-09-15', '2027-05-29')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 2. "lm2026-27" schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS "lm2026-27";

-- ============================================================
-- 3. "lm2026-27".teams
-- group_name ostava NULL: Liga majstrov ma jednu spolocnu ligovu tabulku.
-- ============================================================
CREATE TABLE IF NOT EXISTS "lm2026-27".teams (
    team_id     SERIAL PRIMARY KEY,
    team_code   VARCHAR(3)   NOT NULL UNIQUE,
    team_name   VARCHAR(100) NOT NULL,
    group_name  VARCHAR(1)
);

-- ============================================================
-- 4. "lm2026-27".games
-- Timy su nullable, aby sa dali zapasy zalozit pred zrebom.
-- Skore sa hodnoti po 90 minutach; final je informacne po ET/pen.
-- ============================================================
CREATE TABLE IF NOT EXISTS "lm2026-27".games (
    game_id             INT          PRIMARY KEY,
    home_team_id        INT          REFERENCES "lm2026-27".teams(team_id),
    away_team_id        INT          REFERENCES "lm2026-27".teams(team_id),
    start_time          TIMESTAMP    NOT NULL,
    venue               VARCHAR(100) NOT NULL DEFAULT '',
    flashscore_url      VARCHAR(500),
    tips_open           BOOLEAN      NOT NULL DEFAULT TRUE,
    home_score_regular  INT,
    away_score_regular  INT,
    home_score_final    INT,
    away_score_final    INT,
    home_points         INT,
    away_points         INT,
    result_approved     BOOLEAN      NOT NULL DEFAULT FALSE,
    game_type_code      VARCHAR(20)  NOT NULL,
    game_type_name      VARCHAR(50)  NOT NULL,
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. "lm2026-27".tips
-- ============================================================
CREATE TABLE IF NOT EXISTS "lm2026-27".tips (
    id                SERIAL PRIMARY KEY,
    user_id           INT       NOT NULL REFERENCES admin.users(id),
    game_id           INT       NOT NULL REFERENCES "lm2026-27".games(game_id),
    home_score_tip    INT       NOT NULL,
    away_score_tip    INT       NOT NULL,
    points_earned     INT,
    entered_by_admin  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- ============================================================
-- 6. "lm2026-27".scoring_config
-- Ligova faza: spravny vysledok 3 body, goly +1 +1.
-- Knockout: spravny vysledok 5 bodov, goly +1 +1.
-- ============================================================
CREATE TABLE IF NOT EXISTS "lm2026-27".scoring_config (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,
    value       INT          NOT NULL,
    updated_by  INT REFERENCES admin.users(id),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO "lm2026-27".scoring_config (key, value) VALUES
    ('correct_result_group',   3),
    ('correct_result_playoff', 5),
    ('correct_goals_per_team', 1)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. "lm2026-27".group_standings
-- phase bude LEAGUE; vsetky timy patria do jednej spolocnej tabulky.
-- ============================================================
CREATE TABLE IF NOT EXISTS "lm2026-27".group_standings (
    phase       VARCHAR(10)  NOT NULL,
    team        VARCHAR(3)   NOT NULL,
    rank        INT          NOT NULL DEFAULT 0,
    gp          INT          NOT NULL DEFAULT 0,
    w           INT          NOT NULL DEFAULT 0,
    d           INT          NOT NULL DEFAULT 0,
    l           INT          NOT NULL DEFAULT 0,
    gf          INT          NOT NULL DEFAULT 0,
    ga          INT          NOT NULL DEFAULT 0,
    pts         INT          NOT NULL DEFAULT 0,
    finalized   BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (phase, team)
);

INSERT INTO admin.schema_versions (version, description)
VALUES (44, 'UEFA Champions League 2026/27: prazdna ucl2026 schema pre kvalifikaciu, ligovu fazu a knockout')
ON CONFLICT (version) DO NOTHING;
