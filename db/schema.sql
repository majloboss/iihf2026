-- IIHF2026 - Databázová schéma
-- PostgreSQL
-- Hosting: fellow.sk

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE iihf.users (
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
    fcm_token         VARCHAR(255),                       -- Firebase Cloud Messaging token
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEAMS (číselník tímov)
-- ============================================================
CREATE TABLE iihf.teams (
    team_id    SERIAL PRIMARY KEY,
    team_code  VARCHAR(3)   NOT NULL UNIQUE,   -- FIN, GER, SVK...
    team_name  VARCHAR(100) NOT NULL,
    group_name VARCHAR(1)   NOT NULL            -- 'A' | 'B'
    -- vlajka: sources/flags/{team_code.lower()}.png (napr. svk.png, fin.png)
);

INSERT INTO iihf.teams (team_code, team_name, group_name) VALUES
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
-- NOTIFICATION SETTINGS (nastavenia notifikacii per user)
-- notif_type hodnoty:
--   game_start        - upozornenie na zaciatok zapasu (X minut pred)
--   untipped_game     - upozornenie na neopatipovany zapas (X minut pred)
--   result_entered    - upozornenie pri vlozeni vysledku adminom
--   group_stage_closed- upozornenie pri uzavreti zakladnej casti
--   new_games_added   - upozornenie pri pridani novych zapasov na tipovanie
-- ============================================================
CREATE TABLE iihf.notification_settings (
    user_id        INT          REFERENCES iihf.users(id) NOT NULL,
    notif_type     VARCHAR(30)  NOT NULL,
    push_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
    email_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
    minutes_before INT,         -- len pre game_start a untipped_game
    PRIMARY KEY (user_id, notif_type)
);

-- ============================================================
-- SCORING CONFIG (admin moze menit hodnoty)
-- Bodovanie za tip presneho vysledku riadnej hracej doby (60 min):
--   correct_winner_group    = 1  (spravny vitaz alebo remiza, skupinova faza)
--   correct_winner_playoff  = 3  (spravny vitaz, QF/SF/F/BM)
--   correct_goals_per_team  = 1  (za kazdy spravne tipovany pocet golov jedneho timu)
-- Maximum skupinova faza:  1 + 1 + 1 = 3 body
-- Maximum playoff:         3 + 1 + 1 = 5 bodov
-- ============================================================
CREATE TABLE iihf.scoring_config (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,
    value       INT          NOT NULL,
    updated_by  INT REFERENCES iihf.users(id),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO iihf.scoring_config (key, value) VALUES
    ('correct_winner_group',   1),
    ('correct_winner_playoff', 3),
    ('correct_goals_per_team', 1);

-- ============================================================
-- FRIEND GROUPS
-- Zaciatok: jedna skupina "Priatelia hokeja", vsetci users v nej
-- ============================================================
CREATE TABLE iihf.friend_groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20)  NOT NULL UNIQUE,
    created_by  INT REFERENCES iihf.users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO iihf.friend_groups (name, invite_code) VALUES
    ('Priatelia hokeja', 'IIHF2026');

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
-- Tip mozno menit do 5 minut pred zapasom (tips_open v games).
-- Admin moze tip zadat/upravit manualne aj po uzavreti (entered_by_admin = TRUE).
CREATE TABLE iihf.tips (
    id                SERIAL PRIMARY KEY,
    user_id           INT REFERENCES iihf.users(id)  NOT NULL,
    game_id           INT REFERENCES iihf.games(id)  NOT NULL,
    home_score_tip    INT       NOT NULL,
    away_score_tip    INT       NOT NULL,
    points_earned     INT,                           -- NULL kym zapas nie je odohrane
    entered_by_admin  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)                        -- jeden tip na zapas
);
