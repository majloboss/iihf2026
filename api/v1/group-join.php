<?php
// POST /v1/group-join  { group_id }
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body     = json_decode(file_get_contents('php://input'), true);
$group_id = (int)($body['group_id'] ?? 0);
if (!$group_id) json_error('Chýba group_id', 400);

$pdo  = db();
$stmt = $pdo->prepare('SELECT id FROM admin.friend_groups WHERE id = ?');
$stmt->execute([$group_id]);
if (!$stmt->fetch()) json_error('Skupina neexistuje', 404);

try {
    $pdo->prepare(
        "INSERT INTO admin.group_members (group_id, user_id, status) VALUES (?, ?, 'pending')"
    )->execute([$group_id, $auth['user_id']]);
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
        json_error('Žiadosť už bola odoslaná', 409);
    }
    throw $e;
}

json_ok(['status' => 'pending']);
