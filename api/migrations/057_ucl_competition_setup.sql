-- Migration 057: sprevadzkovanie sutaze UEFA Champions League 2026/27
--
-- Doplna oficialny nazov, livescore stlpce (rovnake ako ma FIFA) a index
-- pre rychle nacitanie zapasov. Sutaz zostava neaktivna, kym ju admin nezapne.

BEGIN;

-- 1. Oficialny nazov sutaze.
UPDATE admin.competitions
   SET name = 'UEFA Champions League 2026/27',
       starts_at = '2026-09-08',
       ends_at   = '2027-05-29'
 WHERE slug = 'ucl2026';

-- Ak by sutaz z nejakeho dovodu chybala, zaloz ju.
INSERT INTO admin.competitions (slug, name, sport, season, is_active, starts_at, ends_at)
VALUES ('ucl2026', 'UEFA Champions League 2026/27', 'football', '2026/27', FALSE, '2026-09-08', '2027-05-29')
ON CONFLICT (slug) DO NOTHING;

-- 2. Livescore stlpce, aby sa UCL spravalo rovnako ako FIFA.
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS ls_home       INT;
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS ls_away       INT;
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS ls_status     VARCHAR(30);
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS ls_updated_at TIMESTAMP;
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS ls_next_poll  TIMESTAMP;

-- 3. group_standings.team drzi kod klubu, nie statu — VARCHAR(3) nestaci
--    (napr. S_BRATISLAVA ma 12 znakov).
ALTER TABLE "lm2026-27".group_standings ALTER COLUMN team TYPE VARCHAR(20);

-- 4. Indexy pre bezne dopyty.
CREATE INDEX IF NOT EXISTS ucl_games_start_idx  ON "lm2026-27".games (start_time, game_id);
CREATE INDEX IF NOT EXISTS ucl_games_phase_idx  ON "lm2026-27".games (game_type_code);
CREATE INDEX IF NOT EXISTS ucl_tips_user_idx    ON "lm2026-27".tips (user_id);
CREATE INDEX IF NOT EXISTS ucl_tips_game_idx    ON "lm2026-27".tips (game_id);

-- 5. Granty pre aplikacneho pouzivatela.
GRANT USAGE ON SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "lm2026-27" TO "dbbet-admin";

-- 6. Sprístupnit sutaz v prepinaci.
--    Zoznam sutazi vracia iba is_active = TRUE, takze bez tohto by sa UCL
--    v aplikacii vôbec neponukla. Zapasy uz existuju, tipovat sa da.
UPDATE admin.competitions SET is_active = TRUE WHERE slug = 'ucl2026';

INSERT INTO admin.schema_versions (version, description)
VALUES (57, 'UEFA Champions League 2026/27: nazov sutaze, livescore stlpce a indexy')
ON CONFLICT (version) DO NOTHING;

COMMIT;
