-- Migration 075: naviazanie zápasov na číselník fáz
--
-- !!! NESPUSTAT — pripravena do buducna, nebezi ani na DEV ani v produkcii.
-- Stlpec `phase_id` zatial nic necita: filtre si skratku kola odvodzuju zo
-- starych stlpcov. Spusti sa az spolu s prepisom pavuka, statistik a
-- notifikacii na `phase_id`.
--
-- Zápas dostane `phase_id` a cez neho aj skratku kola, popis, farbu a poradie.
-- Doteraz sa to odvodzovalo z `game_type_name` regulárnymi výrazmi, zvlášť pre
-- každú súťaž.
--
-- Staré stĺpce `game_type_code` a `game_type_name` (v IIHF `phase`) zostávajú:
-- číta ich ešte livescore, notifikácie, štatistiky aj pavúk. Odstránia sa
-- samostatnou migráciou, až keď ich nikto nepoužíva.
--
-- Naviazanie sa odvodzuje takto:
--   ligová fáza UCL — číslo kola z názvu („3. kolo" → LF3)
--   dvojzápasy      — stĺpec `leg` (1 → BAR-1, 2 → BAR-2)
--   ostatné         — kód fázy priamo

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

-- ── UCL: ligová fáza podľa čísla kola ────────────────────────────────────────
UPDATE "lm2026-27".games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 3
   AND g.game_type_code = 'LEAGUE'
   AND p.match_stat_code = 'LF' || substring(g.game_type_name from '([0-9]+)\. kolo');

-- ── UCL: dvojzápasy podľa `leg` ──────────────────────────────────────────────
-- Kód zápasu je zložený z kódu fázy a poradia (BAR-1, R16-2).
UPDATE "lm2026-27".games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 3
   AND g.leg IS NOT NULL
   AND p.match_stat_code = CASE g.game_type_code
                               WHEN 'PO' THEN 'BAR'
                               ELSE g.game_type_code
                           END || '-' || g.leg;

-- ── UCL: finále (jediný zápas, bez odvety) ───────────────────────────────────
UPDATE "lm2026-27".games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 3
   AND g.game_type_code = 'F'
   AND p.phase_code = 'F';

-- ── FIFA: skupiny podľa písmena, ostatné podľa kódu ──────────────────────────
UPDATE fifa2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 2
   AND g.game_type_code LIKE 'GROUP\_%'
   AND p.phase_code = replace(g.game_type_code, 'GROUP_', '');

UPDATE fifa2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 2
   AND g.game_type_code NOT LIKE 'GROUP\_%'
   AND p.phase_code = g.game_type_code;

-- ── IIHF: kód fázy je zároveň názvom ─────────────────────────────────────────
-- Kódy sa v admine mohli premenovať (BRONZE → BR, GOLD → FIN), preto sa
-- porovnáva aj cez popis.
UPDATE iihf2026.games g
   SET phase_id = p.id
  FROM admin.competition_phases p
 WHERE p.competition_id = 1
   AND (p.phase_code = g.phase
        OR (g.phase = 'BRONZE' AND p.match_stat_desc ILIKE '%bronz%')
        OR (g.phase = 'GOLD'   AND p.match_stat_desc ILIKE '%finále%'));

INSERT INTO admin.schema_versions (version, description) VALUES
    (75, 'Naviazanie zapasov na ciselnik faz (phase_id)')
    ON CONFLICT DO NOTHING;

COMMIT;
