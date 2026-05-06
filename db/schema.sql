-- IIHF2026 - Databázová schéma
-- PostgreSQL
-- Hosting: fellow.sk

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE iihf.users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,          -- bcrypt hash
    first_name  VARCHAR(100),
    last_name   VARCHAR(100),
    email       VARCHAR(150) UNIQUE,
    phone       VARCHAR(30),
    role        VARCHAR(10)  NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE iihf.teams (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(3)  NOT NULL UNIQUE,    -- FIN, GER, SVK...
    name        VARCHAR(100) NOT NULL,
    group_name  VARCHAR(1)  NOT NULL            -- 'A' | 'B'
);

INSERT INTO iihf.teams (code, name, group_name) VALUES
    ('FIN', 'Finland',        'A'),
    ('GER', 'Germany',        'A'),
    ('USA', 'United States',  'A'),
    ('SUI', 'Switzerland',    'A'),
    ('GBR', 'Great Britain',  'A'),
    ('AUT', 'Austria',        'A'),
    ('HUN', 'Hungary',        'A'),
    ('LAT', 'Latvia',         'A'),
    ('CAN', 'Canada',         'B'),
    ('SWE', 'Sweden',         'B'),
    ('CZE', 'Czech Republic', 'B'),
    ('DEN', 'Denmark',        'B'),
    ('SVK', 'Slovakia',       'B'),
    ('NOR', 'Norway',         'B'),
    ('ITA', 'Italy',          'B'),
    ('SLO', 'Slovenia',       'B');

-- ============================================================
-- GAMES (zápasy)
-- ============================================================
CREATE TABLE iihf.games (
    id              SERIAL PRIMARY KEY,
    game_number     INT          NOT NULL UNIQUE,       -- 1..64
    phase           VARCHAR(20)  NOT NULL,              -- 'preliminary' | 'quarterfinal' | 'semifinal' | 'bronze' | 'final'
    group_name      VARCHAR(1),                         -- 'A' | 'B' | NULL pre playoff
    home_team_id    INT REFERENCES iihf.teams(id),     -- NULL kym sa nezna (playoff)
    away_team_id    INT REFERENCES iihf.teams(id),     -- NULL kym sa nezna (playoff)
    start_time      TIMESTAMP    NOT NULL,
    venue           VARCHAR(100) NOT NULL,
    home_score      INT,                                -- NULL = este neodohrany
    away_score      INT,                                -- NULL = este neodohrany
    status          VARCHAR(15)  NOT NULL DEFAULT 'scheduled' -- 'scheduled' | 'finished'
);

-- ============================================================
-- SCORING CONFIG (admin nastavuje body)
-- ============================================================
CREATE TABLE iihf.scoring_config (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,   -- napr. 'exact_score', 'correct_winner'
    value       INT          NOT NULL,
    updated_by  INT REFERENCES iihf.users(id),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Predvolene hodnoty bodov (❓ upresni admin)
INSERT INTO iihf.scoring_config (key, value) VALUES
    ('correct_winner',  2),   -- spravny vitaz
    ('exact_score',     5);   -- presne skore

-- ============================================================
-- FRIEND GROUPS (❓ este nerozhodnute: 1 alebo viac skupin)
-- ============================================================
CREATE TABLE iihf.friend_groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20)  NOT NULL UNIQUE,
    created_by  INT REFERENCES iihf.users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE iihf.group_members (
    group_id    INT REFERENCES iihf.friend_groups(id),
    user_id     INT REFERENCES iihf.users(id),
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- TIPS (tipy pouzivatelov)
-- ❓ este nerozhodnute: len vitaz alebo aj presne skore
-- Zatial dizajn pre presne skore (pokryje obe moznosti)
-- ============================================================
CREATE TABLE iihf.tips (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES iihf.users(id)  NOT NULL,
    game_id         INT REFERENCES iihf.games(id)  NOT NULL,
    home_score_tip  INT          NOT NULL,
    away_score_tip  INT          NOT NULL,
    points_earned   INT,                            -- NULL kym zapas nie je odohrane
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)                       -- jeden tip na zapas
);
