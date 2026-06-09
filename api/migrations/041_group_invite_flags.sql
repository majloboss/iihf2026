-- Migration 041: friend_groups — dva nové príznaky pre pozvánky
--   allow_member_invite: môže člen (nie zakladateľ) pozvať do skupiny? (default TRUE = ako doteraz)
--   is_closed:           skupina uzavretá — žiadne nové pozvánky ani žiadosti o vstup (default FALSE)
ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS allow_member_invite BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE admin.friend_groups
    ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO admin.schema_versions (version, description)
VALUES (41, 'friend_groups.allow_member_invite + is_closed: riadenie pozvánok a uzavretie skupiny')
ON CONFLICT (version) DO NOTHING;
