-- Migration 064: previest vlastnictvo tabuliek LM na aplikacneho pouzivatela
--
-- Migracia 063 dala dbbet-adminovi pravo CREATE v scheme, takze nove tabulky uz
-- zalozi sam. Na ALTER TABLE existujucej tabulky to ale nestaci — Postgres pri
-- nej vyzaduje vlastnictvo, takze migracia 060 skoncila na
-- "must be owner of table games".
--
-- Prave preto sa 060 nespustila a v games chybali stlpce polcasoveho skore,
-- na ktore sa dopytuje v1/ucl/games.php — pouzivatelovi to spadlo na
-- "column g.home_score_halftime does not exist".
--
-- Prevodom vlastnictva sa dalsie migracie schemy uz daju spustat cez
-- tools/run_migration.cjs a takyto vypadok sa nezopakuje.
--
-- Tuto migraciu musi spustit doterajsi vlastnik (dbdevbet-admin) z databazovej
-- konzoly — vlastnictvo moze odovzdat iba on.
--
-- Postgres navyse vyzaduje, aby ten, kto vlastnictvo odovzdava, bol clenom
-- cielovej role. Bez toho skonci na "must be member of role dbbet-admin",
-- preto sa clenstvo najprv udeli.

BEGIN;

-- Bez clenstva v cielovej roli by ALTER TABLE ... OWNER TO neprelo.
GRANT "dbbet-admin" TO CURRENT_USER;

ALTER TABLE "lm2026-27".games           OWNER TO "dbbet-admin";
ALTER TABLE "lm2026-27".tips            OWNER TO "dbbet-admin";
ALTER TABLE "lm2026-27".scoring_config  OWNER TO "dbbet-admin";
ALTER TABLE "lm2026-27".group_standings OWNER TO "dbbet-admin";
ALTER TABLE "lm2026-27".games_pdf       OWNER TO "dbbet-admin";

-- Sekvencie patriace k tymto tabulkam.
ALTER SEQUENCE IF EXISTS "lm2026-27".tips_id_seq           OWNER TO "dbbet-admin";
ALTER SEQUENCE IF EXISTS "lm2026-27".scoring_config_id_seq OWNER TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (64, 'Vlastnictvo tabuliek LM prevedene na dbbet-admin, aby presli ALTER TABLE migracie')
ON CONFLICT (version) DO NOTHING;

COMMIT;
