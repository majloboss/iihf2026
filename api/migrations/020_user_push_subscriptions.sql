-- Migration 020: multi-device push subscriptions
CREATE TABLE IF NOT EXISTS admin.user_push_subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     INT  NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    subscription JSONB NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upush_user ON admin.user_push_subscriptions(user_id);

-- Migrate existing single subscriptions from admin.users.web_push_sub
INSERT INTO admin.user_push_subscriptions (user_id, endpoint, subscription)
SELECT id,
       web_push_sub::jsonb->>'endpoint',
       web_push_sub::jsonb
FROM admin.users
WHERE web_push_sub IS NOT NULL AND web_push_sub <> ''
  AND (web_push_sub::jsonb->>'endpoint') IS NOT NULL
ON CONFLICT (endpoint) DO NOTHING;
