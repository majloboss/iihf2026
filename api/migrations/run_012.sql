-- Migration 012: mail_log + fix login_logs + email_sent v invites

-- login_logs (CREATE IF NOT EXISTS – oprava ak tabuľka chýba)
CREATE TABLE IF NOT EXISTS admin.login_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES admin.users(id) ON DELETE SET NULL,
    username   VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    env        VARCHAR(10) NOT NULL DEFAULT 'main',
    logged_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- email_sent pre invites
ALTER TABLE admin.invites ADD COLUMN IF NOT EXISTS email_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- mail_log
CREATE TABLE IF NOT EXISTS admin.mail_log (
    id        SERIAL PRIMARY KEY,
    to_email  VARCHAR(150) NOT NULL,
    subject   VARCHAR(255) NOT NULL,
    status    VARCHAR(10)  NOT NULL DEFAULT 'sent',
    error_msg TEXT,
    sent_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mail_log_sent ON admin.mail_log (sent_at DESC);
