-- Migration 059: dvojice zapas-odveta v playoff LM
--
-- V playoff (okrem finale) sa hraju dva zapasy a o postupe rozhoduje SUCET golov
-- z oboch. Predlzenie sa hra az v odvete a len vtedy, ked je sucet rovnaky —
-- nie pri remize v samotnej odvete.
--
-- Bez oznacenia dvojice sa sucet neda spocitat, preto pribuda:
--   tie_id — spolocny identifikator dvojice (napr. 'PO-3'), NULL pre ligovu fazu
--   leg    — 1 = prvy zapas, 2 = odveta, NULL pre ligovu fazu a finale
--
-- Finale sa hra na jeden zapas, predlzenie pri remize po 90 minutach.

BEGIN;

ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS tie_id VARCHAR(20);
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS leg    SMALLINT;

COMMENT ON COLUMN "lm2026-27".games.tie_id IS 'Dvojica zapas-odveta, napr. PO-3; NULL pre ligovu fazu a finale';
COMMENT ON COLUMN "lm2026-27".games.leg    IS '1 = prvy zapas, 2 = odveta; NULL ked sa dvojzapas nehra';

ALTER TABLE "lm2026-27".games DROP CONSTRAINT IF EXISTS ucl_games_leg_check;
ALTER TABLE "lm2026-27".games ADD  CONSTRAINT ucl_games_leg_check
    CHECK (leg IS NULL OR leg IN (1, 2));

CREATE INDEX IF NOT EXISTS ucl_games_tie_idx ON "lm2026-27".games (tie_id, leg);

-- Doplnenie dvojic k uz vygenerovanym zapasom.
-- Zapasy kazdej fazy su v poradí: najprv vsetky prve zapasy, potom vsetky odvety.
-- N-ty prvy zapas patri k N-tej odvete.
WITH ocislovane AS (
    SELECT game_id,
           game_type_code,
           CASE WHEN game_type_name LIKE '%odveta%' THEN 2 ELSE 1 END AS leg_no,
           ROW_NUMBER() OVER (
               PARTITION BY game_type_code,
                            CASE WHEN game_type_name LIKE '%odveta%' THEN 2 ELSE 1 END
               ORDER BY game_id
           ) AS poradie
      FROM "lm2026-27".games
     WHERE game_type_code IN ('PO', 'R16', 'QF', 'SF')
)
UPDATE "lm2026-27".games g
   SET tie_id = o.game_type_code || '-' || o.poradie,
       leg    = o.leg_no,
       updated_at = NOW()
  FROM ocislovane o
 WHERE g.game_id = o.game_id;

-- Kontrola: kazda dvojica musi mat presne dva zapasy (prvy a odvetu).
DO $$
DECLARE zle INTEGER; zoznam TEXT;
BEGIN
    SELECT COUNT(*), string_agg(tie_id, ', ')
      INTO zle, zoznam
      FROM (
          SELECT tie_id
            FROM "lm2026-27".games
           WHERE tie_id IS NOT NULL
           GROUP BY tie_id
          HAVING COUNT(*) <> 2
              OR COUNT(DISTINCT leg) <> 2
      ) x;
    IF zle > 0 THEN
        RAISE EXCEPTION 'Chybne dvojice (%): %', zle, zoznam;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (59, 'Dvojice zapas-odveta v playoff LM (tie_id, leg)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
