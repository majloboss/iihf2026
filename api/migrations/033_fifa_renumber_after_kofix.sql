-- Migration 033: Prečíslovanie FIFA zápasov podľa chronológie (po oprave knockout časov v 032)
-- Poradie sa berie z fifa2026.games_pdf (master = reálny rozpis).
-- Aplikuje sa na games, games_pdf aj tips. tips.game_id je FK → dočasne zrušiť.
-- DBeaver: spusti CELÝ skript naraz (BEGIN/COMMIT drží TEMP tabuľku).

BEGIN;

ALTER TABLE fifa2026.tips DROP CONSTRAINT IF EXISTS tips_game_id_fkey;

-- Mapovanie staré → nové podľa chronológie (z master rozpisu)
CREATE TEMP TABLE _fifa_map ON COMMIT DROP AS
SELECT game_id AS old_id,
       ROW_NUMBER() OVER (ORDER BY start_time, game_id) AS new_id
FROM fifa2026.games_pdf;

-- Posun do vysokého rozsahu (zabráni kolízii PK)
UPDATE fifa2026.games     SET game_id = game_id + 100000;
UPDATE fifa2026.games_pdf SET game_id = game_id + 100000;
UPDATE fifa2026.tips      SET game_id = game_id + 100000;

-- Nastav nové game_id
UPDATE fifa2026.games g     SET game_id = m.new_id FROM _fifa_map m WHERE g.game_id = m.old_id + 100000;
UPDATE fifa2026.games_pdf p SET game_id = m.new_id FROM _fifa_map m WHERE p.game_id = m.old_id + 100000;
UPDATE fifa2026.tips t      SET game_id = m.new_id FROM _fifa_map m WHERE t.game_id = m.old_id + 100000;

-- Obnov FK
ALTER TABLE fifa2026.tips
    ADD CONSTRAINT tips_game_id_fkey
    FOREIGN KEY (game_id) REFERENCES fifa2026.games(game_id);

INSERT INTO admin.schema_versions (version, description)
VALUES (33, 'FIFA: precislovanie zapasov po oprave knockout casov (z games_pdf)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
