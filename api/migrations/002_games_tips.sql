-- Migration 002: games, tips, teams, scoring_config
-- Schema: iihf2026 (separate from admin)

CREATE SCHEMA IF NOT EXISTS iihf2026;

-- Resetuj tabulky (bezpecne pre prazdnu DB pred turnajom)
DROP TABLE IF EXISTS iihf2026.tips CASCADE;
DROP TABLE IF EXISTS iihf2026.scoring_config CASCADE;
DROP TABLE IF EXISTS iihf2026.games CASCADE;
DROP TABLE IF EXISTS iihf2026.teams CASCADE;

-- Teams
CREATE TABLE iihf2026.teams (
    code   VARCHAR(3) PRIMARY KEY,
    name   VARCHAR(60) NOT NULL,
    group_letter CHAR(1) NOT NULL  -- 'A' or 'B'
);

INSERT INTO iihf2026.teams (code, name, group_letter) VALUES
  ('FIN','Finland','A'),('GER','Germany','A'),('USA','United States','A'),
  ('SUI','Switzerland','A'),('GBR','Great Britain','A'),('AUT','Austria','A'),
  ('HUN','Hungary','A'),('LAT','Latvia','A'),
  ('CAN','Canada','B'),('SWE','Sweden','B'),('CZE','Czech Republic','B'),
  ('DEN','Denmark','B'),('SVK','Slovakia','B'),('NOR','Norway','B'),
  ('ITA','Italy','B'),('SLO','Slovenia','B');
-- Games
CREATE TABLE iihf2026.games (
    id          SERIAL PRIMARY KEY,
    game_number INTEGER NOT NULL UNIQUE,
    phase       VARCHAR(8) NOT NULL,  -- 'A','B','QF','SF','BRONZE','GOLD'
    team1       VARCHAR(3) REFERENCES iihf2026.teams(code),
    team2       VARCHAR(3) REFERENCES iihf2026.teams(code),
    starts_at   TIMESTAMPTZ NOT NULL,
    venue       VARCHAR(50) NOT NULL,
    score1      SMALLINT,
    score2      SMALLINT,
    status      VARCHAR(10) NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','live','finished'))
);

