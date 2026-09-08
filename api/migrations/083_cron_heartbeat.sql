-- ============================================================
-- Migration 083: stopa po kazdom behu cronu
--
-- Livescore cely vecer nebezal a nedalo sa zistit preco: ked skript nema co
-- robit, skonci ticho a v ziadnej tabulke nezanecha stopu. Nebolo tak vidiet
-- rozdiel medzi "hosting cron nevola" a "cron bezi, len nie je co aktualizovat".
--
-- Jeden riadok na skript, prepisuje sa pri kazdom behu — netreba historiu,
-- staci vediet, kedy skript bezal naposledy a s akym vysledkom.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS admin.cron_heartbeat (
    skript      TEXT PRIMARY KEY,
    posledny    TIMESTAMP NOT NULL,
    vysledok    TEXT,               -- kratke zhrnutie posledneho behu
    behov_dnes  INT  NOT NULL DEFAULT 1,
    den         DATE NOT NULL DEFAULT CURRENT_DATE
);

COMMENT ON TABLE admin.cron_heartbeat IS
    'Kedy naposledy bezal ktory cron skript — na overenie, ci ho hosting vola';

INSERT INTO admin.schema_versions (version, description)
VALUES (83, 'Stopa po behu cron skriptov')
ON CONFLICT (version) DO NOTHING;

COMMIT;
