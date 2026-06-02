-- Migration 026: FIFA 2026 group_standings seed (48 timov, vsetky skupiny A-L)
INSERT INTO fifa2026.group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, finalized)
SELECT group_name, team_code, 0, 0, 0, 0, 0, 0, 0, 0, FALSE
FROM fifa2026.teams
ON CONFLICT (phase, team) DO NOTHING;

INSERT INTO admin.schema_versions (version, description)
VALUES (26, 'FIFA 2026: group_standings seed - 48 timov')
ON CONFLICT (version) DO NOTHING;
