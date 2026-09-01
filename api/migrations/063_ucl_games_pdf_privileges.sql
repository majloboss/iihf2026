-- Migration 063: pravo zakladat tabulky v schemach pre aplikacneho pouzivatela
--
-- Schemy admin, iihf2026 aj "lm2026-27" vlastni dbdevbet-admin, kym aplikacia
-- a nastroje sa pripajaju ako dbbet-admin. Ten ma len DML prava, takze migraciu
-- 062 (CREATE TABLE games_pdf) nedokaze spustit — skonci na
-- "permission denied for schema lm2026-27".
--
-- Tuto migraciu preto treba spustit pod vlastnikom schemy (dbdevbet-admin),
-- napriklad z databazovej konzoly Websupportu. Potom uz vsetky dalsie migracie
-- vratane 062 prejdu aj cez tools/run_migration.cjs.

BEGIN;

GRANT CREATE, USAGE ON SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT CREATE, USAGE ON SCHEMA admin       TO "dbbet-admin";
GRANT CREATE, USAGE ON SCHEMA iihf2026    TO "dbbet-admin";

-- Aby tabulky zalozene vlastnikom boli pouzitelne aj pre aplikaciu.
ALTER DEFAULT PRIVILEGES IN SCHEMA "lm2026-27"
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "dbbet-admin";
ALTER DEFAULT PRIVILEGES IN SCHEMA "lm2026-27"
    GRANT USAGE, SELECT ON SEQUENCES TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (63, 'CREATE pravo v schemach pre dbbet-admin, aby sa dali migracie spustat z nastrojov')
ON CONFLICT (version) DO NOTHING;

COMMIT;
