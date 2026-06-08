-- Migration 039: invites.cancelled_at — zrušená pozvánka (soft delete)
ALTER TABLE admin.invites ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

INSERT INTO admin.schema_versions (version, description)
VALUES (39, 'invites.cancelled_at: soft delete namiesto fyzického mazania')
ON CONFLICT (version) DO NOTHING;
