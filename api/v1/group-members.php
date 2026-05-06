<?php
// GET /v1/group-members?group_id=X  - len zakladatel
// POST /v1/group-members  { group_id, user_id, action: 'approve'|'reject' }
$auth = require_auth();
$pdo  = db();

$group_id = (int)(($_GET['group_id'] ?? 0) ?: (json_decode(file_get_contents('php://input'), true)['group_id'] ?? 0));
if (!$group_id) json_error('Chýba group_id', 400);

$stmt = $pdo->prepare('SELECT created_by FROM admin.friend_groups WHERE id = ?');
$stmt->execute([$group_id]);
$group = $stmt->fetch();
if (!$group) json_error('Skupina neexistuje', 404);
if ((int)$group['created_by'] !== (int)$auth['user_id']) json_error('Len zakladateľ môže spravovať členov', 403);

if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT gm.user_id, gm.status, gm.joined_at, u.username, u.first_name, u.last_name
        FROM admin.group_members gm
        JOIN admin.users u ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY gm.status DESC, u.username
    ");
    $stmt->execute([$group_id]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true);
    $user_id = (int)($body['user_id'] ?? 0);
    $action  = $body['action'] ?? '';
    if (!$user_id || !in_array($action, ['approve', 'reject'])) json_error('Neplatné parametre', 400);

    if ($action === 'approve') {
        $pdo->prepare(
            "UPDATE admin.group_members SET status = 'accepted', joined_at = NOW() WHERE group_id = ? AND user_id = ?"
        )->execute([$group_id, $user_id]);
    } else {
        $pdo->prepare('DELETE FROM admin.group_members WHERE group_id = ? AND user_id = ?')
            ->execute([$group_id, $user_id]);
    }
    json_ok(['done' => true]);
}

json_error('Method not allowed', 405);
