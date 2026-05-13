-- run_020: announcements table
CREATE TABLE IF NOT EXISTS admin.announcements (
    id         SERIAL PRIMARY KEY,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by INT REFERENCES admin.users(id) ON DELETE SET NULL
);
