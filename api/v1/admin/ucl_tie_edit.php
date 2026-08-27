<?php
// PUT /v1/admin/ucl-tie-edit — uprava celej playoff dvojice naraz
//
// V playoff sa hraju dva zapasy, preto sa zadavaju spolu: dvojica timov plati
// pre oba, v odvete su timy prehodene. Kazdy zapas ma vlastny termin a stadion.
//
// Telo: {
//   tie_id, home_team_id, away_team_id,
//   first:  { start_time, venue },
//   second: { start_time, venue }
// }
require_auth(true);
$pdo = db();
if ($method !== 'PUT') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$tieId = trim((string)($body['tie_id'] ?? ''));
if ($tieId === '') json_error('Chýba tie_id', 400);

$homeId = isset($body['home_team_id']) && $body['home_team_id'] !== '' ? (int)$body['home_team_id'] : null;
$awayId = isset($body['away_team_id']) && $body['away_team_id'] !== '' ? (int)$body['away_team_id'] : null;
if ($homeId !== null && $homeId === $awayId) json_error('Tím nemôže hrať sám proti sebe', 400);

$leg = function (array $data, string $label) {
    $start = trim((string)($data['start_time'] ?? ''));
    $venue = trim((string)($data['venue'] ?? ''));
    if ($start === '' || !strtotime($start)) json_error("Neplatný čas začiatku — $label", 400);
    if (mb_strlen($venue) > 100) json_error("Štadión môže mať najviac 100 znakov — $label", 400);
    return [date('Y-m-d H:i:s', strtotime($start)), $venue];
};
[$firstStart, $firstVenue]   = $leg($body['first'] ?? [], '1. zápas');
[$secondStart, $secondVenue] = $leg($body['second'] ?? [], 'odveta');

if (strtotime($secondStart) <= strtotime($firstStart)) {
    json_error('Odveta sa musí hrať neskôr ako prvý zápas', 400);
}

$exists = function (?int $clubId) use ($pdo) {
    if ($clubId === null) return;
    $s = $pdo->prepare('SELECT 1 FROM admin.uefa_clubs WHERE club_id = ?');
    $s->execute([$clubId]);
    if (!$s->fetch()) json_error('Vybraný klub neexistuje v číselníku', 400);
};
$exists($homeId);
$exists($awayId);

try {
    $pdo->beginTransaction();

    $check = $pdo->prepare('SELECT leg FROM "lm2026-27".games WHERE tie_id = ? ORDER BY leg');
    $check->execute([$tieId]);
    $legs = $check->fetchAll(PDO::FETCH_COLUMN);
    if (count($legs) !== 2) json_error('Dvojica neexistuje alebo nemá dva zápasy', 404);

    // Prvy zapas: zadana dvojica timov.
    $upd = $pdo->prepare('UPDATE "lm2026-27".games
                             SET home_team_id = ?, away_team_id = ?, start_time = ?, venue = ?, updated_at = NOW()
                           WHERE tie_id = ? AND leg = ?');
    $upd->execute([$homeId, $awayId, $firstStart, $firstVenue, $tieId, 1]);

    // Odveta: timy prehodene.
    $upd->execute([$awayId, $homeId, $secondStart, $secondVenue, $tieId, 2]);

    $rows = $pdo->prepare('SELECT game_id, tie_id, leg, home_team_id, away_team_id, start_time, venue
                             FROM "lm2026-27".games WHERE tie_id = ? ORDER BY leg');
    $rows->execute([$tieId]);
    $result = $rows->fetchAll();

    $pdo->commit();
    json_ok(['tie_id' => $tieId, 'games' => $result]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
