-- Migration 022: Live score podpora
-- Všetky zmeny sú ADDITIVE (nullable / default) — žiadny dopad na existujúcu aplikáciu.
-- Spusti ako: psql -h [host] -U [user] -d DB-BET -f run_022_livescore.sql

-- ============================================================
-- 1. iihf2026.teams — api_name (názov tímu v api-sports.io)
--    Stĺpec code (nie team_code), api_name stĺpec už existuje z predchádzajúceho behu.
-- ============================================================
ALTER TABLE iihf2026.teams
    ADD COLUMN IF NOT EXISTS api_name VARCHAR(100);

UPDATE iihf2026.teams SET api_name = 'Austria'        WHERE code = 'AUT';
UPDATE iihf2026.teams SET api_name = 'Canada'         WHERE code = 'CAN';
UPDATE iihf2026.teams SET api_name = 'Czech Republic' WHERE code = 'CZE';
UPDATE iihf2026.teams SET api_name = 'Denmark'        WHERE code = 'DEN';
UPDATE iihf2026.teams SET api_name = 'Finland'        WHERE code = 'FIN';
UPDATE iihf2026.teams SET api_name = 'Germany'        WHERE code = 'GER';
UPDATE iihf2026.teams SET api_name = 'Great Britain'  WHERE code = 'GBR';
UPDATE iihf2026.teams SET api_name = 'Hungary'        WHERE code = 'HUN';
UPDATE iihf2026.teams SET api_name = 'Italy'          WHERE code = 'ITA';
UPDATE iihf2026.teams SET api_name = 'Latvia'         WHERE code = 'LAT';
UPDATE iihf2026.teams SET api_name = 'Norway'         WHERE code = 'NOR';
UPDATE iihf2026.teams SET api_name = 'Slovakia'       WHERE code = 'SVK';
UPDATE iihf2026.teams SET api_name = 'Slovenia'       WHERE code = 'SLO';
UPDATE iihf2026.teams SET api_name = 'Sweden'         WHERE code = 'SWE';
UPDATE iihf2026.teams SET api_name = 'Switzerland'    WHERE code = 'SUI';
UPDATE iihf2026.teams SET api_name = 'USA'            WHERE code = 'USA';

-- ============================================================
-- 2. iihf2026.games — ls_* stĺpce (live score z api-sports)
--    Všetky nullable — existujúce riadky dostanú NULL, nič sa nezmení.
-- ============================================================
ALTER TABLE iihf2026.games
    ADD COLUMN IF NOT EXISTS ls_score1            INT,
    ADD COLUMN IF NOT EXISTS ls_score2            INT,
    ADD COLUMN IF NOT EXISTS ls_final1            INT,
    ADD COLUMN IF NOT EXISTS ls_final2            INT,
    ADD COLUMN IF NOT EXISTS ls_status            VARCHAR(10),
    ADD COLUMN IF NOT EXISTS ls_api_game_id       INT,
    ADD COLUMN IF NOT EXISTS ls_updated_at        TIMESTAMP,
    ADD COLUMN IF NOT EXISTS ls_requests_expected INT,
    ADD COLUMN IF NOT EXISTS ls_requests_actual   INT NOT NULL DEFAULT 0;

-- ============================================================
-- 3. iihf2026.livescore_daily — denný counter API volaní
-- ============================================================
CREATE TABLE IF NOT EXISTS iihf2026.livescore_daily (
    date      DATE PRIMARY KEY,
    api_calls INT  NOT NULL DEFAULT 0
);

-- ============================================================
-- 4. Verzia
-- ============================================================
INSERT INTO admin.schema_versions (version, description)
VALUES (22, 'Live score: teams.api_name, games.ls_*, livescore_daily')
ON CONFLICT (version) DO NOTHING;
