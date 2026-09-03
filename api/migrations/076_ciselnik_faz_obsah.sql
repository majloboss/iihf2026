-- Migration 076: obsah ciselnika faz z DEV
--
-- Migracie 072-074 ciselnik zakladaju, ale hodnoty v nich su povodne — po ich
-- spusteni sa este rucne opravovali v admine (FIFA SKA -> A, PO -> BAR, farby,
-- zoskupenia). Tento skript zapise stav, ktory realne plati a proti ktoremu su
-- odskusane filtre.
--
-- Spusta sa PO 072-074. Je opakovatelny: existujuci riadok prepise, chybajuci
-- doplni. Riadky navyse nemaze — v produkcii moze byt sutaz, ktora na DEV nie je.
--
-- competition_id sa medzi prostrediami lisi (DEV 3, produkcia 5), preto sa
-- sutaz dohladava podla slugu.

BEGIN;

CREATE TEMP TABLE _fazy (
    slug            VARCHAR(50),
    phase_code      VARCHAR(20),
    phase_name      VARCHAR(100),
    match_stat_code VARCHAR(20),
    match_stat_desc VARCHAR(150),
    color_code      VARCHAR(20),
    group_code      VARCHAR(20),
    sort_order      INTEGER,
    is_active       BOOLEAN
) ON COMMIT DROP;

