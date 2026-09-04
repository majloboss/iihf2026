-- Migration 075: naviazanie zápasov na číselník fáz
--
-- Zápas dnes nevie, do ktorého kola patrí. Nesie len `game_type_code`
-- (LEAGUE, PO, R16…) a `game_type_name` s celým názvom („Ligová fáza — 3.
-- kolo"); skratku LF3 z toho appka zakaždým dopočítava regulárnym výrazom.
-- Tá istá logika je preto na dvoch miestach a pri zmene číselníka sa rozíde.
--
-- `phase_id` je priamy odkaz do číselníka: príslušnosť ku kolu je v dátach,
-- nie v kóde.
--
-- Staré stĺpce `game_type_code` a `game_type_name` (v IIHF `phase`) zostávajú:
-- číta ich ešte livescore, generátor rozlosovania aj import z PDF. Odstránia
-- sa samostatnou migráciou, až keď ich nikto nepoužíva.
--
-- Súťaž sa dohľadáva podľa slugu — `competition_id` sa medzi prostrediami
-- líši (DEV 3, produkcia 5).

BEGIN;

ALTER TABLE "lm2026-27".games
    ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES admin.competition_phases(id);
ALTER TABLE fifa2026.games
    ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES admin.competition_phases(id);
ALTER TABLE iihf2026.games
    ADD COLUMN IF NOT EXISTS phase_id INTEGER REFERENCES admin.competition_phases(id);

CREATE INDEX IF NOT EXISTS ucl_games_phase_id_idx  ON "lm2026-27".games (phase_id);
CREATE INDEX IF NOT EXISTS fifa_games_phase_id_idx ON fifa2026.games (phase_id);
CREATE INDEX IF NOT EXISTS iihf_games_phase_id_idx ON iihf2026.games (phase_id);

-- ── UCL ──────────────────────────────────────────────────────────────────────
-- Ligová fáza má jeden kód pre všetkých osem kôl, číslo je len v názve.
-- Dvojzápasy sa rozlíšia stĺpcom `leg`; baráž sa v číselníku volá BAR, nie PO.
UPDATE "lm2026-27".games g
   SET phase_id = p.id
  FROM admin.competition_phases p, admin.competitions k
 WHERE k.slug = 'ucl2026' AND p.competition_id = k.id
   AND p.match_stat_code = CASE
           WHEN g.game_type_code = 'LEAGUE'
               THEN 'LF' || substring(g.game_type_name from '([0-9]+)\. kolo')
           WHEN g.leg IS NOT NULL
               THEN (CASE g.game_type_code WHEN 'PO' THEN 'BAR'
                     ELSE g.game_type_code END) || '-' || g.leg
           ELSE g.game_type_code
       END;

-- ── FIFA ─────────────────────────────────────────────────────────────────────
-- Pozor na kód `F`: v zápasoch znamená finále, v číselníku skupinu F. Preto sa
-- skupiny a vyraďovacia časť priraďujú zvlášť a finále cez `match_stat_code`
-- (FIN), nie cez `phase_code`.
--
-- Zápas o bronz má v zápasoch kód BM, v číselníku BR.
UPDATE fifa2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p, admin.competitions k
 WHERE k.slug = 'fifa2026' AND p.competition_id = k.id
   AND g.game_type_code LIKE 'GROUP\_%'
   AND p.phase_code = replace(g.game_type_code, 'GROUP_', '')
   AND p.group_code = 'GRP';

UPDATE fifa2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p, admin.competitions k
 WHERE k.slug = 'fifa2026' AND p.competition_id = k.id
   AND g.game_type_code NOT LIKE 'GROUP\_%'
   AND p.match_stat_code = CASE g.game_type_code
           WHEN 'BM' THEN 'BR'      -- Bronze Medal
           WHEN 'F'  THEN 'FIN'     -- finále, nie skupina F
           ELSE g.game_type_code
       END;

-- ── IIHF ─────────────────────────────────────────────────────────────────────
-- Kódy sa v admine premenovali (BRONZE → BR, GOLD → F), preto sa porovnáva
-- aj cez popis.
UPDATE iihf2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p, admin.competitions k
 WHERE k.slug = 'iihf2026' AND p.competition_id = k.id
   AND (p.match_stat_code = g.phase
        OR (g.phase = 'BRONZE' AND p.match_stat_desc ILIKE '%bronz%')
        OR (g.phase = 'GOLD'   AND p.match_stat_desc ILIKE '%finále%'));

-- Zápas bez fázy by vypadol z filtrov, preto sa migrácia radšej zastaví, než
-- by nechala dáta v polovičnom stave.
DO $$
DECLARE chyba INTEGER;
BEGIN
    SELECT (SELECT COUNT(*) FROM "lm2026-27".games WHERE phase_id IS NULL)
         + (SELECT COUNT(*) FROM fifa2026.games   WHERE phase_id IS NULL)
         + (SELECT COUNT(*) FROM iihf2026.games   WHERE phase_id IS NULL)
      INTO chyba;
    IF chyba > 0 THEN
        RAISE EXCEPTION 'Bez fazy zostalo % zapasov — skontroluj ciselnik', chyba;
    END IF;
END $$;

INSERT INTO admin.schema_versions (version, description) VALUES
    (75, 'Naviazanie zapasov na ciselnik faz (phase_id)')
    ON CONFLICT DO NOTHING;

COMMIT;
