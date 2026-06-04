<?php
// GET /v1/fifa/games          - všetky zápasy + môj tip
// GET /v1/fifa/games?id=X     - detail zápasu
$auth = require_auth();
$pdo  = db();

if ($method !== 'GET') json_error('Method not allowed', 405);

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($id) {
    $stmt = $pdo->prepare("
        SELECT g.game_id, g.start_time, g.venue, g.tips_open,
               g.home_score_regular, g.away_score_regular,
               g.home_score_final, g.away_score_final,
               g.result_approved, g.game_type_code, g.game_type_name,
           g.home_team_id, g.away_team_id, g.flashscore_url,
           g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
               ht.team_code AS home_code, ht.team_name AS home_name, ht.group_name AS home_group,
               at.team_code AS away_code, at.team_name AS away_name, at.group_name AS away_group,
               t.home_score_tip, t.away_score_tip, t.points_earned
        FROM fifa2026.games g
        LEFT JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        LEFT JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        LEFT JOIN fifa2026.tips  t  ON t.game_id  = g.game_id AND t.user_id = :uid
        WHERE g.game_id = :id
    ");
    $stmt->execute([':uid' => $auth['user_id'], ':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Zápas neexistuje', 404);
    json_ok($row);
}

$stmt = $pdo->prepare("
    SELECT g.game_id, g.start_time, g.venue, g.tips_open,
           g.home_score_regular, g.away_score_regular,
           g.home_score_final,   g.away_score_final,
           g.result_approved, g.game_type_code, g.game_type_name,
           g.home_team_id, g.away_team_id, g.flashscore_url,
           g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
           ht.team_code AS home_code, ht.team_name AS home_name,
           at.team_code AS away_code, at.team_name AS away_name,
           t.home_score_tip, t.away_score_tip, t.points_earned
    FROM fifa2026.games g
    LEFT JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
    LEFT JOIN fifa2026.teams at ON at.team_id = g.away_team_id
    LEFT JOIN fifa2026.tips  t  ON t.game_id  = g.game_id AND t.user_id = :uid
    ORDER BY g.start_time, g.game_id
");
$stmt->execute([':uid' => $auth['user_id']]);
json_ok($stmt->fetchAll());
