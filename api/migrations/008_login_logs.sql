-- Migration 008: tabuľka pre logovanie prihlásení
CREATE TABLE IF NOT EXISTS admin.login_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INT REFERENCES admin.users(id) ON DELETE SET NULL,
    username   VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    env        VARCHAR(10) NOT NULL DEFAULT 'main',
    logged_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_logs_logged_at_idx ON admin.login_logs(logged_at DESC);
