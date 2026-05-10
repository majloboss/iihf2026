<?php
// POST /v1/admin/game-update
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body    = json_decode(file_get_contents('php://input'), true);
$game_id = (int)($body['game_id'] ?? 0);
if (!$game_id) json_error('Chýba game_id', 400);

$allowed_teams = ['FIN','GER','USA','SUI','GBR','AUT','HUN','LAT',
                  'CAN','SWE','CZE','DEN','SVK','NOR','ITA','SLO'];

$sets   = [];
$params = [':id' => $game_id];

if (array_key_exists('starts_at', $body)) {
    try {
        $dt = new DateTime($body['starts_at']);
    } catch (Exception $e) {
        json_error('Neplatný formát dátumu', 400);
    }
    if (!$dt) json_error('Neplatný formát dátumu', 400);
    $sets[] = 'starts_at = :starts_at';
    $params[':starts_at'] = $dt->format('Y-m-d H:i:sP');
}

foreach (['team1', 'team2'] as $f) {
    if (array_key_exists($f, $body)) {
        $val = $body[$f];
        if ($val !== null && !in_array($val, $allowed_teams, true)) json_error("Neplatný tím: $val", 400);
        $sets[] = "$f = :$f";
        $params[":$f"] = $val ?: null;
    }
}

if (array_key_exists('venue', $body)) {
    $sets[] = 'venue = :venue';
    $params[':venue'] = trim($body['venue']) ?: null;
}

if (array_key_exists('status', $body)) {
    if (!in_array($body['status'], ['scheduled', 'live', 'finished'], true)) json_error('Neplatný status', 400);
    $sets[] = 'status = :status';
    $params[':status'] = $body['status'];
}

foreach (['score1', 'score2', 'final1', 'final2'] as $f) {
    if (array_key_exists($f, $body)) {
        $sets[] = "$f = :$f";
        $params[":$f"] = $body[$f] !== null && $body[$f] !== '' ? (int)$body[$f] : null;
    }
}

$has_fs_url = array_key_exists('flashscore_url', $body);
if ($has_fs_url) {
    $sets[] = 'flashscore_url = :flashscore_url';
    $params[':flashscore_url'] = trim($body['flashscore_url']) ?: null;
}

if (empty($sets)) json_error('Nič na uloženie', 400);

$sets[] = 'updated_at = NOW()';
$pdo = db();
try {
    $pdo->prepare('UPDATE iihf2026.games SET ' . implode(', ', $sets) . ' WHERE id = :id')
        ->execute($params);
} catch (PDOException $e) {
    // Ak zlyhalo kvoli flashscore_url (run_014 nespusteny), skus bez neho
    if ($has_fs_url && str_contains($e->getMessage(), 'flashscore_url')) {
        $sets   = array_filter($sets, fn($s) => !str_contains($s, 'flashscore_url'));
        unset($params[':flashscore_url']);
        $pdo->prepare('UPDATE iihf2026.games SET ' . implode(', ', $sets) . ' WHERE id = :id')
            ->execute($params);
    } else {
        throw $e;
    }
}

// Sync flashscore_url do games_pdf
if ($has_fs_url) {
    try {
        $pdo->prepare("UPDATE iihf2026.games_pdf SET flashscore_url = :url WHERE game_number = (SELECT game_number FROM iihf2026.games WHERE id = :id)")
            ->execute([':url' => $params[':flashscore_url'], ':id' => $game_id]);
    } catch (PDOException $e) { /* games_pdf este neexistuje (run_016 nespusteny) */ }
}

// Po každom uložení skontroluj aktuálny stav v DB a prepočítaj body ak je finished + skóre
$stmt = $pdo->prepare("SELECT phase, status, score1, score2 FROM iihf2026.games WHERE id = ?");
$stmt->execute([$game_id]);
$game = $stmt->fetch();

if ($game && $game['status'] === 'finished' && $game['score1'] !== null && $game['score2'] !== null) {
    $s1 = (int)$game['score1'];
    $s2 = (int)$game['score2'];
    $is_playoff = in_array($game['phase'], ['QF', 'SF', 'BRONZE', 'GOLD']);

    $sc = $pdo->prepare("SELECT pts_winner, pts_goals1, pts_goals2, pts_exact FROM iihf2026.scoring_config WHERE phase = ?");
    $sc->execute([$game['phase']]);
    $cfg = $sc->fetch() ?: ['pts_winner' => ($is_playoff ? 5 : 3), 'pts_goals1' => 1, 'pts_goals2' => 1, 'pts_exact' => 0];
    $winner_pts = (int)$cfg['pts_winner'];
    $goals1_pts = (int)$cfg['pts_goals1'];
    $goals2_pts = (int)$cfg['pts_goals2'];
    $exact_pts  = (int)$cfg['pts_exact'];

    $real_winner = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);

    $tips = $pdo->prepare("SELECT id, tip1, tip2 FROM iihf2026.tips WHERE game_id = ?");
    $tips->execute([$game_id]);
    $upd = $pdo->prepare("UPDATE iihf2026.tips SET points = ? WHERE id = ?");

    foreach ($tips->fetchAll() as $t) {
        $t1 = (int)$t['tip1'];
        $t2 = (int)$t['tip2'];
        $pts = 0;
        $tip_winner = $t1 > $t2 ? 1 : ($t1 < $t2 ? -1 : 0);
        if ($tip_winner === $real_winner) $pts += $winner_pts;
        if ($t1 === $s1) $pts += $goals1_pts;
        if ($t2 === $s2) $pts += $goals2_pts;
        if ($t1 === $s1 && $t2 === $s2) $pts += $exact_pts;
        $upd->execute([$pts, $t['id']]);
    }
}

json_ok(['saved' => true]);
