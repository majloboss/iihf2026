<?php
// GET /v1/ucl/game-tips?game_id=X - tipy vsetkych hracov na zapas (az po uzavreti)
$auth = require_auth();
$pdo  = db();
if ($method !== 'GET') json_error('Method not allowed', 405);

$gameId = (int)($_GET['game_id'] ?? 0);
if (!$gameId) json_error('Chýba game_id', 400);

$stmt = $pdo->prepare('SELECT start_time, tips_open FROM "lm2026-27".games WHERE game_id = ?');
$stmt->execute([$gameId]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

// Cudzie tipy sa odkryju az ked sa tipovanie uzavrie.
$started = new DateTime('now', new DateTimeZone('UTC'))
    >= new DateTime($game['start_time'], new DateTimeZone('UTC'));
if ($game['tips_open'] && !$started) {
    json_ok(['visible' => false, 'tips' => []]);
}

$stmt = $pdo->prepare('
    SELECT u.id AS user_id, u.username, u.first_name, u.last_name,
           t.home_score_tip, t.away_score_tip, t.points_earned
      FROM "lm2026-27".tips t
      JOIN admin.users u ON u.id = t.user_id
     WHERE t.game_id = ?
     ORDER BY t.points_earned DESC NULLS LAST, u.username');
$stmt->execute([$gameId]);
json_ok(['visible' => true, 'tips' => $stmt->fetchAll()]);
