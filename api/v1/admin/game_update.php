<?php
// POST /v1/admin/game-update
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body    = json_decode(file_get_contents('php://input'), true);
$game_id = (int)($body['game_id'] ?? 0);
if (!$game_id) json_error('Chýba game_id', 400);

$allowed_teams = ['FIN','GER','USA','SUI','GBR','AUT','HUN','LAT',
                  'CAN','SWE','CZE','DEN','SVK','NOR','ITA','SLO'];

$sets   = [];
$params = [':id' => $game_id];

if (array_key_exists('starts_at', $body)) {
    try {
        $dt = new DateTime($body['starts_at']);
    } catch (Exception $e) {
        json_error('Neplatný formát dátumu', 400);
    }
    if (!$dt) json_error('Neplatný formát dátumu', 400);
    $sets[] = 'starts_at = :starts_at';
    $params[':starts_at'] = $dt->format('Y-m-d H:i:sP');
}

foreach (['team1', 'team2'] as $f) {
    if (array_key_exists($f, $body)) {
        $val = $body[$f];
        if ($val !== null && !in_array($val, $allowed_teams, true)) json_error("Neplatný tím: $val", 400);
        $sets[] = "$f = :$f";
        $params[":$f"] = $val ?: null;
    }
}

if (array_key_exists('venue', $body)) {
    $sets[] = 'venue = :venue';
    $params[':venue'] = trim($body['venue']) ?: null;
}

if (array_key_exists('status', $body)) {
    if (!in_array($body['status'], ['scheduled', 'live', 'finished'], true)) json_error('Neplatný status', 400);
    $sets[] = 'status = :status';
    $params[':status'] = $body['status'];
}

foreach (['score1', 'score2'] as $f) {
    if (array_key_exists($f, $body)) {
        $sets[] = "$f = :$f";
        $params[":$f"] = $body[$f] !== null && $body[$f] !== '' ? (int)$body[$f] : null;
    }
}

if (empty($sets)) json_error('Nič na uloženie', 400);

$affected = db()->prepare('UPDATE iihf2026.games SET ' . implode(', ', $sets) . ' WHERE id = :id')
                ->execute($params);

json_ok(['saved' => true]);
