-- ============================================================
-- Migration 084: checked_at v UTC
--
-- Stlpec je 'timestamp without time zone' a plnil sa cez DEFAULT now().
-- Server bezi na CEST, takze sa doň ukladal miestny cas (19:30), zatial co
-- zvysok aplikacie drzi dohodu "v stlpci je UTC, frontend pripoji Z".
-- Vysledok: v prehlade nakladov sa cas zobrazoval o dve hodiny neskor.
--
-- Oprava ma dve casti: default na UTC a prepocet uz zapisanych riadkov.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_log
    ALTER COLUMN checked_at SET DEFAULT (NOW() AT TIME ZONE 'UTC');

-- Doterajsie riadky su v miestnom case. Prepocet cez AT TIME ZONE zvlada aj
-- prechod na letny cas — zaznamy z julia maju iny posun nez tie z novembra,
-- takze pausalne odcitanie dvoch hodin by cast z nich pokazilo.
UPDATE admin.livescore_log
   SET checked_at = checked_at AT TIME ZONE 'Europe/Bratislava' AT TIME ZONE 'UTC';

-- Rovnaky problem ma stopa po behu cronu, zalozena dnes.
ALTER TABLE admin.cron_heartbeat
    ALTER COLUMN posledny SET DEFAULT (NOW() AT TIME ZONE 'UTC');

UPDATE admin.cron_heartbeat
   SET posledny = posledny AT TIME ZONE 'Europe/Bratislava' AT TIME ZONE 'UTC';

INSERT INTO admin.schema_versions (version, description)
VALUES (84, 'checked_at a cron_heartbeat.posledny v UTC')
ON CONFLICT (version) DO NOTHING;

COMMIT;
