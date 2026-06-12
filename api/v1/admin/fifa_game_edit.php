<?php
// POST /v1/admin/fifa-game-edit
// Komplexná úprava zápasu (parita s IIHF GameModal):
//   start_time, venue, home_team_id, away_team_id, flashscore_url,
//   status ('scheduled'|'finished'),
//   home_score_regular, away_score_regular, home_score_final, away_score_final
// Pri status=finished sa nastaví result_approved=TRUE a prepočítajú body.
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id'] ?? 0);
if (!$gid) json_error('Chýba game_id', 400);

$stmt = $pdo->prepare("SELECT game_id, game_type_code FROM fifa2026.games WHERE game_id = ?");
$stmt->execute([$gid]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

$isPlayoff = !str_starts_with($game['game_type_code'], 'GROUP_');

$sets   = [];
$params = [];

if (!empty($body['start_time'])) {
    $sets[] = "start_time = ?";
    $params[] = $body['start_time'];
}
if (array_key_exists('venue', $body)) {
    $sets[] = "venue = ?";
    $params[] = trim($body['venue'] ?? '');
}
if (array_key_exists('flashscore_url', $body)) {
    $sets[] = "flashscore_url = ?";
    $params[] = $body['flashscore_url'] ?: null;
}
if (array_key_exists('home_team_id', $body)) {
    $sets[] = "home_team_id = ?";
    $params[] = ($body['home_team_id'] !== '' && $body['home_team_id'] !== null) ? (int)$body['home_team_id'] : null;
}
if (array_key_exists('away_team_id', $body)) {
    $sets[] = "away_team_id = ?";
    $params[] = ($body['away_team_id'] !== '' && $body['away_team_id'] !== null) ? (int)$body['away_team_id'] : null;
}

$status   = $body['status'] ?? null;
$finished = $status === 'finished';

if ($status !== null) {
    if ($finished) {
        $h90 = $body['home_score_regular'] ?? null;
        $a90 = $body['away_score_regular'] ?? null;
        if (!is_numeric($h90) || !is_numeric($a90)) json_error('Zadaj skóre po 90 min', 400);
        $sets[] = "home_score_regular = ?"; $params[] = (int)$h90;
        $sets[] = "away_score_regular = ?"; $params[] = (int)$a90;

        $hFin = $body['home_score_final'] ?? null;
        $aFin = $body['away_score_final'] ?? null;
        $isDraw90 = (int)$h90 === (int)$a90;
        if ($isPlayoff && $isDraw90) {
            if (!is_numeric($hFin) || !is_numeric($aFin)) {
                json_error('Remíza v play-off — zadaj konečný výsledok (po ET/penaltách)', 400);
            }
            if ((int)$hFin < (int)$h90 || (int)$aFin < (int)$a90) {
                json_error('Konečný výsledok nemôže byť nižší ako po 90 min', 400);
            }
            if ((int)$hFin === (int)$aFin) {
                json_error('Po ET/penaltách musí byť víťaz (nie remíza)', 400);
            }
        } elseif (is_numeric($hFin) && is_numeric($aFin)) {
            json_error('Predĺženie je možné len pri remíze po 90 min', 400);
        }
        $sets[] = "home_score_final = ?"; $params[] = ($isPlayoff && $isDraw90 && is_numeric($hFin)) ? (int)$hFin : null;
        $sets[] = "away_score_final = ?"; $params[] = ($isPlayoff && $isDraw90 && is_numeric($aFin)) ? (int)$aFin : null;

        $sets[] = "result_approved = TRUE";
        $sets[] = "tips_open = FALSE";
    } else {
        // scheduled — zruš výsledok
        $sets[] = "result_approved = FALSE";
    }
}

if (empty($sets)) json_error('Nič na uloženie', 400);

$sets[] = "updated_at = NOW()";
$params[] = $gid;

$pdo->prepare("UPDATE fifa2026.games SET " . implode(', ', $sets) . " WHERE game_id = ?")->execute($params);

// Otvor/zatvor tipovanie podľa stavu: otvorené keď sú oba tímy známe a zápas nie je odohraný
$pdo->prepare("
    UPDATE fifa2026.games
    SET tips_open = (home_team_id IS NOT NULL AND away_team_id IS NOT NULL AND result_approved = FALSE)
    WHERE game_id = ?
")->execute([$gid]);

// Prepočítaj body pri finished
if ($finished) {
    require __DIR__ . '/../../helpers/fifa_recalc_fn.php';
    fifa_recalc_game($pdo, $gid);
}

// Skupinový zápas → prepočítaj tabuľky skupín automaticky pri každej zmene stavu
// výsledku (schválenie aj zrušenie), nech tabuľka vždy sedí so schválenými zápasmi.
if ($status !== null && !$isPlayoff) {
    require __DIR__ . '/../../helpers/fifa_standings_fn.php';
    fifa_recalc_standings($pdo);
}

json_ok(['game_id' => $gid, 'saved' => true]);
