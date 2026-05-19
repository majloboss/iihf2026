-- run_023: pridaj next_poll_at do livescore_daily pre dynamický výpočet intervalu
ALTER TABLE iihf2026.livescore_daily
    ADD COLUMN IF NOT EXISTS next_poll_at TIMESTAMP;
