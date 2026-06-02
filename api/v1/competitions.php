<?php
// GET  /v1/competitions        - zoznam všetkých turnajov
// POST /v1/competitions/active - nastav aktívny turnaj usera
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT c.id, c.slug, c.name, c.sport, c.season, c.is_active,
               c.starts_at, c.ends_at,
               (u.active_competition_id = c.id) AS is_selected
        FROM admin.competitions c
        JOIN admin.users u ON u.id = :uid
        WHERE c.is_active = TRUE
        ORDER BY c.id
    ");
    $stmt->execute([':uid' => $auth['user_id']]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['is_selected'] = (bool)$r['is_selected'];
    }
    json_ok($rows);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $cid  = isset($body['competition_id']) ? (int)$body['competition_id'] : 0;
    if (!$cid) json_error('Chýba competition_id', 400);

    // Overenie že turnaj existuje
    $chk = $pdo->prepare("SELECT id FROM admin.competitions WHERE id = ? AND is_active = TRUE");
    $chk->execute([$cid]);
    if (!$chk->fetch()) json_error('Turnaj neexistuje', 404);

    $pdo->prepare("UPDATE admin.users SET active_competition_id = ? WHERE id = ?")
        ->execute([$cid, $auth['user_id']]);

    json_ok(['active_competition_id' => $cid]);
}

json_error('Method not allowed', 405);
