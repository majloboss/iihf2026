<?php
// POST /v1/admin/fifa-game-edit
// Úprava metadát zápasu: dátum/čas, štadión, tímy (playoff)
// Body: { game_id, start_time?, venue?, home_team_id?, away_team_id? }
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id'] ?? 0);
if (!$gid) json_error('Chýba game_id', 400);

$stmt = $pdo->prepare("SELECT game_id, game_type_code FROM fifa2026.games WHERE game_id = ?");
$stmt->execute([$gid]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

$isGroup = str_starts_with($game['game_type_code'], 'GROUP_');

$sets = [];
$params = [];

if (array_key_exists('start_time', $body) && $body['start_time']) {
    $sets[] = "start_time = ?";
    $params[] = $body['start_time'];  // očakáva sa 'YYYY-MM-DD HH:MM:00' v UTC
}
if (array_key_exists('venue', $body)) {
    $sets[] = "venue = ?";
    $params[] = trim($body['venue'] ?? '');
}

// Tímy meníme len pri play-off
if (!$isGroup) {
    if (array_key_exists('home_team_id', $body)) {
        $sets[] = "home_team_id = ?";
        $params[] = $body['home_team_id'] !== '' && $body['home_team_id'] !== null ? (int)$body['home_team_id'] : null;
    }
    if (array_key_exists('away_team_id', $body)) {
        $sets[] = "away_team_id = ?";
        $params[] = $body['away_team_id'] !== '' && $body['away_team_id'] !== null ? (int)$body['away_team_id'] : null;
    }
}

if (empty($sets)) json_error('Nič na uloženie', 400);

$sets[] = "updated_at = NOW()";
$params[] = $gid;

$pdo->prepare("UPDATE fifa2026.games SET " . implode(', ', $sets) . " WHERE game_id = ?")->execute($params);

json_ok(['game_id' => $gid, 'saved' => true]);
