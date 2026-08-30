-- Migration 067: domaci stadion v ciselniku klubov
--
-- POZOR: obsahuje ALTER TABLE, preto ju treba spustit z databazovej konzoly
--        pod vlastnikom schemy (dbdevbet-admin).
--
-- Stadion sa doteraz drzal iba pri zapase. To je spravne — klub nemusi hrat
-- doma na svojom stadione (Viking hosti PSV v Stuttgarte). Chybal vsak udaj,
-- voci comu sa taka vynimka posudzuje.
--
-- Klub teraz ma svoj domaci stadion a zapas si nadalej drzi ten skutocny.
-- Ked sa lisia, aplikacia to vie oznacit ako iny stadion.
--
-- Hodnoty sa dopĺňaju z rozpisu: domaci stadion je ten, na ktorom klub v
-- ligovej faze hra najcastejsie. Pri zhode rozhodne abecedne poradie, aby bol
-- vysledok rovnaky pri kazdom spusteni.

BEGIN;

ALTER TABLE admin.uefa_clubs ADD COLUMN IF NOT EXISTS home_venue VARCHAR(200);

COMMENT ON COLUMN admin.uefa_clubs.home_venue IS
    'Domaci stadion klubu; zapas si drzi skutocne dejisko a moze sa lisit';

-- Najcastejsie dejisko domacich zapasov klubu v ligovej faze.
WITH pocty AS (
    SELECT p.home_team_id AS club_id,
           p.venue,
           COUNT(*) AS n,
           ROW_NUMBER() OVER (PARTITION BY p.home_team_id
                              ORDER BY COUNT(*) DESC, p.venue) AS poradie
      FROM "lm2026-27".games_pdf p
     WHERE p.phase = 'LEAGUE'
       AND p.home_team_id IS NOT NULL
       AND NULLIF(p.venue, '') IS NOT NULL
     GROUP BY p.home_team_id, p.venue
)
UPDATE admin.uefa_clubs c
   SET home_venue = pocty.venue,
       updated_at = NOW()
  FROM pocty
 WHERE pocty.club_id = c.club_id
   AND pocty.poradie = 1
   AND c.home_venue IS NULL;

-- Kontrola: vsetkych 36 klubov ligovej fazy ma domaci stadion.
DO $$
DECLARE bez_stadiona INTEGER; zoznam TEXT;
BEGIN
    SELECT COUNT(*), string_agg(club_name, ', ')
      INTO bez_stadiona, zoznam
      FROM admin.uefa_clubs c
     WHERE c.home_venue IS NULL
       AND EXISTS (SELECT 1 FROM "lm2026-27".games_pdf p
                    WHERE p.phase = 'LEAGUE' AND p.home_team_id = c.club_id);
    IF bez_stadiona > 0 THEN
        RAISE EXCEPTION '% klubov ligovej fazy nema domaci stadion: %', bez_stadiona, zoznam;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description)
VALUES (67, 'Domaci stadion v ciselniku klubov (home_venue)')
ON CONFLICT (version) DO NOTHING;

COMMIT;
