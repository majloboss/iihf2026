<?php
// GET   /v1/admin/announcements  — zoznam oznamov
// POST  /v1/admin/announcements  — nový oznam
// PATCH /v1/admin/announcements  — vypni oznam (is_active = false)
$auth = require_admin();
$pdo  = db();

if ($method === 'GET') {
    $rows = $pdo->query(
        "SELECT a.id, a.body, a.created_at, a.is_active, u.username AS created_by_username
         FROM admin.announcements a
         LEFT JOIN admin.users u ON u.id = a.created_by
         ORDER BY a.created_at DESC"
    )->fetchAll();
    json_ok($rows);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $text = trim($body['body'] ?? '');
    if ($text === '') json_err('Oznam nesmie byť prázdny', 400);

    $pdo->exec("UPDATE admin.announcements SET is_active = FALSE WHERE is_active = TRUE");

    $stmt = $pdo->prepare(
        "INSERT INTO admin.announcements (body, created_by, is_active) VALUES (?, ?, TRUE) RETURNING id, created_at"
    );
    $stmt->execute([$text, $auth['user_id']]);
    $row = $stmt->fetch();
    json_ok(['id' => $row['id'], 'created_at' => $row['created_at'], 'body' => $text, 'is_active' => true]);
}

if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);
    if (!$id) json_err('Chýba id', 400);
    $pdo->prepare("UPDATE admin.announcements SET is_active = FALSE WHERE id = ?")->execute([$id]);
    json_ok(['ok' => true]);
}

json_err('Method not allowed', 405);
