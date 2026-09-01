-- Migration 047: prava aplikacneho DB usera pre UCL
-- Bez tychto grantov API skonci na permission denied for schema.

GRANT USAGE ON SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "lm2026-27" TO "dbbet-admin";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA "lm2026-27" TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (47, 'UCL prava pre dbbet-admin: schema, tabulky a sekvencie')
ON CONFLICT (version) DO NOTHING;
