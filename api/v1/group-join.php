<?php
// POST /v1/group-join  { group_id }
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body     = json_decode(file_get_contents('php://input'), true);
$group_id = (int)($body['group_id'] ?? 0);
if (!$group_id) json_error('Chýba group_id', 400);

$pdo  = db();
$stmt = $pdo->prepare('SELECT id, is_closed, visibility, created_by FROM admin.friend_groups WHERE id = ?');
$stmt->execute([$group_id]);
$grp = $stmt->fetch();
if (!$grp) json_error('Skupina neexistuje', 404);
if ($grp['is_closed']) json_error('Skupina je uzavretá — nedá sa do nej požiadať o vstup', 403);

// Do skrytej skupiny sa neda poziadat o vstup bez pozvanky — inak by stacilo
// uhadnut id a viditelnost by nic neriesila.
if ($grp['visibility'] === 'invite' && (int)$grp['created_by'] !== (int)$auth['user_id']) {
    $poz = $pdo->prepare('SELECT 1 FROM admin.group_members WHERE group_id = ? AND user_id = ?');
    $poz->execute([$grp['id'], $auth['user_id']]);
    if (!$poz->fetch()) json_error('Do tejto skupiny sa dá vstúpiť iba na pozvánku', 403);
}

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
