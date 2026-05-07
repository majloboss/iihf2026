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

foreach (['score1', 'score2'] as $f) {
    if (array_key_exists($f, $body)) {
        $sets[] = "$f = :$f";
        $params[":$f"] = $body[$f] !== null && $body[$f] !== '' ? (int)$body[$f] : null;
    }
}

if (empty($sets)) json_error('Nič na uloženie', 400);

$pdo = db();
$pdo->prepare('UPDATE iihf2026.games SET ' . implode(', ', $sets) . ' WHERE id = :id')
    ->execute($params);

// Prepočítaj body ak admin uzavrel zápas s výsledkom
$finishing = isset($body['status']) && $body['status'] === 'finished'
          && array_key_exists('score1', $body) && $body['score1'] !== null && $body['score1'] !== ''
          && array_key_exists('score2', $body) && $body['score2'] !== null && $body['score2'] !== '';

if ($finishing) {
    $stmt = $pdo->prepare("SELECT phase, score1, score2 FROM iihf2026.games WHERE id = ?");
    $stmt->execute([$game_id]);
    $game = $stmt->fetch();

    if ($game && $game['score1'] !== null && $game['score2'] !== null) {
        $s1 = (int)$game['score1'];
        $s2 = (int)$game['score2'];
        $is_playoff = in_array($game['phase'], ['QF', 'SF', 'BRONZE', 'GOLD']);

        $cfg = [];
        $rows = $pdo->query("SELECT key, value FROM iihf2026.scoring_config")->fetchAll();
        foreach ($rows as $r) $cfg[$r['key']] = (int)$r['value'];
        $winner_pts = $is_playoff ? ($cfg['correct_winner_playoff'] ?? 3) : ($cfg['correct_winner_group'] ?? 1);
        $goals_pts  = $cfg['correct_goals_per_team'] ?? 1;

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
            if ($t1 === $s1) $pts += $goals_pts;
            if ($t2 === $s2) $pts += $goals_pts;
            $upd->execute([$pts, $t['id']]);
        }
    }
}

json_ok(['saved' => true]);
