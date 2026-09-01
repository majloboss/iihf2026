<?php
// PUT /v1/admin/ucl-game-edit - uprava zapasu (timy, cas, stadion, tipovanie)
// Po oficialnom zrebe sa tymto doplnia spravne dvojice.
require_auth(true);
$pdo = db();
if ($method !== 'PUT') json_error('Method not allowed', 405);

$body   = json_decode(file_get_contents('php://input'), true) ?: [];
$gameId = (int)($body['game_id'] ?? 0);
if (!$gameId) json_error('Chýba game_id', 400);

$homeId = isset($body['home_team_id']) && $body['home_team_id'] !== '' ? (int)$body['home_team_id'] : null;
$awayId = isset($body['away_team_id']) && $body['away_team_id'] !== '' ? (int)$body['away_team_id'] : null;
$start  = trim((string)($body['start_time'] ?? ''));
$venue  = trim((string)($body['venue'] ?? ''));
$flash  = trim((string)($body['flashscore_url'] ?? ''));
$tipsOpen = !isset($body['tips_open']) || filter_var($body['tips_open'], FILTER_VALIDATE_BOOLEAN);

if ($homeId !== null && $homeId === $awayId) json_error('Tím nemôže hrať sám proti sebe', 400);
if ($start === '' || !strtotime($start)) json_error('Neplatný čas začiatku', 400);
if (mb_strlen($venue) > 100) json_error('Štadión môže mať najviac 100 znakov', 400);
if ($flash !== '' && !preg_match('#^https?://#i', $flash)) json_error('Odkaz musí začínať http:// alebo https://', 400);

$exists = function (?int $clubId) use ($pdo) {
    if ($clubId === null) return;
    $s = $pdo->prepare('SELECT 1 FROM admin.uefa_clubs WHERE club_id = ?');
    $s->execute([$clubId]);
    if (!$s->fetch()) json_error('Vybraný klub neexistuje v číselníku', 400);
};
$exists($homeId);
$exists($awayId);

// PDO posiela PHP false ako prazdny retazec, ktory Postgres pre boolean neprijme.
$tipsOpenSql = $tipsOpen ? 'TRUE' : 'FALSE';
$stmt = $pdo->prepare('
    UPDATE "lm2026-27".games
       SET home_team_id = ?, away_team_id = ?, start_time = ?, venue = ?,
           flashscore_url = ?, tips_open = ' . $tipsOpenSql . ', updated_at = NOW()
     WHERE game_id = ?
    RETURNING game_id, home_team_id, away_team_id, start_time, venue, flashscore_url, tips_open');
$stmt->execute([$homeId, $awayId, date('Y-m-d H:i:s', strtotime($start)), $venue,
                $flash ?: null, $gameId]);
$row = $stmt->fetch();
if (!$row) json_error('Zápas neexistuje', 404);
json_ok($row);
