-- Migration 035: popis / podmienka vstupu pre skupinu priateľov
ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS description VARCHAR(500);

INSERT INTO admin.schema_versions (version, description)
VALUES (35, 'friend_groups.description (podmienka vstupu)')
ON CONFLICT (version) DO NOTHING;
