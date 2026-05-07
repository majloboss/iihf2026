<?php
// GET  /v1/tips           - moje tipy
// POST /v1/tips           - zadaj/uprav tip { game_id, tip1, tip2 }
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT t.*, g.game_number, g.phase, g.team1, g.team2, g.starts_at, g.score1, g.score2, g.status
        FROM iihf2026.tips t
        JOIN iihf2026.games g ON g.id = t.game_id
        WHERE t.user_id = :uid
        ORDER BY g.starts_at, g.game_number
    ");
    $stmt->execute([':uid' => $auth['user_id']]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true);
    $game_id = (int)($body['game_id'] ?? 0);
    $tip1    = $body['tip1'] ?? null;
    $tip2    = $body['tip2'] ?? null;

    if (!$game_id) json_error('Chýba game_id', 400);
    if (!is_numeric($tip1) || !is_numeric($tip2) || $tip1 < 0 || $tip2 < 0) {
        json_error('Tip musí byť nezáporné číslo', 400);
    }
    $tip1 = (int)$tip1;
    $tip2 = (int)$tip2;

    // Skontroluj či zápas existuje a či nie je uzavretý (5 min pred začiatkom)
    $stmt = $pdo->prepare("SELECT id, starts_at, status FROM iihf2026.games WHERE id = ?");
    $stmt->execute([$game_id]);
    $game = $stmt->fetch();
    if (!$game) json_error('Zápas neexistuje', 404);
    if ($game['status'] !== 'scheduled') json_error('Zápas už prebieha alebo skončil', 409);

    $deadline = (new DateTime($game['starts_at']))->modify('-5 minutes');
    if (new DateTime() > $deadline) json_error('Tipovanie uzavreté (menej ako 5 min do začiatku)', 409);

    $stmt = $pdo->prepare("
        INSERT INTO iihf2026.tips (user_id, game_id, tip1, tip2, updated_at)
        VALUES (:uid, :gid, :t1, :t2, NOW())
        ON CONFLICT (user_id, game_id) DO UPDATE
        SET tip1 = EXCLUDED.tip1, tip2 = EXCLUDED.tip2, updated_at = NOW()
        RETURNING id, tip1, tip2
    ");
    $stmt->execute([':uid' => $auth['user_id'], ':gid' => $game_id, ':t1' => $tip1, ':t2' => $tip2]);
    json_ok($stmt->fetch(), 200);
}

json_error('Method not allowed', 405);
