-- Migration 036: token_version per user
-- Každá zmena hesla alebo admin-revoke inkrementuje token_version.
-- require_auth() porovná verziu z JWT s DB — nesúlad = okamžitý logout.
ALTER TABLE admin.users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;
