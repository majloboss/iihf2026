-- Migration 013: group_id v invites (odporúčanie skupiny)
ALTER TABLE admin.invites ADD COLUMN IF NOT EXISTS group_id INT REFERENCES admin.friend_groups(id) ON DELETE SET NULL;
