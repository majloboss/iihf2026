<?php
// GET    /v1/admin/messages              - zoznam vlákien + počty neprečítaných
// GET    /v1/admin/messages?user_id=X    - vlákno usera (+ označí user správy ako prečítané)
// GET    /v1/admin/messages?unread=1     - celkový počet neprečítaných user správ (badge)
// POST   /v1/admin/messages              - odpovedz userovi { user_id, body }
// DELETE /v1/admin/messages              - soft-delete admin správy { id }
require_admin();
$pdo = db();

if ($method === 'GET') {
    // Badge pre admina: počet neprečítaných user správ celkovo
    if (($_GET['unread'] ?? '') === '1') {
        $c = $pdo->query("SELECT COUNT(*) FROM admin.messages
                          WHERE sender = 'user' AND read_at IS NULL AND deleted_at IS NULL");
        json_ok(['unread' => (int)$c->fetchColumn()]);
    }

    $target = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;

    if ($target) {
        // Označ user správy v tomto vlákne ako prečítané
        $pdo->prepare("UPDATE admin.messages SET read_at = NOW()
                       WHERE user_id = ? AND sender = 'user' AND read_at IS NULL")
            ->execute([$target]);

        $stmt = $pdo->prepare("SELECT id, sender, body, image_url, read_at, created_at, deleted_at
                               FROM admin.messages
                               WHERE user_id = ?
                               ORDER BY created_at");
        $stmt->execute([$target]);
        json_ok(['messages' => $stmt->fetchAll()]);
    }

    // Zoznam vlákien: posledná správa + počet neprečítaných (user správy)
    $stmt = $pdo->query("
        SELECT u.id AS user_id, u.username, u.avatar,
               (SELECT body FROM admin.messages m2
                WHERE m2.user_id = u.id AND m2.deleted_at IS NULL
                ORDER BY m2.created_at DESC LIMIT 1)            AS last_body,
               (SELECT created_at FROM admin.messages m3
                WHERE m3.user_id = u.id AND m3.deleted_at IS NULL
                ORDER BY m3.created_at DESC LIMIT 1)            AS last_at,
               (SELECT COUNT(*) FROM admin.messages m4
                WHERE m4.user_id = u.id AND m4.sender = 'user'
                  AND m4.read_at IS NULL AND m4.deleted_at IS NULL) AS unread
        FROM admin.users u
        WHERE EXISTS (SELECT 1 FROM admin.messages m WHERE m.user_id = u.id)
        ORDER BY last_at DESC NULLS LAST
    ");
    json_ok(['threads' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $target = (int)($body['user_id'] ?? 0);
    $text   = trim($body['body'] ?? '');
    $image  = trim($body['image_url'] ?? '');
    if (!$target) json_error('Chýba user_id', 400);
    if ($text === '' && $image === '') json_error('Prázdna správa', 400);
    if (mb_strlen($text) > 2000) json_error('Správa je príliš dlhá (max 2000 znakov)', 400);

    $stmt = $pdo->prepare("INSERT INTO admin.messages (user_id, sender, body, image_url)
                           VALUES (?, 'admin', ?, ?) RETURNING id, sender, body, image_url, read_at, created_at, deleted_at");
    $stmt->execute([$target, $text !== '' ? $text : null, $image !== '' ? $image : null]);
    $msg = $stmt->fetch();

    // Notifikácia userovi (push + email)
    try {
        require_once __DIR__ . '/../../helpers/notify_user_message.php';
        notify_user_new_message($pdo, $target, $text);
    } catch (Throwable $e) { /* non-fatal */ }

    json_ok($msg, 201);
}

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($body['id'] ?? 0);
    if (!$id) json_error('Chýba id', 400);
    $pdo->prepare("UPDATE admin.messages SET deleted_at = NOW()
                   WHERE id = ? AND sender = 'admin' AND deleted_at IS NULL")
        ->execute([$id]);
    json_ok(['deleted' => true]);
}

json_error('Method not allowed', 405);
