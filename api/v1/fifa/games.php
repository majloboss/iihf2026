<?php
// GET /v1/fifa/games          - všetky zápasy + môj tip
// GET /v1/fifa/games?id=X     - detail zápasu
$auth = require_auth();
$pdo  = db();

// Skratka kola z ciselnika. Stlpec `phase_id` pridava migracia 075 — kym
// nebezi, appka si skratku odvodi zo stareho `game_type_code`.
$maPhaseId = stlpec_existuje($pdo, 'fifa2026', 'games', 'phase_id');
$fazaSelect = $maPhaseId
    ? 'g.phase_id, ph.match_stat_code, ph.match_stat_desc, ph.color_code AS phase_color,'
    : 'NULL::int AS phase_id, NULL AS match_stat_code, NULL AS match_stat_desc,
       NULL AS phase_color,';
$fazaJoin = $maPhaseId
    ? 'LEFT JOIN admin.competition_phases ph ON ph.id = g.phase_id'
    : '';


if ($method !== 'GET') json_error('Method not allowed', 405);

// Deterministické typy (PDO pgsql môže vracať bool ako 't'/'f' a int ako string)
function fifa_cast_game(?array $r): ?array {
    if ($r === null) return null;
    $ints  = ['game_id','home_score_regular','away_score_regular','home_score_final','away_score_final',
              'home_team_id','away_team_id','ls_home','ls_away','home_score_tip','away_score_tip','points_earned'];
    $bools = ['result_approved','tips_open'];
    foreach ($ints  as $c) if (array_key_exists($c, $r)) $r[$c] = $r[$c] === null ? null : (int)$r[$c];
    foreach ($bools as $c) if (array_key_exists($c, $r)) $r[$c] = ($r[$c] === true || $r[$c] === 't' || $r[$c] === '1' || $r[$c] === 1);
    return $r;
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($id) {
    $stmt = $pdo->prepare("
        SELECT g.game_id, g.start_time, g.venue, g.tips_open,
               g.home_score_regular, g.away_score_regular,
               g.home_score_final, g.away_score_final,
               g.result_approved, g.game_type_code, g.game_type_name,
               {$fazaSelect}
           g.home_team_id, g.away_team_id, g.flashscore_url,
           g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
               ht.team_code AS home_code, ht.team_name AS home_name, ht.group_name AS home_group,
               at.team_code AS away_code, at.team_name AS away_name, at.group_name AS away_group,
               t.home_score_tip, t.away_score_tip, t.points_earned
        FROM fifa2026.games g
        {$fazaJoin}
        LEFT JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        LEFT JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        LEFT JOIN fifa2026.tips  t  ON t.game_id  = g.game_id AND t.user_id = :uid
        WHERE g.game_id = :id
    ");
    $stmt->execute([':uid' => $auth['user_id'], ':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Zápas neexistuje', 404);
    json_ok(fifa_cast_game($row));
}

$stmt = $pdo->prepare("
    SELECT g.game_id, g.start_time, g.venue, g.tips_open,
           g.home_score_regular, g.away_score_regular,
           g.home_score_final,   g.away_score_final,
           g.result_approved, g.game_type_code, g.game_type_name,
           {$fazaSelect}
           g.home_team_id, g.away_team_id, g.flashscore_url,
           g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
           ht.team_code AS home_code, ht.team_name AS home_name,
           at.team_code AS away_code, at.team_name AS away_name,
           t.home_score_tip, t.away_score_tip, t.points_earned
    FROM fifa2026.games g
    {$fazaJoin}
    LEFT JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
    LEFT JOIN fifa2026.teams at ON at.team_id = g.away_team_id
    LEFT JOIN fifa2026.tips  t  ON t.game_id  = g.game_id AND t.user_id = :uid
    ORDER BY g.start_time, g.game_id
");
$stmt->execute([':uid' => $auth['user_id']]);
json_ok(array_map('fifa_cast_game', $stmt->fetchAll()));
