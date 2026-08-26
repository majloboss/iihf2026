<?php
// POST /v1/admin/ucl-game-update - zapis vysledku a schvalenie
require_auth(true);
$pdo = db();
if ($method !== 'POST') json_error('Method not allowed', 405);
require_once __DIR__ . '/../../helpers/ucl_standings_fn.php';
require_once __DIR__ . '/../../helpers/ucl_recalc_fn.php';

$body   = json_decode(file_get_contents('php://input'), true) ?: [];
$gameId = (int)($body['game_id'] ?? 0);
if (!$gameId) json_error('Chýba game_id', 400);

$num = function ($v) { return ($v === null || $v === '') ? null : (int)$v; };
$hr = $num($body['home_score_regular'] ?? null);
$ar = $num($body['away_score_regular'] ?? null);
$hf = $num($body['home_score_final'] ?? null);
$af = $num($body['away_score_final'] ?? null);
$approved = !empty($body['result_approved']);

foreach ([$hr, $ar, $hf, $af] as $v) {
    if ($v !== null && ($v < 0 || $v > 99)) json_error('Skóre musí byť medzi 0 a 99', 400);
}
if ($approved && ($hr === null || $ar === null)) {
    json_error('Na schválenie výsledku treba vyplniť skóre po 90 minútach', 400);
}

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('
        UPDATE "lm2026-27".games
           SET home_score_regular = ?, away_score_regular = ?,
               home_score_final = ?, away_score_final = ?,
               result_approved = ?, tips_open = CASE WHEN ? THEN FALSE ELSE tips_open END,
               updated_at = NOW()
         WHERE game_id = ?
        RETURNING game_id, home_score_regular, away_score_regular,
                  home_score_final, away_score_final, result_approved, tips_open');
    $stmt->execute([$hr, $ar, $hf, $af, $approved, $approved, $gameId]);
    $row = $stmt->fetch();
    if (!$row) json_error('Zápas neexistuje', 404);

    // Vysledok meni tabulku aj body hracov.
    $teams  = ucl_recalc_standings($pdo);
    $points = ucl_recalc_points($pdo);

    $pdo->commit();
    json_ok(['game' => $row, 'standings_rows' => $teams, 'tips_updated' => $points]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
