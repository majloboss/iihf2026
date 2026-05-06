-- IIHF2026 - Migration 001: Initial schema
-- DB: DB-BET
-- Spusti ako: psql -h [host] -U [user] -d DB-BET -f migrate_001_init.sql

-- ============================================================
-- SCHEMA VERSIONS (v admin scheme - sledovanie vsetkych migraci)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin.schema_versions (
    version     INT          PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    applied_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN.USERS
-- Zdielane pre vsetky buducne turnaje / aplikacie v DB-BET
-- ============================================================
CREATE TABLE admin.users (
    id                SERIAL PRIMARY KEY,
    username          VARCHAR(50)  NOT NULL UNIQUE,
    password          VARCHAR(255) NOT NULL,              -- bcrypt hash
    username_changed  BOOLEAN      NOT NULL DEFAULT FALSE, -- username mozno zmenit iba raz
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    email             VARCHAR(150) UNIQUE,
    phone             VARCHAR(30),
    avatar            VARCHAR(255),                       -- nazov suboru avatara na serveri
    role              VARCHAR(10)  NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    is_active         BOOLEAN      NOT NULL DEFAULT FALSE, -- TRUE po aktivacii cez reg. link
    reg_token         VARCHAR(100) UNIQUE,               -- registracny token (NULL po aktivacii)
    fcm_token         VARCHAR(255),                       -- Firebase FCM token (Android)
    web_push_sub      TEXT,                               -- Web Push subscription JSON (PWA)
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ADMIN.FRIEND_GROUPS
-- Skupinu moze vytvorit kazdy hrac, stava sa jej group adminom.
-- Nazov skupiny je unikatny a viditelny pre vsetkych.
-- Vstup cez ziadost: pending -> approved.
-- Zakladatel moze skupinu vymazat; clena uz vyhodit nemoze.
-- ============================================================
CREATE TABLE admin.friend_groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_by  INT REFERENCES admin.users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE admin.group_members (
    group_id    INT         REFERENCES admin.friend_groups(id),
    user_id     INT         REFERENCES admin.users(id),
    status      VARCHAR(10) NOT NULL DEFAULT 'pending', -- 'pending' | 'approved'
    joined_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- ADMIN.NOTIFICATION_SETTINGS (per user, per typ)
-- notif_type: game_start | untipped_game | result_entered |
--             group_stage_closed | new_games_added
-- minutes_before: len pre game_start a untipped_game
-- ============================================================
CREATE TABLE admin.notification_settings (
    user_id        INT         REFERENCES admin.users(id) NOT NULL,
    notif_type     VARCHAR(30) NOT NULL,
    push_enabled   BOOLEAN     NOT NULL DEFAULT TRUE,
    email_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
    minutes_before INT,
    PRIMARY KEY (user_id, notif_type)
);

-- ============================================================
-- IIHF2026.TEAMS (ciselnik timov IIHF 2026)
-- Vlajky: sources/team_flag_{team_code.lower()}.png
-- ============================================================
CREATE TABLE iihf2026.teams (
    team_id    SERIAL PRIMARY KEY,
    team_code  VARCHAR(3)   NOT NULL UNIQUE,  -- FIN, GER, SVK...
    team_name  VARCHAR(100) NOT NULL,
    group_name VARCHAR(1)   NOT NULL           -- 'A' | 'B'
);

INSERT INTO iihf2026.teams (team_code, team_name, group_name) VALUES
    ('USA', 'United States',  'A'),
    ('SUI', 'Switzerland',    'A'),
    ('FIN', 'Finland',        'A'),
    ('GER', 'Germany',        'A'),
    ('LAT', 'Latvia',         'A'),
    ('AUT', 'Austria',        'A'),
    ('HUN', 'Hungary',        'A'),
    ('GBR', 'Great Britain',  'A'),
    ('CAN', 'Canada',         'B'),
    ('SWE', 'Sweden',         'B'),
    ('CZE', 'Czech Republic', 'B'),
    ('DEN', 'Denmark',        'B'),
    ('SVK', 'Slovakia',       'B'),
    ('NOR', 'Norway',         'B'),
    ('SLO', 'Slovenia',       'B'),
    ('ITA', 'Italy',          'B');

-- ============================================================
-- IIHF2026.GAMES (zapasy)
-- game_id = cislo zapasu z PDF (1..64)
-- home/away_team_id = NULL pre playoff kym sa nezna super
-- tips_open = FALSE automaticky 5 minut pred start_time
-- ============================================================
CREATE TABLE iihf2026.games (
    game_id             INT          PRIMARY KEY,
    home_team_id        INT          REFERENCES iihf2026.teams(team_id),
    away_team_id        INT          REFERENCES iihf2026.teams(team_id),
    start_time          TIMESTAMP    NOT NULL,
    venue               VARCHAR(100) NOT NULL,
    tips_open           BOOLEAN      NOT NULL DEFAULT TRUE,
    home_score_regular  INT,
    away_score_regular  INT,
    home_score_final    INT,
    away_score_final    INT,
    home_points         INT,
    away_points         INT,
    result_approved     BOOLEAN      NOT NULL DEFAULT FALSE,
    game_type_code      VARCHAR(10)  NOT NULL,  -- GROUP_A | GROUP_B | QF | SF | BM | F
    game_type_name      VARCHAR(50)  NOT NULL
);

-- ============================================================
-- IIHF2026.SCORING_CONFIG
-- correct_winner_group   = 1  (spravny vitaz / remiza, skupiny)
-- correct_winner_playoff = 3  (spravny vitaz, QF/SF/F/BM)
-- correct_goals_per_team = 1  (za kazdy spravne tipovany pocet golov)
-- Max skupiny: 3 body | Max playoff: 5 bodov
-- ============================================================
CREATE TABLE iihf2026.scoring_config (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,
    value       INT          NOT NULL,
    updated_by  INT REFERENCES admin.users(id),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO iihf2026.scoring_config (key, value) VALUES
    ('correct_winner_group',   1),
    ('correct_winner_playoff', 3),
    ('correct_goals_per_team', 1);

-- ============================================================
-- IIHF2026.TIPS
-- Tip mozno menit do 5 minut pred zapasom (tips_open = FALSE).
-- Admin moze tip zadat/upravit manualne (entered_by_admin = TRUE).
-- Hrac tipuje raz - tip plati vo vsetkych skupinach.
-- ============================================================
CREATE TABLE iihf2026.tips (
    id                SERIAL PRIMARY KEY,
    user_id           INT       REFERENCES admin.users(id)       NOT NULL,
    game_id           INT       REFERENCES iihf2026.games(game_id) NOT NULL,
    home_score_tip    INT       NOT NULL,
    away_score_tip    INT       NOT NULL,
    points_earned     INT,
    entered_by_admin  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- ============================================================
-- VERZIA
-- ============================================================
INSERT INTO admin.schema_versions (version, description)
VALUES (1, 'Initial schema: admin(users,groups,notifications) + iihf2026(teams,games,scoring,tips)');