INSERT INTO _fazy VALUES
    ('fifa2026', 'A', 'Skupina A', 'A', 'Skupina A', 'GROUP', 'GRP', 10, true),
    ('fifa2026', 'B', 'Skupina B', 'B', 'Skupina B', 'GROUP', 'GRP', 20, true),
    ('fifa2026', 'C', 'Skupina C', 'C', 'Skupina C', 'GROUP', 'GRP', 30, true),
    ('fifa2026', 'D', 'Skupina D', 'D', 'Skupina D', 'GROUP', 'GRP', 40, true),
    ('fifa2026', 'E', 'Skupina E', 'E', 'Skupina E', 'GROUP', 'GRP', 50, true),
    ('fifa2026', 'F', 'Skupina F', 'F', 'Skupina F', 'GROUP', 'GRP', 60, true),
    ('fifa2026', 'G', 'Skupina G', 'G', 'Skupina G', 'GROUP', 'GRP', 70, true),
    ('fifa2026', 'H', 'Skupina H', 'H', 'Skupina H', 'GROUP', 'GRP', 80, true),
    ('fifa2026', 'I', 'Skupina I', 'I', 'Skupina I', 'GROUP', 'GRP', 90, true),
    ('fifa2026', 'J', 'Skupina J', 'J', 'Skupina J', 'GROUP', 'GRP', 100, true),
    ('fifa2026', 'K', 'Skupina K', 'K', 'Skupina K', 'GROUP', 'GRP', 110, true),
    ('fifa2026', 'L', 'Skupina L', 'L', 'Skupina L', 'GROUP', 'GRP', 120, true),
    ('fifa2026', 'R32', 'Šestnásťfinále', 'R32', 'Šestnásťfinále', 'PLAYOFF', 'R32', 130, true),
    ('fifa2026', 'R16', 'Osemfinále', 'R16', 'Osemfinále', 'PLAYOFF', 'R16', 140, true),
    ('fifa2026', 'QF', 'Štvrťfinále', 'QF', 'Štvrťfinále', 'PLAYOFF', 'QF', 150, true),
    ('fifa2026', 'SF', 'Semifinále', 'SF', 'Semifinále', 'PLAYOFF', 'SF', 160, true),
    ('fifa2026', 'BR', 'O 3. miesto', 'BR', 'Zápas o bronz', 'BRONZE', 'BR', 170, true),
    ('fifa2026', 'F', 'Finále', 'FIN', 'Finále', 'GOLD', 'F', 180, true),
    ('iihf2026', 'A', 'Skupina A', 'A', 'Skupina A', 'GROUP', 'A', 10, true),
    ('iihf2026', 'B', 'Skupina B', 'B', 'Skupina B', 'GROUP', 'B', 20, true),
    ('iihf2026', 'QF', 'Štvrťfinále', 'QF', 'Štvrťfinále', 'PLAYOFF', 'QF', 30, true),
    ('iihf2026', 'SF', 'Semifinále', 'SF', 'Semifinále', 'PLAYOFF', 'SF', 40, true),
    ('iihf2026', 'BR', 'O 3. miesto', 'BR', 'Zápas o bronz', 'BRONZE', 'BR', 50, true),
    ('iihf2026', 'F', 'Finále', 'F', 'Finále', 'GOLD', 'F', 60, true),
    ('ucl2026', 'LF1', 'Ligová fáza', 'LF1', 'Ligová fáza - 1. kolo', 'GROUP', 'LF', 10, true),
    ('ucl2026', 'LF2', 'Ligová fáza', 'LF2', 'Ligová fáza - 2. kolo', 'GROUP', 'LF', 20, true),
    ('ucl2026', 'LF3', 'Ligová fáza', 'LF3', 'Ligová fáza - 3. kolo', 'GROUP', 'LF', 30, true),
    ('ucl2026', 'LF4', 'Ligová fáza', 'LF4', 'Ligová fáza - 4. kolo', 'GROUP', 'LF', 40, true),
    ('ucl2026', 'LF5', 'Ligová fáza', 'LF5', 'Ligová fáza - 5. kolo', 'GROUP', 'LF', 50, true),
    ('ucl2026', 'LF6', 'Ligová fáza', 'LF6', 'Ligová fáza - 6. kolo', 'GROUP', 'LF', 60, true),
    ('ucl2026', 'LF7', 'Ligová fáza', 'LF7', 'Ligová fáza - 7. kolo', 'GROUP', 'LF', 70, true),
    ('ucl2026', 'LF8', 'Ligová fáza', 'LF8', 'Ligová fáza - 8. kolo', 'GROUP', 'LF', 80, true),
    ('ucl2026', 'BAR', 'Baráž o play-off', 'BAR-1', 'Baráž - 1. zápas', 'PLAYIN', 'BAR', 90, true),
    ('ucl2026', 'BAR', 'Baráž o play-off', 'BAR-2', 'Baráž - odveta', 'PLAYIN', 'BAR', 100, true),
    ('ucl2026', 'R16', 'Osemfinále', 'R16-1', 'Osemfinále - 1. zápas', 'PLAYOFF', 'R16', 110, true),
    ('ucl2026', 'R16', 'Osemfinále', 'R16-2', 'Osemfinále - odveta', 'PLAYOFF', 'R16', 120, true),
    ('ucl2026', 'QF', 'Štvrťfinále', 'QF-1', 'Štvrťfinále - 1. zápas', 'PLAYOFF', 'QF', 130, true),
    ('ucl2026', 'QF', 'Štvrťfinále', 'QF-2', 'Štvrťfinále - odveta', 'PLAYOFF', 'QF', 140, true),
    ('ucl2026', 'SF', 'Semifinále', 'SF-1', 'Semifinále - 1. zápas', 'PLAYOFF', 'SF', 150, true),
    ('ucl2026', 'SF', 'Semifinále', 'SF-2', 'Semifinále - odveta', 'PLAYOFF', 'SF', 160, true),
    ('ucl2026', 'F', 'Finále', 'F', 'Finále', 'GOLD', 'F', 170, true);

-- Sutaz, ktora v tomto prostredi nie je, sa ticho preskoci.
INSERT INTO admin.competition_phases
    (competition_id, phase_code, phase_name, match_stat_code, match_stat_desc,
     color_code, group_code, sort_order, is_active)
SELECT k.id, f.phase_code, f.phase_name, f.match_stat_code, f.match_stat_desc,
       f.color_code, f.group_code, f.sort_order, f.is_active
  FROM _fazy f
  JOIN admin.competitions k ON k.slug = f.slug
    ON CONFLICT (competition_id, match_stat_code) DO UPDATE
   SET phase_code      = EXCLUDED.phase_code,
       phase_name      = EXCLUDED.phase_name,
       match_stat_desc = EXCLUDED.match_stat_desc,
       color_code      = EXCLUDED.color_code,
       group_code      = EXCLUDED.group_code,
       sort_order      = EXCLUDED.sort_order,
       is_active       = EXCLUDED.is_active,
       updated_at      = NOW();

INSERT INTO admin.schema_versions (version, description) VALUES
    (76, 'Obsah ciselnika faz z DEV')
    ON CONFLICT DO NOTHING;

COMMIT;
