-- Migration run_017: pridanie stĺpca body do mail_log
ALTER TABLE admin.mail_log ADD COLUMN IF NOT EXISTS body TEXT;
