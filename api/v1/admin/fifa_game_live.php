<?php
// POST /v1/admin/fifa-game-live
// Nastaví/zmaže živé skóre, alebo zmrazí 90-min základ pre priebežné body (predĺženie).
// Body: { game_id, ls_home, ls_away }      — živé skóre (aktuálny stav, aj počas ET)
//       { game_id, freeze90: true, reg_home, reg_away } — zmraziť 90-min (result_approved ostáva FALSE)
//       { game_id, unfreeze90: true }       — zrušiť zmrazenie
//       { game_id, clear: true }            — zmazať živé skóre
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id'] ?? 0);
if (!$gid) json_error('Chýba game_id', 400);

$chk = $pdo->prepare("SELECT result_approved FROM fifa2026.games WHERE game_id = ?");
$chk->execute([$gid]);
$row = $chk->fetch();
if (!$row) json_error('Zápas neexistuje', 404);

if (!empty($body['clear'])) {
    $pdo->prepare("UPDATE fifa2026.games SET ls_home=NULL, ls_away=NULL, ls_status=NULL, ls_updated_at=NULL WHERE game_id=?")
        ->execute([$gid]);
    json_ok(['game_id' => $gid, 'cleared' => true]);
}

// Zmraziť 90-min základ (pre priebežné body počas predĺženia)
if (!empty($body['freeze90'])) {
    if ($row['result_approved']) json_error('Zápas je už odohraný', 409);
    $rh = $body['reg_home'] ?? null;
    $ra = $body['reg_away'] ?? null;
    if (!is_numeric($rh) || !is_numeric($ra) || $rh < 0 || $ra < 0) json_error('Neplatné 90-min skóre', 400);
    $pdo->prepare("UPDATE fifa2026.games SET home_score_regular = ?, away_score_regular = ? WHERE game_id = ?")
        ->execute([(int)$rh, (int)$ra, $gid]);
    json_ok(['game_id' => $gid, 'reg_home' => (int)$rh, 'reg_away' => (int)$ra]);
}

if (!empty($body['unfreeze90'])) {
    if ($row['result_approved']) json_error('Zápas je už odohraný', 409);
    $pdo->prepare("UPDATE fifa2026.games SET home_score_regular = NULL, away_score_regular = NULL WHERE game_id = ?")
        ->execute([$gid]);
    json_ok(['game_id' => $gid, 'unfrozen' => true]);
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
