-- Migration 065: kod klubu je uz iba informativny udaj
--
-- POZOR: obsahuje ALTER TABLE, preto ju treba spustit z databazovej konzoly
--        pod vlastnikom schemy (dbdevbet-admin). Az PO migracii 064.
--
-- Kod klubu admin bezne meni — niektore kluby maju zatial docasne oznacenie
-- zacinajuce X, ktore sa nahradi oficialnym kodom UEFA. Kym na kode stoji
-- identita, kazda taka zmena nieco rozbije:
--
--   * cudzi kluc z games_pdf premenovanie rovno zablokoval (riesi migracia 064)
--   * group_standings.team drzi kod, takze po zmene by riadok tabulky ostal
--     visiet na starom kode a klub by z ligovej tabulky vypadol
--
-- Identitou klubu je club_id. Tato migracia to dotahuje do konca:
--   1. group_standings sa viaze na club_id
--   2. UNIQUE na club_code sa rusi — kod je len informativny popis
--
-- Kod zostava povinny (NOT NULL) a stale sa zobrazuje pouzivatelom,
-- iba uz na nom nic nezavisi.

BEGIN;

-- ============================================================
-- 1. group_standings: kod klubu -> club_id
-- ============================================================
-- Stlpec sa vola team_id, aby bolo zrejme, ze ide o odkaz, nie o kod.
ALTER TABLE "lm2026-27".group_standings ADD COLUMN IF NOT EXISTS team_id INT;

UPDATE "lm2026-27".group_standings s
   SET team_id = c.club_id
  FROM admin.uefa_clubs c
 WHERE c.club_code = s.team;

-- Riadok, ktoremu sa klub nenasiel, by po prepocte aj tak zanikol, ale radsej
-- nech je to vidiet hned.
DO $$
DECLARE zle INTEGER;
BEGIN
    SELECT COUNT(*) INTO zle FROM "lm2026-27".group_standings WHERE team_id IS NULL;
    IF zle > 0 THEN
        RAISE EXCEPTION '% riadkom tabulky sa nepodarilo priradit klub', zle;
    END IF;
END $$;

-- Primarny kluc drzal (phase, team) — nahradi ho (phase, team_id).
ALTER TABLE "lm2026-27".group_standings DROP CONSTRAINT IF EXISTS group_standings_pkey;
ALTER TABLE "lm2026-27".group_standings DROP COLUMN IF EXISTS team;
ALTER TABLE "lm2026-27".group_standings ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE "lm2026-27".group_standings ADD  CONSTRAINT group_standings_pkey
    PRIMARY KEY (phase, team_id);
ALTER TABLE "lm2026-27".group_standings ADD  CONSTRAINT group_standings_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES admin.uefa_clubs(club_id);

COMMENT ON COLUMN "lm2026-27".group_standings.team_id IS 'Klub v tabulke, odkaz na admin.uefa_clubs';

-- ============================================================
-- 2. club_code prestava byt jedinecny
-- ============================================================
-- Kod je popisny udaj: admin ho meni a docasne mozu vzniknut aj dva rovnake.
-- Identitu drzi club_id, takze na jedinecnosti uz nic nestoji.
ALTER TABLE admin.uefa_clubs DROP CONSTRAINT IF EXISTS uefa_clubs_club_code_key;

COMMENT ON COLUMN admin.uefa_clubs.club_code IS
    'Informativna skratka klubu pre zobrazenie; nie je identifikator ani jedinecna';

-- Vyhladavanie podla kodu zostava rychle aj bez UNIQUE.
CREATE INDEX IF NOT EXISTS uefa_clubs_code_idx ON admin.uefa_clubs (club_code);

-- ============================================================
-- 3. Kontroly
-- ============================================================
DO $$
DECLARE zle INTEGER;
BEGIN
    -- Na club_code uz nesmie visiet ziadny cudzi kluc.
    SELECT COUNT(*) INTO zle FROM pg_constraint
     WHERE contype = 'f' AND pg_get_constraintdef(oid) LIKE '%club_code%';
    IF zle > 0 THEN
        RAISE EXCEPTION 'Na club_code este visi % cudzich klucov', zle;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (65, 'Kod klubu je iba informativny: group_standings na club_id, zruseny UNIQUE')
ON CONFLICT (version) DO NOTHING;

COMMIT;
