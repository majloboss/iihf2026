-- Migration 027: Premenuj IIHF súťaž na správny anglický názov
UPDATE admin.competitions
SET name = 'IIHF World Championship 2026'
WHERE slug = 'iihf2026';

INSERT INTO admin.schema_versions (version, description)
VALUES (27, 'Rename: MS v ladovom hokeji 2026 -> IIHF World Championship 2026')
ON CONFLICT (version) DO NOTHING;
