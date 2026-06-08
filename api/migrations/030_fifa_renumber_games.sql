-- Migration 030: Prečíslovanie FIFA zápasov podľa chronologického poradia (start_time)
-- game_id sa zmení tak, aby #1 = prvý hraný zápas atď.
-- tips.game_id je FK na games.game_id → dočasne zrušiť, prečíslovať, obnoviť.

BEGIN;

-- Zruš FK z tips
ALTER TABLE fifa2026.tips DROP CONSTRAINT IF EXISTS tips_game_id_fkey;

-- Mapovanie staré → nové podľa chronológie
CREATE TEMP TABLE _fifa_id_map ON COMMIT DROP AS
SELECT game_id AS old_id,
       ROW_NUMBER() OVER (ORDER BY start_time, game_id) AS new_id
FROM fifa2026.games;

-- Posun do vysokého rozsahu (zabráni kolízii PK počas prečíslovania)
UPDATE fifa2026.games SET game_id = game_id + 100000;
UPDATE fifa2026.tips  SET game_id = game_id + 100000;

-- Nastav nové game_id
UPDATE fifa2026.games g SET game_id = m.new_id
FROM _fifa_id_map m WHERE g.game_id = m.old_id + 100000;

UPDATE fifa2026.tips t SET game_id = m.new_id
FROM _fifa_id_map m WHERE t.game_id = m.old_id + 100000;

-- Obnov FK
ALTER TABLE fifa2026.tips
    ADD CONSTRAINT tips_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES fifa2026.games(game_id);

INSERT INTO admin.schema_versions (version, description)
VALUES (30, 'FIFA: precislovanie zapasov podla start_time')
ON CONFLICT (version) DO NOTHING;

COMMIT;
