-- ============================================================
-- Migration 085: ktore zapasy volanie obsluzilo
--
-- Jedno volanie sa pyta na vsetky zapasy naraz, takze game_id ostava NULL a
-- z logu sa nedalo zistit, kolko stal konkretny zapas. Rucne delenie celkovej
-- ceny poctom zapasov nesedi: zapasy, ktore este nezacali alebo uz skoncili,
-- su vo feede tiez, ale hodnotu neprinasaju.
--
-- Ukladame preto zoznam ID zapasov, ktore volanie naozaj vratilo, a zvlast
-- tie, ktore prave bezali. Cena zapasu = suma podielov z volani, ktore ho
-- obsluzili — a deli sa poctom BEZIACICH, nie vsetkych sledovanych.
-- ============================================================

BEGIN;

ALTER TABLE admin.livescore_log
    ADD COLUMN IF NOT EXISTS game_ids  INT[],   -- zapasy vratene vo feede
    ADD COLUMN IF NOT EXISTS live_ids  INT[];   -- z nich tie, ktore prave bezali

COMMENT ON COLUMN admin.livescore_log.game_ids IS
    'Zapasy, ktore volanie obsluzilo — jedno volanie ich pokryva viac';
COMMENT ON COLUMN admin.livescore_log.live_ids IS
    'Z nich tie, ktore prave bezali; podla nich sa deli cena volania';

INSERT INTO admin.schema_versions (version, description)
VALUES (85, 'Zoznam zapasov v livescore_log pre rozpocitanie ceny')
ON CONFLICT (version) DO NOTHING;

COMMIT;
