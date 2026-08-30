-- Migration 064: games_pdf sa viaze na club_id, nie na club_code
--
-- POZOR: obsahuje ALTER TABLE, preto ju treba spustit z databazovej konzoly
--        pod vlastnikom schemy (dbdevbet-admin), nie cez run_migration.cjs.
--
-- Migracia 062 zalozila games_pdf s cudzim klucom na admin.uefa_clubs(club_code).
-- Kod klubu je vsak udaj, ktory admin bezne meni v ciselniku — a cudzi kluc mu
-- to zablokoval:
--
--   update or delete on table "uefa_clubs" violates foreign key constraint
--   "games_pdf_home_code_fkey" on table "games_pdf"
--
-- Tabulka games sa spravne odkazuje cez club_id, ktore sa nikdy nemeni.
-- games_pdf to teraz robi rovnako, takze premenovanie klubu uz nic neblokuje.
--
-- Nazvy stlpcov home_code/away_code sa menia na home_team_id/away_team_id,
-- aby bolo z tabulky zrejme, co obsahuju.

BEGIN;

-- 1. Nove stlpce s odkazom na club_id.
ALTER TABLE "lm2026-27".games_pdf ADD COLUMN IF NOT EXISTS home_team_id INT;
ALTER TABLE "lm2026-27".games_pdf ADD COLUMN IF NOT EXISTS away_team_id INT;

-- 2. Prevod existujucich kodov na id.
UPDATE "lm2026-27".games_pdf p
   SET home_team_id = c.club_id
  FROM admin.uefa_clubs c
 WHERE c.club_code = p.home_code AND p.home_code IS NOT NULL;

UPDATE "lm2026-27".games_pdf p
   SET away_team_id = c.club_id
  FROM admin.uefa_clubs c
 WHERE c.club_code = p.away_code AND p.away_code IS NOT NULL;

-- 3. Kontrola, ze sa prelozili vsetky kody. Az potom sa stare stlpce zahodia.
DO $$
DECLARE zle INTEGER;
BEGIN
    SELECT COUNT(*) INTO zle FROM "lm2026-27".games_pdf
     WHERE (home_code IS NOT NULL AND home_team_id IS NULL)
        OR (away_code IS NOT NULL AND away_team_id IS NULL);
    IF zle > 0 THEN
        RAISE EXCEPTION 'Nepodarilo sa prelozit kluby v % zapasoch', zle;
    END IF;
END $$;

-- 4. Stare stlpce aj s cudzimi klucmi uz nie su potrebne.
ALTER TABLE "lm2026-27".games_pdf DROP CONSTRAINT IF EXISTS games_pdf_home_code_fkey;
ALTER TABLE "lm2026-27".games_pdf DROP CONSTRAINT IF EXISTS games_pdf_away_code_fkey;
ALTER TABLE "lm2026-27".games_pdf DROP COLUMN IF EXISTS home_code;
ALTER TABLE "lm2026-27".games_pdf DROP COLUMN IF EXISTS away_code;

-- 5. Cudzie kluce na club_id — rovnako ako ich ma tabulka games.
ALTER TABLE "lm2026-27".games_pdf
    ADD CONSTRAINT games_pdf_home_team_id_fkey
    FOREIGN KEY (home_team_id) REFERENCES admin.uefa_clubs(club_id);
ALTER TABLE "lm2026-27".games_pdf
    ADD CONSTRAINT games_pdf_away_team_id_fkey
    FOREIGN KEY (away_team_id) REFERENCES admin.uefa_clubs(club_id);

COMMENT ON COLUMN "lm2026-27".games_pdf.home_team_id IS 'Domaci klub, odkaz na admin.uefa_clubs; NULL kym nie je znamy';
COMMENT ON COLUMN "lm2026-27".games_pdf.away_team_id IS 'Hostujuci klub, odkaz na admin.uefa_clubs; NULL kym nie je znamy';

-- 6. Kontrola, ze rozpis zostal kompletny.
DO $$
DECLARE liga INTEGER; bez_klubov INTEGER;
BEGIN
    SELECT COUNT(*) INTO liga FROM "lm2026-27".games_pdf WHERE phase = 'LEAGUE';
    IF liga <> 144 THEN RAISE EXCEPTION 'Ligova faza ma % zapasov, ocakava sa 144', liga; END IF;

    SELECT COUNT(*) INTO bez_klubov FROM "lm2026-27".games_pdf
     WHERE phase = 'LEAGUE' AND (home_team_id IS NULL OR away_team_id IS NULL);
    IF bez_klubov > 0 THEN
        RAISE EXCEPTION '% ligovych zapasov zostalo bez klubov', bez_klubov;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (64, 'games_pdf sa viaze na club_id namiesto club_code, aby sa dal menit kod klubu')
ON CONFLICT (version) DO NOTHING;

COMMIT;
