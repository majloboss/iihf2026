-- Migration 024: BetClub multi-turnaj infraštruktúra
-- Pridáva admin.competitions, rozširuje users/friend_groups/notification_log,
-- vytvára schému fifa2026 s celou štruktúrou tabuliek.
-- Spusti na: DB-DEV-BET (a neskôr DB-BET)

-- ============================================================
-- 1. admin.competitions — číselník súťaží
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.competitions (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(50)  NOT NULL UNIQUE,  -- 'iihf2026', 'fifa2026'
    name        VARCHAR(100) NOT NULL,          -- 'MS v hokeji 2026', 'FIFA World Cup 2026'
    sport       VARCHAR(50)  NOT NULL,          -- 'hockey', 'football'
    season      VARCHAR(20)  NOT NULL,          -- '2026'
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at   DATE,
    ends_at     DATE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO admin.competitions (id, slug, name, sport, season, is_active, starts_at, ends_at)
VALUES
    (1, 'iihf2026', 'MS v ľadovom hokeji 2026', 'hockey',   '2026', TRUE, '2026-05-09', '2026-05-25'),
    (2, 'fifa2026',  'FIFA World Cup 2026',       'football', '2026', TRUE, '2026-06-11', '2026-07-19')
ON CONFLICT (id) DO NOTHING;

-- Zabezpeč správnu sekvenciu po manuálnom INSERT s id
SELECT setval(pg_get_serial_sequence('admin.competitions', 'id'), MAX(id)) FROM admin.competitions;

-- ============================================================
-- 2. admin.friend_groups — pridaj competition_id
-- ============================================================
ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS competition_id INT DEFAULT 1
        REFERENCES admin.competitions(id) ON DELETE SET NULL;

-- Existujúce skupiny patria k IIHF 2026
UPDATE admin.friend_groups SET competition_id = 1 WHERE competition_id IS NULL;

-- ============================================================
-- 3. admin.users — pridaj active_competition_id
-- ============================================================
ALTER TABLE admin.users
    ADD COLUMN IF NOT EXISTS active_competition_id INT DEFAULT 1
        REFERENCES admin.competitions(id) ON DELETE SET NULL;

-- Existujúci useri začínajú s IIHF 2026 ako aktívny turnaj
UPDATE admin.users SET active_competition_id = 1 WHERE active_competition_id IS NULL;

-- ============================================================
-- 4. admin.notification_log — odstrán pevný FK na iihf2026.games,
--    pridaj competition_id
-- ============================================================
ALTER TABLE admin.notification_log
    DROP CONSTRAINT IF EXISTS notification_log_game_id_fkey;

ALTER TABLE admin.notification_log
    ADD COLUMN IF NOT EXISTS competition_id INT DEFAULT 1;

UPDATE admin.notification_log SET competition_id = 1 WHERE competition_id IS NULL;

-- ============================================================
-- 5. CREATE SCHEMA fifa2026
-- ============================================================
CREATE SCHEMA IF NOT EXISTS fifa2026;

-- ============================================================
-- 6. fifa2026.teams — 48 krajín, skupiny A–L
-- ============================================================
CREATE TABLE IF NOT EXISTS fifa2026.teams (
    team_id     SERIAL PRIMARY KEY,
    team_code   VARCHAR(3)   NOT NULL UNIQUE,  -- USA, BRA, ARG...
    team_name   VARCHAR(100) NOT NULL,
    group_name  VARCHAR(1)   NOT NULL           -- 'A' až 'L'
);

-- ============================================================
-- 7. fifa2026.games — 104 zápasov
-- game_type_code: GROUP_A..GROUP_L | R32 | R16 | QF | SF | BM | F
-- Výsledok sa hodnotí po 90 min (ET/penalties sa do tipu nepočíta)
-- ============================================================
CREATE TABLE IF NOT EXISTS fifa2026.games (
    game_id             INT          PRIMARY KEY,
    home_team_id        INT          REFERENCES fifa2026.teams(team_id),
    away_team_id        INT          REFERENCES fifa2026.teams(team_id),
    start_time          TIMESTAMP    NOT NULL,
    venue               VARCHAR(100) NOT NULL DEFAULT '',
    tips_open           BOOLEAN      NOT NULL DEFAULT TRUE,
    home_score_regular  INT,                   -- skóre po 90 min (základ pre tipy)
    away_score_regular  INT,
    home_score_final    INT,                   -- skóre po ET/penalties (info)
    away_score_final    INT,
    home_points         INT,
    away_points         INT,
    result_approved     BOOLEAN      NOT NULL DEFAULT FALSE,
    game_type_code      VARCHAR(10)  NOT NULL,
    game_type_name      VARCHAR(50)  NOT NULL,
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. fifa2026.tips
-- ============================================================
CREATE TABLE IF NOT EXISTS fifa2026.tips (
    id                SERIAL PRIMARY KEY,
    user_id           INT       NOT NULL REFERENCES admin.users(id),
    game_id           INT       NOT NULL REFERENCES fifa2026.games(game_id),
    home_score_tip    INT       NOT NULL,
    away_score_tip    INT       NOT NULL,
    points_earned     INT,
    entered_by_admin  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- ============================================================
-- 9. fifa2026.scoring_config
-- Bodovanie (po 90 min):
--   exact_score       = 3  (presný výsledok)
--   correct_winner_diff = 2  (správny víťaz + správny gólový rozdiel)
--   correct_winner    = 1  (správny víťaz, zlý rozdiel)
--   correct_draw      = 2  (správna remíza, zlý presný výsledok)
-- ============================================================
CREATE TABLE IF NOT EXISTS fifa2026.scoring_config (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,
    value       INT          NOT NULL,
    updated_by  INT REFERENCES admin.users(id),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO fifa2026.scoring_config (key, value) VALUES
    ('exact_score',          3),
    ('correct_winner_diff',  2),
    ('correct_winner',       1),
    ('correct_draw',         2)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 10. fifa2026.group_standings — skupiny A–L (12 skupín)
-- phase = 'A'..'L'
-- ============================================================
CREATE TABLE IF NOT EXISTS fifa2026.group_standings (
    phase       VARCHAR(2)   NOT NULL,
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

-- ============================================================
-- 11. Schema version
-- ============================================================
INSERT INTO admin.schema_versions (version, description)
VALUES (24, 'Multi-turnaj: admin.competitions, users.active_competition_id, friend_groups.competition_id, notification_log.competition_id (bez FK na iihf2026.games), fifa2026 schema')
ON CONFLICT (version) DO NOTHING;
