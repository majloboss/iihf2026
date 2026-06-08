-- Migration 040: password_reset_tokens — jednorazové tokeny pre reset hesla
CREATE TABLE IF NOT EXISTS admin.password_reset_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INT          NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    token      VARCHAR(64)  NOT NULL UNIQUE,
    expires_at TIMESTAMP    NOT NULL,
    used_at    TIMESTAMP,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

INSERT INTO admin.schema_versions (version, description)
VALUES (40, 'password_reset_tokens: jednorazový reset hesla cez email')
ON CONFLICT (version) DO NOTHING;
