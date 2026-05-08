-- Migration 009: nastavenia notifikácií per používateľ
CREATE TABLE IF NOT EXISTS admin.notification_settings (
    user_id        INT NOT NULL REFERENCES admin.users(id) ON DELETE CASCADE,
    notif_type     VARCHAR(30) NOT NULL,
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    minutes_before INT,
    PRIMARY KEY (user_id, notif_type)
);
