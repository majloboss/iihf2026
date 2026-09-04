-- Migration 077: oznam sa dá zobraziť na Prehľade nezávisle od jeho platnosti
--
-- Doteraz platil vždy len jeden oznam: nový pri vložení vypol predošlý
-- (`is_active = FALSE`) a na Prehľade sa ukazoval práve ten jediný aktívny.
-- Starší oznam sa tak nedal nechať platiť, aj keď stále dával zmysel.
--
-- `show_dashboard` oddeľuje dve rôzne veci:
--   is_active       — oznam platí, je v histórii
--   show_dashboard  — oznam sa navyše ukazuje na Prehľade
--
-- Vďaka tomu môže byť na Prehľade viac oznamov naraz a zvyšok zostáva
-- dostupný v histórii.

BEGIN;

ALTER TABLE admin.announcements
    ADD COLUMN IF NOT EXISTS show_dashboard BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN admin.announcements.show_dashboard IS
    'Zobraziť oznam na Prehľade; nezaškrtnutý zostáva len v histórii';

-- Doteraz sa na Prehľade ukazoval jediný aktívny oznam — zachová sa to.
UPDATE admin.announcements SET show_dashboard = is_active;

CREATE INDEX IF NOT EXISTS announcements_dashboard_idx
    ON admin.announcements (show_dashboard, created_at DESC);

INSERT INTO admin.schema_versions (version, description) VALUES
    (77, 'Oznam: zobrazenie na Prehlade (show_dashboard)')
    ON CONFLICT DO NOTHING;

COMMIT;
