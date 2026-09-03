-- Migration 072: číselník fáz a kôl súťaže
--
-- Zápas dnes nesie iba `game_type_code` (LEAGUE, PO, R16…) a `game_type_name`
-- s celým názvom („Ligová fáza — 3. kolo"). Skratka do filtrov (LF3, BAR1, SF2)
-- sa preto odvodzuje z názvu regulárnymi výrazmi, zvlášť pre každú súťaž —
-- UCL má slovenské názvy, FIFA anglické, IIHF rovno skratky. Krehké a pri
-- ďalšej súťaži by sa to muselo rozširovať znova.
--
-- Číselník drží pre každú súťaž štyri údaje: kód a názov fázy, kód a popis
-- konkrétneho zápasu pre štatistiky. K tomu farbu, ktorá dnes vzniká hádaním
-- z kódu vo frontende.
--
-- Vzťah fáza → kód zápasu je 1:N (Ligová fáza → LF1…LF8), preto jedna tabuľka
-- s opakovaným `phase_code`, nie dve samostatné.
--
-- Táto migrácia iba zakladá a napĺňa číselník. Zápasy sa naň naviažu až po
-- kontrole obsahu — samotné `phase_id` pridáva migrácia 073.

BEGIN;

CREATE TABLE IF NOT EXISTS admin.competition_phases (
    id              SERIAL PRIMARY KEY,
    competition_id  INTEGER NOT NULL REFERENCES admin.competitions(id) ON DELETE CASCADE,

    -- Fáza súťaže
    phase_code      VARCHAR(20)  NOT NULL,
    phase_name      VARCHAR(100) NOT NULL,

    -- Konkrétny zápas v rámci fázy — do filtrov a štatistík
    match_stat_code VARCHAR(20)  NOT NULL,
    match_stat_desc VARCHAR(150) NOT NULL,

    -- Farba tlačidla; uzavretý zoznam, aby nevznikla nečitateľná kombinácia
    color_code      VARCHAR(20)  NOT NULL DEFAULT 'NEUTRAL',

    -- Radenie podľa času zlyháva, keď sa hracie dni posúvajú pri testovaní
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
    -- Kód zápasu musí byť v súťaži jedinečný, inak by filter nevedel, čo vybrať.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phases_stat_uniq') THEN
        ALTER TABLE admin.competition_phases
            ADD CONSTRAINT phases_stat_uniq UNIQUE (competition_id, match_stat_code);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'phases_color_chk') THEN
        ALTER TABLE admin.competition_phases
            ADD CONSTRAINT phases_color_chk CHECK (
                color_code IN ('GROUP','PLAYOFF','BRONZE','GOLD','NEUTRAL'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS phases_comp_idx
    ON admin.competition_phases (competition_id, sort_order);

-- ── IIHF 2026 (id 1) ─────────────────────────────────────────────────────────
-- Schéma má jediný stĺpec `phase` s hodnotami A, B, QF, SF, BRONZE, GOLD —
-- kód aj názov v jednom. Názvy sa preto dopĺňajú ručne.
INSERT INTO admin.competition_phases
    (competition_id, phase_code, phase_name, match_stat_code, match_stat_desc, color_code, sort_order)
VALUES
    (1, 'A',      'Skupina A',      'A',      'Skupina A',            'GROUP',   10),
    (1, 'B',      'Skupina B',      'B',      'Skupina B',            'GROUP',   20),
    (1, 'QF',     'Štvrťfinále',    'QF',     'Štvrťfinále',          'PLAYOFF', 30),
    (1, 'SF',     'Semifinále',     'SF',     'Semifinále',           'PLAYOFF', 40),
    (1, 'BRONZE', 'O 3. miesto',    'BRO',    'Zápas o bronz',        'BRONZE',  50),
    (1, 'GOLD',   'Finále',         'F',      'Finále',               'GOLD',    60)
ON CONFLICT ON CONSTRAINT phases_stat_uniq DO NOTHING;

-- ── FIFA 2026 (id 2) ─────────────────────────────────────────────────────────
-- Vyraďovacie fázy majú v dátach anglické názvy, tu sa uvádzajú po slovensky.
INSERT INTO admin.competition_phases
    (competition_id, phase_code, phase_name, match_stat_code, match_stat_desc, color_code, sort_order)
VALUES
    (2, 'A',  'Skupina A', 'SKA', 'Skupina A',      'GROUP',    10),
    (2, 'B',  'Skupina B', 'SKB', 'Skupina B',      'GROUP',    20),
    (2, 'C',  'Skupina C', 'SKC', 'Skupina C',      'GROUP',    30),
    (2, 'D',  'Skupina D', 'SKD', 'Skupina D',      'GROUP',    40),
    (2, 'E',  'Skupina E', 'SKE', 'Skupina E',      'GROUP',    50),
    (2, 'F',  'Skupina F', 'SKF', 'Skupina F',      'GROUP',    60),
    (2, 'G',  'Skupina G', 'SKG', 'Skupina G',      'GROUP',    70),
    (2, 'H',  'Skupina H', 'SKH', 'Skupina H',      'GROUP',    80),
    (2, 'I',  'Skupina I', 'SKI', 'Skupina I',      'GROUP',    90),
    (2, 'J',  'Skupina J', 'SKJ', 'Skupina J',      'GROUP',   100),
    (2, 'K',  'Skupina K', 'SKK', 'Skupina K',      'GROUP',   110),
    (2, 'L',  'Skupina L', 'SKL', 'Skupina L',      'GROUP',   120),
    (2, 'R32','Šestnásťfinále', 'R32', 'Šestnásťfinále', 'PLAYOFF', 130),
    (2, 'R16','Osemfinále',     'R16', 'Osemfinále',     'PLAYOFF', 140),
    (2, 'QF', 'Štvrťfinále',    'QF',  'Štvrťfinále',    'PLAYOFF', 150),
    (2, 'SF', 'Semifinále',     'SF',  'Semifinále',     'PLAYOFF', 160),
    (2, 'BM', 'O 3. miesto',    'BRO', 'Zápas o bronz',  'BRONZE',  170),
    (2, 'F',  'Finále',         'F',   'Finále',         'GOLD',    180)
ON CONFLICT ON CONSTRAINT phases_stat_uniq DO NOTHING;

-- ── UCL 2026/27 (id 3) ───────────────────────────────────────────────────────
-- Ligová fáza má jeden kód (LEAGUE) pre všetkých osem kôl; číslo je len
-- v názve. V číselníku dostane každé kolo vlastný riadok.
INSERT INTO admin.competition_phases
    (competition_id, phase_code, phase_name, match_stat_code, match_stat_desc, color_code, sort_order)
VALUES
    (3, 'LF',  'Ligová fáza',      'LF1',  'Ligová fáza — 1. kolo',  'GROUP',    10),
    (3, 'LF',  'Ligová fáza',      'LF2',  'Ligová fáza — 2. kolo',  'GROUP',    20),
    (3, 'LF',  'Ligová fáza',      'LF3',  'Ligová fáza — 3. kolo',  'GROUP',    30),
    (3, 'LF',  'Ligová fáza',      'LF4',  'Ligová fáza — 4. kolo',  'GROUP',    40),
    (3, 'LF',  'Ligová fáza',      'LF5',  'Ligová fáza — 5. kolo',  'GROUP',    50),
    (3, 'LF',  'Ligová fáza',      'LF6',  'Ligová fáza — 6. kolo',  'GROUP',    60),
    (3, 'LF',  'Ligová fáza',      'LF7',  'Ligová fáza — 7. kolo',  'GROUP',    70),
    (3, 'LF',  'Ligová fáza',      'LF8',  'Ligová fáza — 8. kolo',  'GROUP',    80),
    (3, 'PO',  'Baráž o play-off', 'BAR1', 'Baráž — 1. zápas',       'BRONZE',   90),
    (3, 'PO',  'Baráž o play-off', 'BAR2', 'Baráž — odveta',         'BRONZE',  100),
    (3, 'R16', 'Osemfinále',       'R161', 'Osemfinále — 1. zápas',  'PLAYOFF', 110),
    (3, 'R16', 'Osemfinále',       'R162', 'Osemfinále — odveta',    'PLAYOFF', 120),
    (3, 'QF',  'Štvrťfinále',      'QF1',  'Štvrťfinále — 1. zápas', 'PLAYOFF', 130),
    (3, 'QF',  'Štvrťfinále',      'QF2',  'Štvrťfinále — odveta',   'PLAYOFF', 140),
    (3, 'SF',  'Semifinále',       'SF1',  'Semifinále — 1. zápas',  'PLAYOFF', 150),
    (3, 'SF',  'Semifinále',       'SF2',  'Semifinále — odveta',    'PLAYOFF', 160),
    (3, 'F',   'Finále',           'F',    'Finále',                 'GOLD',    170)
ON CONFLICT ON CONSTRAINT phases_stat_uniq DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON admin.competition_phases TO "dbbet-admin";
GRANT USAGE, SELECT ON SEQUENCE admin.competition_phases_id_seq TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description) VALUES
    (72, 'Ciselnik faz a kol sutaze')
    ON CONFLICT DO NOTHING;

COMMIT;
