-- Spusti v DBeaver na DB-BET
-- Migration 010 patch: updated_at pre games
ALTER TABLE iihf2026.games ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Migration 011: log odoslaných notifikácií
CREATE TABLE IF NOT EXISTS admin.notification_log (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    notif_type  VARCHAR(30) NOT NULL,
    game_id     INT REFERENCES iihf2026.games(id) ON DELETE SET NULL,
    sent_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_log_game
    ON admin.notification_log (user_id, notif_type, game_id)
    WHERE game_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_log_nongame
    ON admin.notification_log (user_id, notif_type)
    WHERE game_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_log_sent ON admin.notification_log (sent_at);
