-- Migration 032: Oprava knockout rozpisu FIFA (R32–Finále) — presné časy (UTC) a štadióny
-- Zdroj: openfootball/world-cup 2026--usa/cup_finals.txt (oficiálny rozpis)
-- game_id 73–104 = reálne čísla zápasov (po prečíslovaní 030).
-- Aktualizuje fifa2026.games aj fifa2026.games_pdf (master).

CREATE TEMP TABLE _ko (gid INT, st TIMESTAMP, venue VARCHAR(100)) ON COMMIT DROP;

INSERT INTO _ko (gid, st, venue) VALUES
-- Round of 32
(73,  '2026-06-28 19:00:00', 'Los Angeles'),
(74,  '2026-06-29 20:30:00', 'Boston'),
(75,  '2026-06-30 01:00:00', 'Monterrey'),
(76,  '2026-06-29 17:00:00', 'Houston'),
(77,  '2026-06-30 21:00:00', 'New York/New Jersey'),
(78,  '2026-06-30 17:00:00', 'Dallas'),
(79,  '2026-07-01 01:00:00', 'Mexico City'),
(80,  '2026-07-01 16:00:00', 'Atlanta'),
(81,  '2026-07-02 00:00:00', 'San Francisco'),
(82,  '2026-07-01 20:00:00', 'Seattle'),
(83,  '2026-07-02 23:00:00', 'Toronto'),
(84,  '2026-07-02 19:00:00', 'Los Angeles'),
(85,  '2026-07-03 03:00:00', 'Vancouver'),
(86,  '2026-07-03 22:00:00', 'Miami'),
(87,  '2026-07-04 01:30:00', 'Kansas City'),
(88,  '2026-07-03 18:00:00', 'Dallas'),
-- Round of 16
(89,  '2026-07-04 21:00:00', 'Philadelphia'),
(90,  '2026-07-04 17:00:00', 'Houston'),
(91,  '2026-07-05 20:00:00', 'New York/New Jersey'),
(92,  '2026-07-06 00:00:00', 'Mexico City'),
(93,  '2026-07-06 19:00:00', 'Dallas'),
(94,  '2026-07-07 00:00:00', 'Seattle'),
(95,  '2026-07-07 16:00:00', 'Atlanta'),
(96,  '2026-07-07 20:00:00', 'Vancouver'),
-- Quarter-finals
(97,  '2026-07-09 20:00:00', 'Boston'),
(98,  '2026-07-10 19:00:00', 'Los Angeles'),
(99,  '2026-07-11 21:00:00', 'Miami'),
(100, '2026-07-12 01:00:00', 'Kansas City'),
-- Semi-finals
(101, '2026-07-14 19:00:00', 'Dallas'),
(102, '2026-07-15 19:00:00', 'Atlanta'),
-- Bronze
(103, '2026-07-18 21:00:00', 'Miami'),
-- Final
(104, '2026-07-19 19:00:00', 'New York/New Jersey');

UPDATE fifa2026.games g
SET start_time = k.st, venue = k.venue, updated_at = NOW()
FROM _ko k WHERE g.game_id = k.gid;

UPDATE fifa2026.games_pdf p
SET start_time = k.st, venue = k.venue
FROM _ko k WHERE p.game_id = k.gid;

INSERT INTO admin.schema_versions (version, description)
VALUES (32, 'FIFA: oprava knockout casov a stadionov (R32-Final) z oficialneho rozpisu')
ON CONFLICT (version) DO NOTHING;
