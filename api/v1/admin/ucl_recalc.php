<?php
// POST /v1/admin/ucl-recalc - rucny prepocet tabulky a bodov
require_auth(true);
$pdo = db();
if ($method !== 'POST') json_error('Method not allowed', 405);
require_once __DIR__ . '/../../helpers/ucl_standings_fn.php';
require_once __DIR__ . '/../../helpers/ucl_recalc_fn.php';

try {
    $pdo->beginTransaction();
    $teams  = ucl_recalc_standings($pdo);
    $points = ucl_recalc_points($pdo);
    $pdo->commit();
    json_ok(['standings_rows' => $teams, 'tips_updated' => $points]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
