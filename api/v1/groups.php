<?php
// GET  /v1/groups  - zoznam skupin s mojim statusom
// POST /v1/groups  - vytvor skupinu
// DELETE /v1/groups - zrus skupinu (len zakladatel)
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT fg.id, fg.name, fg.created_by, fg.created_at,
               u.username AS creator_username,
               COUNT(gm.user_id) FILTER (WHERE gm.status = 'accepted') AS member_count,
               (SELECT gm2.status FROM admin.group_members gm2
                WHERE gm2.group_id = fg.id AND gm2.user_id = :uid) AS my_status
        FROM admin.friend_groups fg
        JOIN admin.users u ON u.id = fg.created_by
        LEFT JOIN admin.group_members gm ON gm.group_id = fg.id
        GROUP BY fg.id, u.username
        ORDER BY fg.name
    ");
    $stmt->execute([':uid' => $auth['user_id']]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? '');
    if (strlen($name) < 3) json_error('Názov musí mať aspoň 3 znaky', 400);

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO admin.friend_groups (name, created_by, created_at) VALUES (?, ?, NOW()) RETURNING id'
        );
        $stmt->execute([$name, $auth['user_id']]);
        $id = $stmt->fetchColumn();

        // Zakladatel je automaticky clen
        $pdo->prepare(
            "INSERT INTO admin.group_members (group_id, user_id, status, joined_at) VALUES (?, ?, 'accepted', NOW())"
        )->execute([$id, $auth['user_id']]);

        $pdo->commit();
        json_ok(['id' => $id, 'name' => $name], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
            json_error('Skupina s týmto názvom už existuje', 409);
        }
        throw $e;
    }
}

if ($method === 'DELETE') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $group_id = (int)($body['group_id'] ?? 0);
    if (!$group_id) json_error('Chýba group_id', 400);

    $stmt = $pdo->prepare('SELECT created_by FROM admin.friend_groups WHERE id = ?');
    $stmt->execute([$group_id]);
    $group = $stmt->fetch();
    if (!$group) json_error('Skupina neexistuje', 404);
    if ((int)$group['created_by'] !== (int)$auth['user_id']) json_error('Len zakladateľ môže zrušiť skupinu', 403);

    $pdo->prepare('DELETE FROM admin.group_members WHERE group_id = ?')->execute([$group_id]);
    $pdo->prepare('DELETE FROM admin.friend_groups WHERE id = ?')->execute([$group_id]);
    json_ok(['deleted' => true]);
}

json_error('Method not allowed', 405);
