<?php
// POST /v1/admin/fifa-game-live
// Nastaví/zmaže živé skóre zápasu (manuálne, počas zápasu).
// Body: { game_id, ls_home, ls_away }  alebo { game_id, clear: true }
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id'] ?? 0);
if (!$gid) json_error('Chýba game_id', 400);

$chk = $pdo->prepare("SELECT game_id FROM fifa2026.games WHERE game_id = ?");
$chk->execute([$gid]);
if (!$chk->fetch()) json_error('Zápas neexistuje', 404);

if (!empty($body['clear'])) {
    $pdo->prepare("UPDATE fifa2026.games SET ls_home=NULL, ls_away=NULL, ls_status=NULL, ls_updated_at=NULL WHERE game_id=?")
        ->execute([$gid]);
    json_ok(['game_id' => $gid, 'cleared' => true]);
}

$h = $body['ls_home'] ?? null;
$a = $body['ls_away'] ?? null;
if (!is_numeric($h) || !is_numeric($a) || $h < 0 || $a < 0) json_error('Neplatné skóre', 400);

$pdo->prepare("
    UPDATE fifa2026.games
    SET ls_home = ?, ls_away = ?, ls_status = 'LIVE', ls_updated_at = NOW()
    WHERE game_id = ?
")->execute([(int)$h, (int)$a, $gid]);

json_ok(['game_id' => $gid, 'ls_home' => (int)$h, 'ls_away' => (int)$a]);
