<?php
// POST /v1/admin/fifa-game-update
// Zadá výsledok FIFA zápasu (90 min + finálny výsledok po ET/penalties)
// Body: { game_id, home_score_regular, away_score_regular, home_score_final?, away_score_final? }
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id']            ?? 0);
$h90  = $body['home_score_regular']       ?? null;
$a90  = $body['away_score_regular']       ?? null;
$hFin = $body['home_score_final']         ?? null;
$aFin = $body['away_score_final']         ?? null;
$approve = (bool)($body['result_approved'] ?? true);

if (!$gid) json_error('Chýba game_id', 400);
if (!is_numeric($h90) || !is_numeric($a90) || $h90 < 0 || $a90 < 0) {
    json_error('Neplatné skóre (90 min)', 400);
}

$stmt = $pdo->prepare("SELECT game_id, game_type_code FROM fifa2026.games WHERE game_id = ?");
$stmt->execute([$gid]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

$pdo->prepare("
    UPDATE fifa2026.games SET
        home_score_regular = ?,
        away_score_regular = ?,
        home_score_final   = ?,
        away_score_final   = ?,
        result_approved    = ?,
        tips_open          = FALSE,
        updated_at         = NOW()
    WHERE game_id = ?
")->execute([(int)$h90, (int)$a90, $hFin !== null ? (int)$hFin : null,
             $aFin !== null ? (int)$aFin : null, $approve ? 'TRUE' : 'FALSE', $gid]);

json_ok(['game_id' => $gid, 'saved' => true]);
