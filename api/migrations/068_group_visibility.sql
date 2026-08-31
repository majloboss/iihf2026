-- Migration 068: skryte skupiny viditelne iba pozvanym
--
-- POZOR: obsahuje ALTER TABLE, preto ju treba spustit z databazovej konzoly
--        pod vlastnikom schemy (dbdevbet-admin).
--
-- Skupiny boli doteraz verejne pre vsetkych — v zozname ich videl kazdy a
-- kazdy mohol poziadat o vstup. Pri skupinach, kde sa hra o peniaze, to
-- zakladatelovi nedovoli vybrat si, kto sa vobec dozvie, ze skupina existuje.
--
-- Pribuda viditelnost:
--   public — doterajsie spravanie: vidi kazdy, moze poziadat o vstup
--   invite — v zozname ju vidia iba pozvani a clenovia; nikto iny o nej nevie
--
-- Existujuce skupiny zostavaju verejne, aby sa nic nezmenilo bez rozhodnutia
-- zakladatela.

BEGIN;

ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(10) NOT NULL DEFAULT 'public';

ALTER TABLE admin.friend_groups DROP CONSTRAINT IF EXISTS friend_groups_visibility_check;
ALTER TABLE admin.friend_groups ADD  CONSTRAINT friend_groups_visibility_check
    CHECK (visibility IN ('public', 'invite'));

COMMENT ON COLUMN admin.friend_groups.visibility IS
    'public = vidi kazdy; invite = v zozname iba pozvani a clenovia';

-- Zoznam skupin sa filtruje podla clenstva, preto sa oplati index.
CREATE INDEX IF NOT EXISTS group_members_user_idx ON admin.group_members (user_id, group_id);

INSERT INTO admin.schema_versions (version, description)
VALUES (68, 'Viditelnost skupin: skryte skupiny vidia iba pozvani')
ON CONFLICT (version) DO NOTHING;

COMMIT;
