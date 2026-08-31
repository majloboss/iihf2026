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

// O vstup do skrytej skupiny moze poziadat iba ten, kto je v zozname vidiacich
// alebo v nej uz figuruje — inak by stacilo uhadnut id a viditelnost by nic
// neriesila. Ziadost sa tym neschvaluje, len povoluje: podmienku vstupu musi
// splnit rovnako ako ktokolvek iny.
if ($grp['visibility'] === 'invite' && (int)$grp['created_by'] !== (int)$auth['user_id']) {
    $vidi = $pdo->prepare('SELECT 1 FROM admin.group_viewers WHERE group_id = ? AND user_id = ?
                            UNION ALL
                           SELECT 1 FROM admin.group_members WHERE group_id = ? AND user_id = ?');
    $vidi->execute([$grp['id'], $auth['user_id'], $grp['id'], $auth['user_id']]);
    if (!$vidi->fetch()) json_error('Táto skupina nie je pre teba prístupná', 403);
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
