-- Migration 038: friend_groups.description rozšírenie na VARCHAR(1000)
ALTER TABLE admin.friend_groups ALTER COLUMN description TYPE VARCHAR(1000);

INSERT INTO admin.schema_versions (version, description)
VALUES (38, 'friend_groups.description rozšírená na 1000 znakov')
ON CONFLICT (version) DO NOTHING;
