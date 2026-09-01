-- Migration 060: polcasove skore zapasov LM
--
-- Livescore vie polcasove skore precitat, preto ma kam ukladat. Ostatne udaje
-- z feedu (karty, strelci) sa neukladaju — ked livescore vypadne, nemal by ich
-- kto doplnit rucne a nekompletny udaj je horsi nez ziadny.
--
-- Stlpce su nullable: pri zapase pred polcasom este hodnota neexistuje.

BEGIN;

ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS home_score_halftime SMALLINT;
ALTER TABLE "lm2026-27".games ADD COLUMN IF NOT EXISTS away_score_halftime SMALLINT;

COMMENT ON COLUMN "lm2026-27".games.home_score_halftime IS 'Goly domacich po 1. polcase, z livescore';
COMMENT ON COLUMN "lm2026-27".games.away_score_halftime IS 'Goly hosti po 1. polcase, z livescore';

ALTER TABLE "lm2026-27".games DROP CONSTRAINT IF EXISTS ucl_games_halftime_check;
ALTER TABLE "lm2026-27".games ADD  CONSTRAINT ucl_games_halftime_check
    CHECK ((home_score_halftime IS NULL OR home_score_halftime BETWEEN 0 AND 99)
       AND (away_score_halftime IS NULL OR away_score_halftime BETWEEN 0 AND 99));

INSERT INTO admin.schema_versions (version, description)
VALUES (60, 'Polcasove skore zapasov LM (home/away_score_halftime)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
