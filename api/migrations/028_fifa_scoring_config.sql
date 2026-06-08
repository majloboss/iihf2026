-- Migration 028: FIFA 2026 scoring_config - správne hodnoty
-- Skupiny: správny výsledok=3, playoff: správny výsledok=5, gól=1
DELETE FROM fifa2026.scoring_config;

INSERT INTO fifa2026.scoring_config (key, value) VALUES
    ('correct_result_group',   3),
    ('correct_result_playoff', 5),
    ('correct_goals_per_team', 1);

INSERT INTO admin.schema_versions (version, description)
VALUES (28, 'FIFA scoring_config: group=3, playoff=5, goals_per_team=1')
ON CONFLICT (version) DO NOTHING;
