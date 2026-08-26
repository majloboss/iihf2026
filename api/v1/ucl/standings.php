<?php
// GET /v1/ucl/standings - ligova tabulka LM (jedna spolocna, 36 klubov)
require_auth();
$pdo = db();
if ($method !== 'GET') json_error('Method not allowed', 405);
require_once __DIR__ . '/../../helpers/ucl_standings_fn.php';

$rows = $pdo->query('
    SELECT s.rank, s.team, s.gp, s.w, s.d, s.l, s.gf, s.ga, (s.gf - s.ga) AS gd, s.pts,
           c.club_name AS team_name, c.logo_file,
           st.name_sk AS country_name,
           COALESCE(st.sport_code_uefa, st.country_code) AS country_code,
           st.flag_file
      FROM "lm2026-27".group_standings s
      JOIN admin.uefa_clubs c ON c.club_code = s.team
      LEFT JOIN admin.countries st ON st.country_code = c.country_code
     WHERE s.phase = \'LEAGUE\'
     ORDER BY s.rank')->fetchAll();

// Postupove pasmo: 1-8 priamo do osemfinale, 9-24 playoff, 25-36 koniec.
foreach ($rows as &$r) {
    $r['rank'] = (int)$r['rank'];
    foreach (['gp','w','d','l','gf','ga','gd','pts'] as $c) $r[$c] = (int)$r[$c];
    $r['zone'] = ucl_zone($r['rank']);
}
json_ok($rows);
