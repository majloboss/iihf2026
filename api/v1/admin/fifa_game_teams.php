<?php
// POST /v1/admin/fifa-game-teams
// Nastaví tímy pre play-off zápas (admin ručne zadáva bracket)
// Body: { game_id, home_team_id, away_team_id }
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id']      ?? 0);
$hid  = isset($body['home_team_id']) && $body['home_team_id'] !== '' ? (int)$body['home_team_id'] : null;
$aid  = isset($body['away_team_id']) && $body['away_team_id'] !== '' ? (int)$body['away_team_id'] : null;

if (!$gid) json_error('Chýba game_id', 400);

$stmt = $pdo->prepare("SELECT game_id, game_type_code FROM fifa2026.games WHERE game_id = ?");
$stmt->execute([$gid]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

// Len play-off zápasy (nie skupinové)
if (str_starts_with($game['game_type_code'], 'GROUP_')) {
    json_error('Tímy skupinových zápasov sa nemenia', 400);
}

// Overenie že tímy existujú
foreach ([$hid, $aid] as $tid) {
    if ($tid !== null) {
        $c = $pdo->prepare("SELECT 1 FROM fifa2026.teams WHERE team_id = ?");
        $c->execute([$tid]);
        if (!$c->fetch()) json_error('Tím neexistuje', 404);
    }
}

// Otvor tipovanie keď sú obaja známi
$tipsOpen = ($hid !== null && $aid !== null) ? 'TRUE' : 'FALSE';

$pdo->prepare("
    UPDATE fifa2026.games
    SET home_team_id = ?, away_team_id = ?, tips_open = $tipsOpen, updated_at = NOW()
    WHERE game_id = ?
")->execute([$hid, $aid, $gid]);

json_ok(['game_id' => $gid, 'home_team_id' => $hid, 'away_team_id' => $aid, 'tips_open' => $tipsOpen === 'TRUE']);
