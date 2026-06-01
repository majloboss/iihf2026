-- IIHF2026 — Kompletná inicializácia databázy
-- Používa sa pre novú prázdnu databázu (napr. dev/test prostredie).
-- Zahŕňa všetky migrácie 001–023.
--
-- Spusti ako:
--   psql -h <host> -p 5432 -U <user> -d <dbname> -f full_schema.sql
--
-- Ak schémy admin/iihf2026 ešte neexistujú, PostgreSQL user musí mať CREATE privilege.

BEGIN;

-- ============================================================
-- SCHEMAS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS iihf2026;

-- ============================================================
-- admin.schema_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.schema_versions (
    version     INT          PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    applied_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- admin.users
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.users (
    id               SERIAL       PRIMARY KEY,
    username         VARCHAR(50)  NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    username_changed BOOLEAN      NOT NULL DEFAULT FALSE,
    first_name       VARCHAR(100),
    last_name        VARCHAR(100),
    email            VARCHAR(150),
    phone            VARCHAR(30),
    avatar           VARCHAR(255),
    role             VARCHAR(10)  NOT NULL DEFAULT 'user',
    is_active        BOOLEAN      NOT NULL DEFAULT FALSE,
    fcm_token        VARCHAR(255),
    web_push_sub     TEXT,
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- admin.invites
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS admin.seq_invite START 1;

CREATE TABLE IF NOT EXISTS admin.invites (
    id           INT          PRIMARY KEY DEFAULT nextval('admin.seq_invite'),
    invite_token VARCHAR(100) NOT NULL UNIQUE,
    created_by   INT          REFERENCES admin.users(id),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    used_at      TIMESTAMP,
    user_id      INT          REFERENCES admin.users(id),
    sent_to      VARCHAR(100),
    email_sent   BOOLEAN      NOT NULL DEFAULT FALSE,
    group_id     INT
    -- FK na friend_groups sa pridá neskôr
);

-- ============================================================
-- admin.friend_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.friend_groups (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    created_by INT          REFERENCES admin.users(id),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

ALTER TABLE admin.invites
    ADD CONSTRAINT fk_invites_group
    FOREIGN KEY (group_id) REFERENCES admin.friend_groups(id) ON DELETE SET NULL;

-- ============================================================
-- admin.group_members
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.group_members (
    group_id  INT         REFERENCES admin.friend_groups(id),
    user_id   INT         REFERENCES admin.users(id),
    status    VARCHAR(10) NOT NULL DEFAULT 'pending',  -- pending | accepted | invited
    joined_at TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- admin.notification_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.notification_settings (
    user_id        INT         NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    notif_type     VARCHAR(30) NOT NULL,
    enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    email_enabled  BOOLEAN     NOT NULL DEFAULT FALSE,
    push_enabled   BOOLEAN     NOT NULL DEFAULT FALSE,
    minutes_before INT,
    PRIMARY KEY (user_id, notif_type)
);

-- ============================================================
-- admin.login_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.login_logs (
    id         SERIAL      PRIMARY KEY,
    user_id    INT         REFERENCES admin.users(id) ON DELETE SET NULL,
    username   VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    env        VARCHAR(10) NOT NULL DEFAULT 'main',
    logged_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_logs_logged_at_idx ON admin.login_logs(logged_at DESC);

-- ============================================================
-- admin.mail_log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.mail_log (
    id        SERIAL       PRIMARY KEY,
    to_email  VARCHAR(150) NOT NULL,
    subject   VARCHAR(255) NOT NULL,
    body      TEXT,
    status    VARCHAR(10)  NOT NULL DEFAULT 'sent',
    error_msg TEXT,
    sent_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mail_log_sent ON admin.mail_log(sent_at DESC);

-- ============================================================
-- admin.notification_log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.notification_log (
    id         SERIAL PRIMARY KEY,
    user_id    INT    NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    notif_type VARCHAR(30) NOT NULL,
    game_id    INT,  -- FK na iihf2026.games(id) sa pridá po vytvorení games tabuľky
    sent_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_log_game
    ON admin.notification_log (user_id, notif_type, game_id)
    WHERE game_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_log_nongame
    ON admin.notification_log (user_id, notif_type)
    WHERE game_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_log_sent ON admin.notification_log(sent_at);

-- ============================================================
-- admin.announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.announcements (
    id         SERIAL      PRIMARY KEY,
    body       TEXT        NOT NULL,
    is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INT         REFERENCES admin.users(id) ON DELETE SET NULL
);

-- ============================================================
-- admin.user_push_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.user_push_subscriptions (
    id           SERIAL    PRIMARY KEY,
    user_id      INT       NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    endpoint     TEXT      NOT NULL UNIQUE,
    subscription JSONB     NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upush_user ON admin.user_push_subscriptions(user_id);

-- ============================================================
-- iihf2026.teams
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.teams (
    code         VARCHAR(3)  PRIMARY KEY,
    name         VARCHAR(60) NOT NULL,
    group_letter CHAR(1)     NOT NULL,
    api_name     VARCHAR(100)
);

INSERT INTO iihf2026.teams (code, name, group_letter, api_name) VALUES
    ('FIN', 'Finland',        'A', 'Finland'),
    ('GER', 'Germany',        'A', 'Germany'),
    ('USA', 'United States',  'A', 'USA'),
    ('SUI', 'Switzerland',    'A', 'Switzerland'),
    ('GBR', 'Great Britain',  'A', 'Great Britain'),
    ('AUT', 'Austria',        'A', 'Austria'),
    ('HUN', 'Hungary',        'A', 'Hungary'),
    ('LAT', 'Latvia',         'A', 'Latvia'),
    ('CAN', 'Canada',         'B', 'Canada'),
    ('SWE', 'Sweden',         'B', 'Sweden'),
    ('CZE', 'Czech Republic', 'B', 'Czech Republic'),
    ('DEN', 'Denmark',        'B', 'Denmark'),
    ('SVK', 'Slovakia',       'B', 'Slovakia'),
    ('NOR', 'Norway',         'B', 'Norway'),
    ('ITA', 'Italy',          'B', 'Italy'),
    ('SLO', 'Slovenia',       'B', 'Slovenia')
ON CONFLICT DO NOTHING;

-- ============================================================
-- iihf2026.games
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.games (
    id                   SERIAL      PRIMARY KEY,
    game_number          INTEGER     NOT NULL UNIQUE,
    phase                VARCHAR(8)  NOT NULL,
    team1                VARCHAR(3)  REFERENCES iihf2026.teams(code),
    team2                VARCHAR(3)  REFERENCES iihf2026.teams(code),
    starts_at            TIMESTAMPTZ NOT NULL,
    venue                VARCHAR(50) NOT NULL,
    score1               SMALLINT,
    score2               SMALLINT,
    status               VARCHAR(10) NOT NULL DEFAULT 'scheduled'
                         CHECK (status IN ('scheduled','live','finished')),
    final1               INT,
    final2               INT,
    updated_at           TIMESTAMP   NOT NULL DEFAULT NOW(),
    flashscore_url       VARCHAR(500),
    ls_score1            INT,
    ls_score2            INT,
    ls_final1            INT,
    ls_final2            INT,
    ls_status            VARCHAR(10),
    ls_api_game_id       INT,
    ls_updated_at        TIMESTAMP,
    ls_requests_expected INT,
    ls_requests_actual   INT NOT NULL DEFAULT 0
);

INSERT INTO iihf2026.games (game_number, phase, team1, team2, starts_at, venue, flashscore_url) VALUES
-- FRI 15 MAY
(1,  'A',      'FIN','GER', '2026-05-15 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/nemecko-vgQVYBeh/'),
(2,  'B',      'CAN','SWE', '2026-05-15 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/svedsko-vBLjQRXp/'),
(3,  'A',      'USA','SUI', '2026-05-15 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/usa-GYgp4SO3/'),
(4,  'B',      'CZE','DEN', '2026-05-15 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/dansko-2mX8FleU/'),
-- SAT 16 MAY
(5,  'A',      'GBR','AUT', '2026-05-16 10:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/velka-britania-C2UJnT9A/'),
(6,  'B',      'SVK','NOR', '2026-05-16 10:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovensko-ruzLVmAN/'),
(7,  'A',      'HUN','FIN', '2026-05-16 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/madarsko-fBiWomPG/'),
(8,  'B',      'ITA','CAN', '2026-05-16 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/taliansko-IqPZXVAb/'),
(9,  'A',      'SUI','LAT', '2026-05-16 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/svajciarsko-buO3jBAo/'),
(10, 'B',      'SLO','CZE', '2026-05-16 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovinsko-x2ZOU7PT/'),
-- SUN 17 MAY
(11, 'A',      'GBR','USA', '2026-05-17 10:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/usa-GYgp4SO3/velka-britania-C2UJnT9A/'),
(12, 'B',      'ITA','SVK', '2026-05-17 10:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/taliansko-IqPZXVAb/'),
(13, 'A',      'AUT','HUN', '2026-05-17 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/rakusko-xWM7kVPi/'),
(14, 'B',      'DEN','SWE', '2026-05-17 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/svedsko-vBLjQRXp/'),
(15, 'A',      'GER','SUI', '2026-05-17 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/nemecko-vgQVYBeh/'),
(16, 'B',      'NOR','SLO', '2026-05-17 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/slovinsko-x2ZOU7PT/'),
-- MON 18 MAY
(17, 'A',      'FIN','USA', '2026-05-18 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/usa-GYgp4SO3/'),
(18, 'B',      'CAN','DEN', '2026-05-18 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/kanada-dSsR389c/'),
(19, 'A',      'LAT','GER', '2026-05-18 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/svajciarsko-buO3jBAo/'),
(20, 'B',      'SWE','CZE', '2026-05-18 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/svedsko-vBLjQRXp/'),
-- TUE 19 MAY
(21, 'A',      'LAT','AUT', '2026-05-19 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/rakusko-xWM7kVPi/'),
(22, 'B',      'ITA','NOR', '2026-05-19 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/taliansko-IqPZXVAb/'),
(23, 'A',      'HUN','GBR', '2026-05-19 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/velka-britania-C2UJnT9A/'),
(24, 'B',      'SLO','SVK', '2026-05-19 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/slovinsko-x2ZOU7PT/'),
-- WED 20 MAY
(25, 'A',      'AUT','GER', '2026-05-20 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/svajciarsko-buO3jBAo/'),
(26, 'B',      'CZE','SVK', '2026-05-20 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/taliansko-IqPZXVAb/'),
(27, 'A',      'SUI','GBR', '2026-05-20 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/usa-GYgp4SO3/'),
(28, 'B',      'SWE','SLO', '2026-05-20 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/svedsko-vBLjQRXp/'),
-- THU 21 MAY
(29, 'A',      'LAT','FIN', '2026-05-21 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/lotyssko-44JaYkQ4/'),
(30, 'B',      'CAN','NOR', '2026-05-21 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/norsko-nDtCX9uB/'),
(31, 'A',      'SUI','HUN', '2026-05-21 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/svajciarsko-buO3jBAo/velka-britania-C2UJnT9A/'),
(32, 'B',      'DEN','SLO', '2026-05-21 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovensko-ruzLVmAN/'),
-- FRI 22 MAY
(33, 'A',      'GER','HUN', '2026-05-22 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/nemecko-vgQVYBeh/'),
(34, 'B',      'CAN','SLO', '2026-05-22 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovinsko-x2ZOU7PT/'),
(35, 'A',      'FIN','GBR', '2026-05-22 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/velka-britania-C2UJnT9A/'),
(36, 'B',      'SWE','ITA', '2026-05-22 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/svedsko-vBLjQRXp/taliansko-IqPZXVAb/'),
-- SAT 23 MAY
(37, 'A',      'LAT','USA', '2026-05-23 10:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/usa-GYgp4SO3/'),
(38, 'B',      'SWE','NOR', '2026-05-23 10:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/slovinsko-x2ZOU7PT/'),
(39, 'A',      'SUI','AUT', '2026-05-23 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/svajciarsko-buO3jBAo/'),
(40, 'B',      'CZE','ITA', '2026-05-23 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/slovensko-ruzLVmAN/'),
(41, 'A',      'GER','USA', '2026-05-23 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/rakusko-xWM7kVPi/'),
(42, 'B',      'DEN','SVK', '2026-05-23 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/norsko-nDtCX9uB/svedsko-vBLjQRXp/'),
-- SUN 24 MAY
(43, 'A',      'GBR','LAT', '2026-05-24 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/velka-britania-C2UJnT9A/'),
(44, 'B',      'DEN','ITA', '2026-05-24 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/taliansko-IqPZXVAb/'),
(45, 'A',      'FIN','AUT', '2026-05-24 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/rakusko-xWM7kVPi/'),
(46, 'B',      'SVK','CAN', '2026-05-24 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/kanada-dSsR389c/slovensko-ruzLVmAN/'),
-- MON 25 MAY
(47, 'A',      'USA','HUN', '2026-05-25 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/madarsko-fBiWomPG/usa-GYgp4SO3/'),
(48, 'B',      'CZE','NOR', '2026-05-25 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/norsko-nDtCX9uB/'),
(49, 'A',      'GER','GBR', '2026-05-25 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/nemecko-vgQVYBeh/velka-britania-C2UJnT9A/'),
(50, 'B',      'SLO','ITA', '2026-05-25 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/slovinsko-x2ZOU7PT/taliansko-IqPZXVAb/'),
-- TUE 26 MAY
(51, 'A',      'HUN','LAT', '2026-05-26 10:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/lotyssko-44JaYkQ4/madarsko-fBiWomPG/'),
(52, 'B',      'NOR','DEN', '2026-05-26 10:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/dansko-2mX8FleU/norsko-nDtCX9uB/'),
(53, 'A',      'USA','AUT', '2026-05-26 14:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/rakusko-xWM7kVPi/usa-GYgp4SO3/'),
(54, 'B',      'SWE','SVK', '2026-05-26 14:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/slovensko-ruzLVmAN/svedsko-vBLjQRXp/'),
(55, 'A',      'SUI','FIN', '2026-05-26 18:20+00','Zurich / Swiss Life Arena',  'https://www.flashscore.sk/zapas/hokej/finsko-rRWMzYQu/svajciarsko-buO3jBAo/'),
(56, 'B',      'CZE','CAN', '2026-05-26 18:20+00','Fribourg / BCF Arena',       'https://www.flashscore.sk/zapas/hokej/cesko-OdY4GUuO/kanada-dSsR389c/'),
-- THU 28 MAY - Quarterfinals
(57, 'QF',    NULL, NULL,   '2026-05-28 14:20+00','Zurich / Swiss Life Arena',  NULL),
(58, 'QF',    NULL, NULL,   '2026-05-28 14:20+00','Fribourg / BCF Arena',       NULL),
(59, 'QF',    NULL, NULL,   '2026-05-28 18:20+00','Zurich / Swiss Life Arena',  NULL),
(60, 'QF',    NULL, NULL,   '2026-05-28 18:20+00','Fribourg / BCF Arena',       NULL),
-- SAT 30 MAY - Semifinals
(61, 'SF',    NULL, NULL,   '2026-05-30 13:20+00','Zurich / Swiss Life Arena',  NULL),
(62, 'SF',    NULL, NULL,   '2026-05-30 18:00+00','Zurich / Swiss Life Arena',  NULL),
-- SUN 31 MAY
(63, 'BRONZE',NULL, NULL,   '2026-05-31 13:20+00','Zurich / Swiss Life Arena',  NULL),
(64, 'GOLD',  NULL, NULL,   '2026-05-31 18:20+00','Zurich / Swiss Life Arena',  NULL)
ON CONFLICT DO NOTHING;

-- FK z notification_log na games (teraz keď games existuje)
ALTER TABLE admin.notification_log
    ADD CONSTRAINT fk_notif_log_game
    FOREIGN KEY (game_id) REFERENCES iihf2026.games(id) ON DELETE SET NULL;

-- ============================================================
-- iihf2026.tips
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.tips (
    id         SERIAL      PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    game_id    INTEGER     NOT NULL REFERENCES iihf2026.games(id),
    tip1       SMALLINT    NOT NULL CHECK (tip1 >= 0),
    tip2       SMALLINT    NOT NULL CHECK (tip2 >= 0),
    points     SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- ============================================================
-- iihf2026.scoring_config
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.scoring_config (
    phase      VARCHAR(8) PRIMARY KEY,
    pts_winner SMALLINT   NOT NULL DEFAULT 1,
    pts_goals1 SMALLINT   NOT NULL DEFAULT 1,
    pts_goals2 SMALLINT   NOT NULL DEFAULT 1,
    pts_exact  SMALLINT   NOT NULL DEFAULT 0
);

INSERT INTO iihf2026.scoring_config (phase, pts_winner, pts_goals1, pts_goals2, pts_exact) VALUES
    ('A',      3, 1, 1, 0),
    ('B',      3, 1, 1, 0),
    ('QF',     5, 1, 1, 0),
    ('SF',     5, 1, 1, 0),
    ('BRONZE', 5, 1, 1, 0),
    ('GOLD',   5, 1, 1, 0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- iihf2026.group_standings
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.group_standings (
    phase      VARCHAR(2) NOT NULL,
    team       VARCHAR(3) NOT NULL,
    rank       INT        NOT NULL DEFAULT 0,
    gp         INT        NOT NULL DEFAULT 0,
    w          INT        NOT NULL DEFAULT 0,
    d          INT        NOT NULL DEFAULT 0,
    l          INT        NOT NULL DEFAULT 0,
    gf         INT        NOT NULL DEFAULT 0,
    ga         INT        NOT NULL DEFAULT 0,
    pts        INT        NOT NULL DEFAULT 0,
    otw        INT        NOT NULL DEFAULT 0,
    otl        INT        NOT NULL DEFAULT 0,
    finalized  BOOLEAN    NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (phase, team)
);

-- ============================================================
-- iihf2026.livescore_daily
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.livescore_daily (
    date         DATE      PRIMARY KEY,
    api_calls    INT       NOT NULL DEFAULT 0,
    next_poll_at TIMESTAMP
);

-- ============================================================
-- iihf2026.games_pdf  (referenčná kópia rozpisu z PDF)
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.games_pdf (
    game_number    INT         PRIMARY KEY,
    phase          VARCHAR(10) NOT NULL,
    team1          CHAR(3),
    team2          CHAR(3),
    starts_at      TIMESTAMPTZ NOT NULL,
    venue          VARCHAR(200),
    flashscore_url VARCHAR(500)
);

INSERT INTO iihf2026.games_pdf (game_number, phase, team1, team2, starts_at, venue) VALUES
( 1,'A','FIN','GER','2026-05-15 14:20+00','Swiss Life Arena, Zurich'),
( 2,'B','CAN','SWE','2026-05-15 14:20+00','BCF Arena, Fribourg'),
( 3,'A','USA','SUI','2026-05-15 18:20+00','Swiss Life Arena, Zurich'),
( 4,'B','CZE','DEN','2026-05-15 18:20+00','BCF Arena, Fribourg'),
( 5,'A','GBR','AUT','2026-05-16 10:20+00','Swiss Life Arena, Zurich'),
( 6,'B','SVK','NOR','2026-05-16 10:20+00','BCF Arena, Fribourg'),
( 7,'A','HUN','FIN','2026-05-16 14:20+00','Swiss Life Arena, Zurich'),
( 8,'B','ITA','CAN','2026-05-16 14:20+00','BCF Arena, Fribourg'),
( 9,'A','SUI','LAT','2026-05-16 18:20+00','Swiss Life Arena, Zurich'),
(10,'B','SLO','CZE','2026-05-16 18:20+00','BCF Arena, Fribourg'),
(11,'A','GBR','USA','2026-05-17 10:20+00','Swiss Life Arena, Zurich'),
(12,'B','ITA','SVK','2026-05-17 10:20+00','BCF Arena, Fribourg'),
(13,'A','AUT','HUN','2026-05-17 14:20+00','Swiss Life Arena, Zurich'),
(14,'B','DEN','SWE','2026-05-17 14:20+00','BCF Arena, Fribourg'),
(15,'A','GER','SUI','2026-05-17 18:20+00','Swiss Life Arena, Zurich'),
(16,'B','NOR','SLO','2026-05-17 18:20+00','BCF Arena, Fribourg'),
(17,'A','FIN','USA','2026-05-18 14:20+00','Swiss Life Arena, Zurich'),
(18,'B','CAN','DEN','2026-05-18 14:20+00','BCF Arena, Fribourg'),
(19,'A','LAT','GER','2026-05-18 18:20+00','Swiss Life Arena, Zurich'),
(20,'B','SWE','CZE','2026-05-18 18:20+00','BCF Arena, Fribourg'),
(21,'A','LAT','AUT','2026-05-19 14:20+00','Swiss Life Arena, Zurich'),
(22,'B','ITA','NOR','2026-05-19 14:20+00','BCF Arena, Fribourg'),
(23,'A','HUN','GBR','2026-05-19 18:20+00','Swiss Life Arena, Zurich'),
(24,'B','SLO','SVK','2026-05-19 18:20+00','BCF Arena, Fribourg'),
(25,'A','AUT','GER','2026-05-20 14:20+00','Swiss Life Arena, Zurich'),
(26,'B','CZE','SVK','2026-05-20 14:20+00','BCF Arena, Fribourg'),
(27,'A','SUI','GBR','2026-05-20 18:20+00','Swiss Life Arena, Zurich'),
(28,'B','SWE','SLO','2026-05-20 18:20+00','BCF Arena, Fribourg'),
(29,'A','LAT','FIN','2026-05-21 14:20+00','Swiss Life Arena, Zurich'),
(30,'B','CAN','NOR','2026-05-21 14:20+00','BCF Arena, Fribourg'),
(31,'A','SUI','HUN','2026-05-21 18:20+00','Swiss Life Arena, Zurich'),
(32,'B','DEN','SLO','2026-05-21 18:20+00','BCF Arena, Fribourg'),
(33,'A','GER','HUN','2026-05-22 14:20+00','Swiss Life Arena, Zurich'),
(34,'B','CAN','SLO','2026-05-22 14:20+00','BCF Arena, Fribourg'),
(35,'A','FIN','GBR','2026-05-22 18:20+00','Swiss Life Arena, Zurich'),
(36,'B','SWE','ITA','2026-05-22 18:20+00','BCF Arena, Fribourg'),
(37,'A','LAT','USA','2026-05-23 10:20+00','Swiss Life Arena, Zurich'),
(38,'B','SWE','NOR','2026-05-23 10:20+00','BCF Arena, Fribourg'),
(39,'A','SUI','AUT','2026-05-23 14:20+00','Swiss Life Arena, Zurich'),
(40,'B','CZE','ITA','2026-05-23 14:20+00','BCF Arena, Fribourg'),
(41,'A','GER','USA','2026-05-23 18:20+00','Swiss Life Arena, Zurich'),
(42,'B','DEN','SVK','2026-05-23 18:20+00','BCF Arena, Fribourg'),
(43,'A','GBR','LAT','2026-05-24 14:20+00','Swiss Life Arena, Zurich'),
(44,'B','DEN','ITA','2026-05-24 14:20+00','BCF Arena, Fribourg'),
(45,'A','FIN','AUT','2026-05-24 18:20+00','Swiss Life Arena, Zurich'),
(46,'B','SVK','CAN','2026-05-24 18:20+00','BCF Arena, Fribourg'),
(47,'A','USA','HUN','2026-05-25 14:20+00','Swiss Life Arena, Zurich'),
(48,'B','CZE','NOR','2026-05-25 14:20+00','BCF Arena, Fribourg'),
(49,'A','GER','GBR','2026-05-25 18:20+00','Swiss Life Arena, Zurich'),
(50,'B','SLO','ITA','2026-05-25 18:20+00','BCF Arena, Fribourg'),
(51,'A','HUN','LAT','2026-05-26 10:20+00','Swiss Life Arena, Zurich'),
(52,'B','NOR','DEN','2026-05-26 10:20+00','BCF Arena, Fribourg'),
(53,'A','USA','AUT','2026-05-26 14:20+00','Swiss Life Arena, Zurich'),
(54,'B','SWE','SVK','2026-05-26 14:20+00','BCF Arena, Fribourg'),
(55,'A','SUI','FIN','2026-05-26 18:20+00','Swiss Life Arena, Zurich'),
(56,'B','CZE','CAN','2026-05-26 18:20+00','BCF Arena, Fribourg'),
(57,'QF',    NULL,NULL,'2026-05-28 14:20+00','Swiss Life Arena, Zurich'),
(58,'QF',    NULL,NULL,'2026-05-28 14:20+00','BCF Arena, Fribourg'),
(59,'QF',    NULL,NULL,'2026-05-28 18:20+00','Swiss Life Arena, Zurich'),
(60,'QF',    NULL,NULL,'2026-05-28 18:20+00','BCF Arena, Fribourg'),
(61,'SF',    NULL,NULL,'2026-05-30 13:20+00','Swiss Life Arena, Zurich'),
(62,'SF',    NULL,NULL,'2026-05-30 18:00+00','Swiss Life Arena, Zurich'),
(63,'BRONZE',NULL,NULL,'2026-05-31 13:20+00','Swiss Life Arena, Zurich'),
(64,'GOLD',  NULL,NULL,'2026-05-31 18:20+00','Swiss Life Arena, Zurich')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verzia
-- ============================================================
INSERT INTO admin.schema_versions (version, description) VALUES
    (1,  'Initial schema'),
    (2,  'iihf2026: teams, games, tips, scoring_config'),
    (3,  'group_standings'),
    (4,  'invites.sent_to'),
    (5,  'users.email not unique'),
    (8,  'login_logs'),
    (9,  'notification_settings'),
    (10, 'games: final1, final2, updated_at'),
    (11, 'notification_log'),
    (12, 'mail_log, invites.email_sent'),
    (13, 'invites.group_id'),
    (14, 'games.flashscore_url'),
    (15, 'flashscore URLs for games 1-56'),
    (16, 'games_pdf reference table'),
    (17, 'mail_log.body'),
    (18, 'login_logs.env'),
    (19, 'group_standings: otw, otl'),
    (20, 'announcements'),
    (21, 'announcements.is_active'),
    (22, 'livescore: teams.api_name, games.ls_*, livescore_daily'),
    (23, 'livescore_daily.next_poll_at')
ON CONFLICT DO NOTHING;

COMMIT;
