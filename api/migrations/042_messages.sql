-- Migration 042: admin.messages — súkromné vlákno user ↔ admin (chat s adminom)
--   Jedno vlákno na usera (user_id). sender rozlišuje kto písal.
--   read_at = kedy druhá strana správu prečítala. deleted_at = soft delete.
CREATE TABLE IF NOT EXISTS admin.messages (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    sender      VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'admin')),
    body        TEXT NOT NULL,
    read_at     TIMESTAMP NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_user      ON admin.messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread    ON admin.messages(user_id, sender, read_at);

-- Práva pre aplikačného DB usera (inak permission denied for sequence/table)
GRANT USAGE, SELECT ON SEQUENCE admin.messages_id_seq TO "dbbet-admin";
GRANT INSERT, UPDATE, SELECT, DELETE ON TABLE admin.messages TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description)
VALUES (42, 'admin.messages: chat user ↔ admin (vlákno na usera, sender, read_at, soft delete)')
ON CONFLICT (version) DO NOTHING;
