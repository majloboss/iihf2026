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

-- Obsah číselníka sa nevkladá tu, ale v migrácii 076.
--
-- Pôvodne tu bolo 41 riadkov s `competition_id` napísaným natvrdo (1, 2, 3).
-- V produkcii má ale UCL id 5, takže vloženie padlo na cudzí kľúč. Kódy sa
-- navyše medzičasom menili v admine (BAR1 -> BAR-1, BRO -> BR), takže by tu
-- vznikli neplatné riadky popri tých správnych.
--
-- 076 preto zapisuje stav, ktorý reálne platí, a súťaž dohladáva podľa slugu.

GRANT SELECT, INSERT, UPDATE, DELETE ON admin.competition_phases TO "dbbet-admin";
GRANT USAGE, SELECT ON SEQUENCE admin.competition_phases_id_seq TO "dbbet-admin";

INSERT INTO admin.schema_versions (version, description) VALUES
    (72, 'Ciselnik faz a kol sutaze')
    ON CONFLICT DO NOTHING;

COMMIT;
