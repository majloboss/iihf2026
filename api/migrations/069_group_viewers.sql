-- Migration 069: zoznam ludi, ktori vidia skrytu skupinu
--
-- POZOR: obsahuje CREATE TABLE, spusti ju z databazovej konzoly pod
--        vlastnikom schemy (dbdevbet-admin).
--
-- Migracia 068 riesila viditelnost cez clenstvo, teda cez pozvanku. Lenze
-- pozvanka je zaroven vstupenka — pozvany ju iba prijme a je v skupine bez
-- splnenia podmienky. To pri skupine, kde sa hra o peniaze, nestaci.
--
-- Zakladatel potrebuje vymenovat ludi, ktori sa o skupine dozvedia, ale vstup
-- si musia vypytat ako ktokolvek iny — teda splnit podmienku a poziadat.
-- Vymenovanie preto nie je clenstvo a zije vo vlastnej tabulke.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.group_viewers (
    group_id   INT       NOT NULL REFERENCES admin.friend_groups(id) ON DELETE CASCADE,
    user_id    INT       NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    added_by   INT       REFERENCES admin.users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

COMMENT ON TABLE admin.group_viewers IS
    'Kto vidi skrytu skupinu v zozname; vstup si musi vypytat ziadostou';

CREATE INDEX IF NOT EXISTS group_viewers_user_idx ON admin.group_viewers (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin.group_viewers TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (69, 'Zoznam ludi, ktori vidia skrytu skupinu (group_viewers)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
