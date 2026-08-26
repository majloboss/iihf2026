<?php
// GET /v1/ucl/games       - vsetky zapasy LM + moj tip
// GET /v1/ucl/games?id=X  - detail zapasu
// Kluby su v trvalom ciselniku admin.uefa_clubs, nie v rocnikovej scheme.
$auth = require_auth();
$pdo  = db();

if ($method !== 'GET') json_error('Method not allowed', 405);

// PDO pgsql vracia bool ako 't'/'f' a int ako string.
function ucl_cast_game(?array $r): ?array {
    if ($r === null) return null;
    $ints  = ['game_id','home_score_regular','away_score_regular','home_score_final','away_score_final',
              'home_team_id','away_team_id','ls_home','ls_away','home_score_tip','away_score_tip','points_earned'];
    $bools = ['result_approved','tips_open'];
    foreach ($ints  as $c) if (array_key_exists($c, $r)) $r[$c] = $r[$c] === null ? null : (int)$r[$c];
    foreach ($bools as $c) if (array_key_exists($c, $r)) $r[$c] = ($r[$c] === true || $r[$c] === 't' || $r[$c] === '1' || $r[$c] === 1);
    return $r;
}

$select = '
    SELECT g.game_id, g.start_time, g.venue, g.tips_open,
           g.home_score_regular, g.away_score_regular,
           g.home_score_final,   g.away_score_final,
           g.result_approved, g.game_type_code, g.game_type_name,
           g.home_team_id, g.away_team_id, g.flashscore_url,
           -- Cislo kola ligovej fazy sa da odvodit z nazvu ("Ligová fáza — 3. kolo").
           NULLIF(substring(g.game_type_name from '([0-9]+)\. kolo'), '')::int AS round_no,
           g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
           hc.club_code AS home_code, hc.club_name AS home_name,
           hc.logo_file AS home_logo, hs.name_sk AS home_country,
           COALESCE(hs.sport_code_uefa, hs.country_code) AS home_country_code,
           ac.club_code AS away_code, ac.club_name AS away_name,
           ac.logo_file AS away_logo, acs.name_sk AS away_country,
           COALESCE(acs.sport_code_uefa, acs.country_code) AS away_country_code,
           t.home_score_tip, t.away_score_tip, t.points_earned
      FROM "lm2026-27".games g
      LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
      LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
      LEFT JOIN admin.countries  hs ON hs.country_code = hc.country_code
      LEFT JOIN admin.countries acs ON acs.country_code = ac.country_code
      LEFT JOIN "lm2026-27".tips t ON t.game_id = g.game_id AND t.user_id = :uid';

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($id) {
    $stmt = $pdo->prepare($select . ' WHERE g.game_id = :id');
    $stmt->execute([':uid' => $auth['user_id'], ':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Zápas neexistuje', 404);
    json_ok(ucl_cast_game($row));
}

$stmt = $pdo->prepare($select . ' ORDER BY g.start_time, g.game_id');
$stmt->execute([':uid' => $auth['user_id']]);
json_ok(array_map('ucl_cast_game', $stmt->fetchAll()));
