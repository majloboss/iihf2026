-- Migration run_018: pridanie stĺpca env do login_logs (ak chýba)
ALTER TABLE admin.login_logs ADD COLUMN IF NOT EXISTS env VARCHAR(10) NOT NULL DEFAULT 'main';
