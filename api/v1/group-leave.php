<?php
// POST /v1/group-leave  { group_id }
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body     = json_decode(file_get_contents('php://input'), true);
$group_id = (int)($body['group_id'] ?? 0);
if (!$group_id) json_error('Chýba group_id', 400);

$pdo  = db();
$stmt = $pdo->prepare('SELECT created_by FROM admin.friend_groups WHERE id = ?');
$stmt->execute([$group_id]);
$group = $stmt->fetch();
if (!$group) json_error('Skupina neexistuje', 404);
if ((int)$group['created_by'] === (int)$auth['user_id']) {
    json_error('Zakladateľ nemôže odísť — skupinu môžeš len zrušiť', 400);
}

$pdo->prepare('DELETE FROM admin.group_members WHERE group_id = ? AND user_id = ?')
    ->execute([$group_id, $auth['user_id']]);

json_ok(['left' => true]);
