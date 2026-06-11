<?php
// GET    /v1/messages          - moje vlákno s adminom (+ označí admin správy ako prečítané)
// GET    /v1/messages?unread=1 - len počet neprečítaných admin správ (pre badge)
// POST   /v1/messages          - pošli správu adminovi { body }
// DELETE /v1/messages          - soft-delete mojej správy { id }
$auth = require_auth();
$pdo  = db();
$uid  = (int)$auth['user_id'];

if ($method === 'GET') {
    // Badge: len počet neprečítaných admin správ
    if (($_GET['unread'] ?? '') === '1') {
        $c = $pdo->prepare("SELECT COUNT(*) FROM admin.messages
                            WHERE user_id = ? AND sender = 'admin' AND read_at IS NULL AND deleted_at IS NULL");
        $c->execute([$uid]);
        json_ok(['unread' => (int)$c->fetchColumn()]);
    }

    // Označ adminove správy v mojom vlákne ako prečítané
    $pdo->prepare("UPDATE admin.messages SET read_at = NOW()
                   WHERE user_id = ? AND sender = 'admin' AND read_at IS NULL")
        ->execute([$uid]);

    $stmt = $pdo->prepare("SELECT id, sender, body, read_at, created_at, deleted_at
                           FROM admin.messages
                           WHERE user_id = ?
                           ORDER BY created_at");
    $stmt->execute([$uid]);
    json_ok(['messages' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $text = trim($body['body'] ?? '');
    if ($text === '') json_error('Prázdna správa', 400);
    if (mb_strlen($text) > 2000) json_error('Správa je príliš dlhá (max 2000 znakov)', 400);

    $stmt = $pdo->prepare("INSERT INTO admin.messages (user_id, sender, body)
                           VALUES (?, 'user', ?) RETURNING id, sender, body, read_at, created_at, deleted_at");
    $stmt->execute([$uid, $text]);
    $msg = $stmt->fetch();

    // Notifikácia adminom (push + email)
    try {
        require_once __DIR__ . '/../helpers/notify_admins_message.php';
        $me = $pdo->prepare("SELECT username FROM admin.users WHERE id = ?");
        $me->execute([$uid]);
        notify_admins_new_message($pdo, $uid, $me->fetchColumn() ?: 'Hráč', $text);
    } catch (Throwable $e) { /* non-fatal */ }

    json_ok($msg, 201);
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($body['id'] ?? 0);
    if (!$id) json_error('Chýba id', 400);
    // Len vlastná (user) správa v mojom vlákne
    $pdo->prepare("UPDATE admin.messages SET deleted_at = NOW()
                   WHERE id = ? AND user_id = ? AND sender = 'user' AND deleted_at IS NULL")
        ->execute([$id, $uid]);
    json_ok(['deleted' => true]);
}

json_error('Method not allowed', 405);
