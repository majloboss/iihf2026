-- run_021: add is_active flag to announcements
ALTER TABLE admin.announcements ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
