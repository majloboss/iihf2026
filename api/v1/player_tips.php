<?php
// GET /v1/player-tips?user_id=X&competition_id=Y
// Vráti tipy hráča pre danú súťaž — zoradené podľa času zápasu.
$auth = require_auth();
$pdo  = db();

$target_uid = (int)($_GET['user_id'] ?? 0);
$cid        = (int)($_GET['competition_id'] ?? 0);
if (!$target_uid || !$cid) json_error('Chýba user_id alebo competition_id', 400);

$cs = $pdo->prepare("SELECT slug FROM admin.competitions WHERE id = ?");
$cs->execute([$cid]);
$slug = $cs->fetchColumn();
if (!$slug) json_error('Súťaž neexistuje', 404);

if ($slug === 'ucl2026') {
    // Kluby su v trvalom ciselniku admin.uefa_clubs, nie v rocnikovej scheme.
    $stmt = $pdo->prepare('
        SELECT
            g.game_id      AS game_id,
            g.start_time   AS starts_at,
            g.game_type_code AS phase,
            hc.club_code   AS team1,
            ac.club_code   AS team2,
            g.home_score_regular AS score1,
            g.away_score_regular AS score2,
            g.result_approved,
            t.home_score_tip AS tip1,
            t.away_score_tip AS tip2,
            t.points_earned  AS points
        FROM "lm2026-27".games g
        JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
        JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
        LEFT JOIN "lm2026-27".tips t ON t.game_id = g.game_id AND t.user_id = :uid
        WHERE g.result_approved = TRUE
        ORDER BY g.start_time');
    $stmt->execute([':uid' => $target_uid]);
} elseif ($slug === 'fifa2026') {
    $stmt = $pdo->prepare("
        SELECT
            g.game_id      AS game_id,
            g.start_time   AS starts_at,
            g.game_type_code AS phase,
            ht.team_code   AS team1,
            at.team_code   AS team2,
            g.home_score_regular AS score1,
            g.away_score_regular AS score2,
            g.result_approved,
            t.home_score_tip AS tip1,
            t.away_score_tip AS tip2,
            t.points_earned  AS points
        FROM fifa2026.games g
        JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        LEFT JOIN fifa2026.tips t ON t.game_id = g.game_id AND t.user_id = :uid
        WHERE g.result_approved = TRUE
        ORDER BY g.start_time
    ");
    $stmt->execute([':uid' => $target_uid]);
} else {
    $stmt = $pdo->prepare("
        SELECT
            g.id           AS game_id,
            g.starts_at,
            g.phase,
            g.team1,
            g.team2,
            g.score1,
            g.score2,
            (g.status = 'finished') AS result_approved,
            t.tip1,
            t.tip2,
            t.points
        FROM iihf2026.games g
        LEFT JOIN iihf2026.tips t ON t.game_id = g.id AND t.user_id = :uid
        WHERE g.status = 'finished'
        ORDER BY g.starts_at
    ");
    $stmt->execute([':uid' => $target_uid]);
}

$rows = $stmt->fetchAll();

// Kumulatívne body pre graf
$cumulative = 0;
$chart = [];
foreach ($rows as &$r) {
    $r['result_approved'] = ($r['result_approved'] === true || $r['result_approved'] === 't' || $r['result_approved'] === '1' || $r['result_approved'] === 1);
    $pts = $r['points'] !== null ? (int)$r['points'] : 0;
    $cumulative += $pts;
    $r['points'] = $r['points'] !== null ? (int)$r['points'] : null;
    $chart[] = [
        'game_id'    => $r['game_id'],
        'label'      => $r['team1'] . '–' . $r['team2'],
        'cumulative' => $cumulative,
    ];
}
unset($r);

json_ok(['tips' => $rows, 'chart' => $chart]);