INSERT INTO iihf2026.games (game_number, phase, team1, team2, starts_at, venue) VALUES
-- FRI 15 MAY
(1,'A','FIN','GER','2026-05-15 14:20+00','Zurich / Swiss Life Arena'),
(2,'B','CAN','SWE','2026-05-15 14:20+00','Fribourg / BCF Arena'),
(3,'A','USA','SUI','2026-05-15 18:20+00','Zurich / Swiss Life Arena'),
(4,'B','CZE','DEN','2026-05-15 18:20+00','Fribourg / BCF Arena'),
-- SAT 16 MAY
(5,'A','GBR','AUT','2026-05-16 10:20+00','Zurich / Swiss Life Arena'),
(6,'B','SVK','NOR','2026-05-16 10:20+00','Fribourg / BCF Arena'),
(7,'A','HUN','FIN','2026-05-16 14:20+00','Zurich / Swiss Life Arena'),
(8,'B','ITA','CAN','2026-05-16 14:20+00','Fribourg / BCF Arena'),
(9,'A','SUI','LAT','2026-05-16 18:20+00','Zurich / Swiss Life Arena'),
(10,'B','SLO','CZE','2026-05-16 18:20+00','Fribourg / BCF Arena'),
-- SUN 17 MAY
(11,'A','GBR','USA','2026-05-17 10:20+00','Zurich / Swiss Life Arena'),
(12,'B','ITA','SVK','2026-05-17 10:20+00','Fribourg / BCF Arena'),
(13,'A','AUT','HUN','2026-05-17 14:20+00','Zurich / Swiss Life Arena'),
(14,'B','DEN','SWE','2026-05-17 14:20+00','Fribourg / BCF Arena'),
(15,'A','GER','SUI','2026-05-17 18:20+00','Zurich / Swiss Life Arena'),
(16,'B','NOR','SLO','2026-05-17 18:20+00','Fribourg / BCF Arena'),
-- MON 18 MAY
(17,'A','FIN','USA','2026-05-18 14:20+00','Zurich / Swiss Life Arena'),
(18,'B','CAN','DEN','2026-05-18 14:20+00','Fribourg / BCF Arena'),
(19,'A','LAT','GER','2026-05-18 18:20+00','Zurich / Swiss Life Arena'),
(20,'B','SWE','CZE','2026-05-18 18:20+00','Fribourg / BCF Arena'),
-- TUE 19 MAY
(21,'A','LAT','AUT','2026-05-19 14:20+00','Zurich / Swiss Life Arena'),
(22,'B','ITA','NOR','2026-05-19 14:20+00','Fribourg / BCF Arena'),
(23,'A','HUN','GBR','2026-05-19 18:20+00','Zurich / Swiss Life Arena'),
(24,'B','SLO','SVK','2026-05-19 18:20+00','Fribourg / BCF Arena'),
-- WED 20 MAY
(25,'A','AUT','GER','2026-05-20 14:20+00','Zurich / Swiss Life Arena'),
(26,'B','CZE','SVK','2026-05-20 14:20+00','Fribourg / BCF Arena'),
(27,'A','SUI','GBR','2026-05-20 18:20+00','Zurich / Swiss Life Arena'),
(28,'B','SWE','SLO','2026-05-20 18:20+00','Fribourg / BCF Arena'),
-- THU 21 MAY
(29,'A','LAT','FIN','2026-05-21 14:20+00','Zurich / Swiss Life Arena'),
(30,'B','CAN','NOR','2026-05-21 14:20+00','Fribourg / BCF Arena'),
(31,'A','SUI','HUN','2026-05-21 18:20+00','Zurich / Swiss Life Arena'),
(32,'B','DEN','SLO','2026-05-21 18:20+00','Fribourg / BCF Arena'),
-- FRI 22 MAY
(33,'A','GER','HUN','2026-05-22 14:20+00','Zurich / Swiss Life Arena'),
(34,'B','CAN','SLO','2026-05-22 14:20+00','Fribourg / BCF Arena'),
(35,'A','FIN','GBR','2026-05-22 18:20+00','Zurich / Swiss Life Arena'),
(36,'B','SWE','ITA','2026-05-22 18:20+00','Fribourg / BCF Arena'),
-- SAT 23 MAY
(37,'A','LAT','USA','2026-05-23 10:20+00','Zurich / Swiss Life Arena'),
(38,'B','SWE','NOR','2026-05-23 10:20+00','Fribourg / BCF Arena'),
(39,'A','SUI','AUT','2026-05-23 14:20+00','Zurich / Swiss Life Arena'),
(40,'B','CZE','ITA','2026-05-23 14:20+00','Fribourg / BCF Arena'),
(41,'A','GER','USA','2026-05-23 18:20+00','Zurich / Swiss Life Arena'),
(42,'B','DEN','SVK','2026-05-23 18:20+00','Fribourg / BCF Arena'),
-- SUN 24 MAY
(43,'A','GBR','LAT','2026-05-24 14:20+00','Zurich / Swiss Life Arena'),
(44,'B','DEN','ITA','2026-05-24 14:20+00','Fribourg / BCF Arena'),
(45,'A','FIN','AUT','2026-05-24 18:20+00','Zurich / Swiss Life Arena'),
(46,'B','SVK','CAN','2026-05-24 18:20+00','Fribourg / BCF Arena'),
-- MON 25 MAY
(47,'A','USA','HUN','2026-05-25 14:20+00','Zurich / Swiss Life Arena'),
(48,'B','CZE','NOR','2026-05-25 14:20+00','Fribourg / BCF Arena'),
(49,'A','GER','GBR','2026-05-25 18:20+00','Zurich / Swiss Life Arena'),
(50,'B','SLO','ITA','2026-05-25 18:20+00','Fribourg / BCF Arena'),
-- TUE 26 MAY
(51,'A','HUN','LAT','2026-05-26 10:20+00','Zurich / Swiss Life Arena'),
(52,'B','NOR','DEN','2026-05-26 10:20+00','Fribourg / BCF Arena'),
(53,'A','USA','AUT','2026-05-26 14:20+00','Zurich / Swiss Life Arena'),
(54,'B','SWE','SVK','2026-05-26 14:20+00','Fribourg / BCF Arena'),
(55,'A','SUI','FIN','2026-05-26 18:20+00','Zurich / Swiss Life Arena'),
(56,'B','CZE','CAN','2026-05-26 18:20+00','Fribourg / BCF Arena'),
-- THU 28 MAY — Quarterfinals
(57,'QF',NULL,NULL,'2026-05-28 14:20+00','Zurich / Swiss Life Arena'),
(58,'QF',NULL,NULL,'2026-05-28 14:20+00','Fribourg / BCF Arena'),
(59,'QF',NULL,NULL,'2026-05-28 18:20+00','Zurich / Swiss Life Arena'),
(60,'QF',NULL,NULL,'2026-05-28 18:20+00','Fribourg / BCF Arena'),
-- SAT 30 MAY — Semifinals
(61,'SF',NULL,NULL,'2026-05-30 13:20+00','Zurich / Swiss Life Arena'),
(62,'SF',NULL,NULL,'2026-05-30 18:00+00','Zurich / Swiss Life Arena'),
-- SUN 31 MAY — Finals
(63,'BRONZE',NULL,NULL,'2026-05-31 13:20+00','Zurich / Swiss Life Arena'),
(64,'GOLD',NULL,NULL,'2026-05-31 18:20+00','Zurich / Swiss Life Arena')
;

-- Tips
CREATE TABLE iihf2026.tips (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    game_id    INTEGER NOT NULL REFERENCES iihf2026.games(id),
    tip1       SMALLINT NOT NULL CHECK (tip1 >= 0),
    tip2       SMALLINT NOT NULL CHECK (tip2 >= 0),
    points     SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, game_id)
);

-- Scoring config
CREATE TABLE iihf2026.scoring_config (
    phase      VARCHAR(8) PRIMARY KEY,
    pts_winner SMALLINT NOT NULL DEFAULT 1,
    pts_goals1 SMALLINT NOT NULL DEFAULT 1,
    pts_goals2 SMALLINT NOT NULL DEFAULT 1
);

INSERT INTO iihf2026.scoring_config (phase, pts_winner, pts_goals1, pts_goals2) VALUES
  ('A',1,1,1),('B',1,1,1),
  ('QF',3,1,1),('SF',3,1,1),('BRONZE',3,1,1),('GOLD',3,1,1)
;
