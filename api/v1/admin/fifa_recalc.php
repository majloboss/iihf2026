<?php
// POST /v1/admin/fifa-recalc  — prepočíta body (všetky alebo jeden zápas cez game_id)
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

require __DIR__ . '/../../helpers/fifa_recalc_fn.php';

$body   = json_decode(file_get_contents('php://input'), true);
$gameId = isset($body['game_id']) ? (int)$body['game_id'] : null;

json_ok(fifa_recalc_game($pdo, $gameId));
