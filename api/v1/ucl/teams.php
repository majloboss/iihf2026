<?php
// GET /v1/ucl/teams - kluby uctastnice LM (tie, ktore maju zapas)
require_auth();
$pdo = db();
if ($method !== 'GET') json_error('Method not allowed', 405);

json_ok($pdo->query('
    SELECT DISTINCT c.club_id AS team_id, c.club_code AS team_code, c.club_name AS team_name,
           c.logo_file, c.country_code,
           s.name_sk AS country_name,
           COALESCE(s.sport_code_uefa, s.country_code) AS country_display_code,
           s.flag_file
      FROM admin.uefa_clubs c
      LEFT JOIN admin.countries s ON s.country_code = c.country_code
     WHERE EXISTS (SELECT 1 FROM "lm2026-27".games g
                    WHERE g.home_team_id = c.club_id OR g.away_team_id = c.club_id)
     ORDER BY c.club_name')->fetchAll());
