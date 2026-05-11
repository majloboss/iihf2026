-- Migration run_019: pridanie stĺpcov otw (OT výhra) a otl (OT prehra) do group_standings
ALTER TABLE iihf2026.group_standings
    ADD COLUMN IF NOT EXISTS otw INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS otl INT NOT NULL DEFAULT 0;
