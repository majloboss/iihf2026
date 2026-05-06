<?php
// GET  /v1/admin/invites  — zoznam pozyvacich linkov
// POST /v1/admin/invites  — generuj novy link
$auth = require_admin();

$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query(
        'SELECT i.id, i.invite_token, i.created_at, i.used_at,
                u.username AS used_by_username
         FROM admin.invites i
         LEFT JOIN admin.users u ON u.id = i.user_id
         ORDER BY i.created_at DESC'
    )->fetchAll();
    json_ok($rows);
}

if ($method === 'POST') {
    $token = bin2hex(random_bytes(24));  // 48-znakovy token
    $stmt = $pdo->prepare(
        'INSERT INTO admin.invites (invite_token, created_by) VALUES (?, ?) RETURNING id'
    );
    $stmt->execute([$token, $auth['user_id']]);
    $id = $stmt->fetchColumn();

    $link = APP_URL . '/register?token=' . $token;
    json_ok(['id' => $id, 'token' => $token, 'link' => $link], 201);
}

json_error('Method not allowed', 405);
