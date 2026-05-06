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
-- STATES (číselník štátov)
-- ============================================================
CREATE TABLE iihf.teams (
    team_id    SERIAL PRIMARY KEY,
    team_code  VARCHAR(3)   NOT NULL UNIQUE,   -- FIN, GER, SVK...
    team_name  VARCHAR(100) NOT NULL,
    group_name VARCHAR(1)   NOT NULL,           -- 'A' | 'B'
    flag_col   INT          NOT NULL,           -- stlpec v sprite sheet: 0-3
    flag_row   INT          NOT NULL            -- riadok v sprite sheet: 0-1
);

-- Sprite: team_flags.png, mriezka 4x2 per skupina
-- Skupina A vlavo, skupina B vpravo
-- flag_col: 0-3 (zlava), flag_row: 0-1 (zhora)
INSERT INTO iihf.teams (team_code, team_name, group_name, flag_col, flag_row) VALUES
    ('USA', 'United States',  'A', 0, 0),
    ('SUI', 'Switzerland',    'A', 1, 0),
    ('FIN', 'Finland',        'A', 2, 0),
    ('GER', 'Germany',        'A', 3, 0),
    ('LAT', 'Latvia',         'A', 0, 1),
    ('AUT', 'Austria',        'A', 1, 1),
    ('HUN', 'Hungary',        'A', 2, 1),
    ('GBR', 'Great Britain',  'A', 3, 1),
    ('CAN', 'Canada',         'B', 0, 0),
    ('SWE', 'Sweden',         'B', 1, 0),
    ('CZE', 'Czech Republic', 'B', 2, 0),
    ('DEN', 'Denmark',        'B', 3, 0),
    ('SVK', 'Slovakia',       'B', 0, 1),
    ('NOR', 'Norway',         'B', 1, 1),
    ('SLO', 'Slovenia',       'B', 2, 1),
    ('ITA', 'Italy',          'B', 3, 1);

-- ============================================================
-- GAMES (zápasy)
-- ============================================================
CREATE TABLE iihf.games (
    game_id             INT          PRIMARY KEY,           -- cislo zapasu z PDF: 1..64
    home_team_id        INT          REFERENCES iihf.teams(team_id),  -- NULL kym sa nezna (playoff)
    away_team_id        INT          REFERENCES iihf.teams(team_id),  -- NULL kym sa nezna (playoff)
    start_time          TIMESTAMP    NOT NULL,
    venue               VARCHAR(100) NOT NULL,
    tips_open           BOOLEAN      NOT NULL DEFAULT TRUE,  -- TRUE = tipovanie otvorene

    -- vysledok riadnej hracej doby
    home_score_regular  INT,                                -- NULL = este neodohrany
    away_score_regular  INT,

    -- konecny vysledok (moze sa lisit od riadnej doby pri predlzeni/samostatnych nakopoch)
    home_score_final    INT,
    away_score_final    INT,
    home_points         INT,                                -- body do tabulky pre domacich
    away_points         INT,                                -- body do tabulky pre hostí

    result_approved     BOOLEAN      NOT NULL DEFAULT FALSE, -- admin schvalil vysledok

    -- typ zapasu
    game_type_code      VARCHAR(10)  NOT NULL,              -- GROUP_A | GROUP_B | QF | SF | BM | F
    game_type_name      VARCHAR(50)  NOT NULL               -- Skupinova faza - Skupina A/B | Stvrtfinale | Semifinale | O bronz | Finale
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
