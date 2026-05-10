<?php
// GET /v1/games         - zoznam zápasov
// GET /v1/games?id=X   - detail zápasu
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if ($id) {
        $stmt = $pdo->prepare("
            SELECT g.*, t.tip1, t.tip2, t.points
            FROM iihf2026.games g
            LEFT JOIN iihf2026.tips t ON t.game_id = g.id AND t.user_id = :uid
            WHERE g.id = :id
        ");
        $stmt->execute([':uid' => $auth['user_id'], ':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) json_error('Zápas neexistuje', 404);
        json_ok($row);
    }

    try {
        $stmt = $pdo->prepare("
            SELECT g.id, g.game_number, g.phase, g.team1, g.team2,
                   g.starts_at, g.venue, g.score1, g.score2, g.final1, g.final2, g.status,
                   g.flashscore_url,
                   t.tip1, t.tip2, t.points
            FROM iihf2026.games g
            LEFT JOIN iihf2026.tips t ON t.game_id = g.id AND t.user_id = :uid
            ORDER BY g.starts_at, g.game_number
        ");
        $stmt->execute([':uid' => $auth['user_id']]);
        $rows = $stmt->fetchAll();
    } catch (PDOException $e) {
        // Fallback bez flashscore_url (run_014 nespustený)
        $stmt = $pdo->prepare("
            SELECT g.id, g.game_number, g.phase, g.team1, g.team2,
                   g.starts_at, g.venue, g.score1, g.score2, g.final1, g.final2, g.status,
                   t.tip1, t.tip2, t.points
            FROM iihf2026.games g
            LEFT JOIN iihf2026.tips t ON t.game_id = g.id AND t.user_id = :uid
            ORDER BY g.starts_at, g.game_number
        ");
        $stmt->execute([':uid' => $auth['user_id']]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) { $r['flashscore_url'] = null; }
        unset($r);
    }
    json_ok($rows);
}

json_error('Method not allowed', 405);
