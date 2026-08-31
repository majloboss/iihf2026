<?php
// GET    /v1/group-viewers?group_id=X — kto vidí skrytú skupinu
// POST   /v1/group-viewers            — pridaj do zoznamu { group_id, user_id }
// DELETE /v1/group-viewers            — odober zo zoznamu { group_id, user_id }
//
// Vymenovanie NIE JE pozvánka: človek sa o skupine dozvie a môže o vstup
// požiadať, ale musí splniť podmienku a zakladateľ ho ešte schvaľuje.
// Preto zoznam žije mimo group_members.
$auth = require_auth();
$pdo  = db();

$body = in_array($method, ['POST', 'DELETE'], true)
    ? (json_decode(file_get_contents('php://input'), true) ?: [])
    : [];

$groupId = (int)($body['group_id'] ?? ($_GET['group_id'] ?? 0));
if (!$groupId) json_error('Chýba group_id', 400);

// So zoznamom smie narábať iba zakladateľ.
$g = $pdo->prepare('SELECT id, created_by, visibility FROM admin.friend_groups WHERE id = ?');
$g->execute([$groupId]);
$group = $g->fetch();
if (!$group) json_error('Skupina neexistuje', 404);
if ((int)$group['created_by'] !== (int)$auth['user_id']) {
    json_error('Zoznam môže spravovať iba zakladateľ skupiny', 403);
}

if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT u.id AS user_id, u.username, u.avatar,
               gv.created_at,
               (SELECT gm.status FROM admin.group_members gm
                 WHERE gm.group_id = gv.group_id AND gm.user_id = u.id) AS member_status
          FROM admin.group_viewers gv
          JOIN admin.users u ON u.id = gv.user_id
         WHERE gv.group_id = ?
         ORDER BY u.username');
    $stmt->execute([$groupId]);
    json_ok($stmt->fetchAll());
}

$userId = (int)($body['user_id'] ?? 0);
if (!$userId) json_error('Chýba user_id', 400);

if ($method === 'POST') {
    $u = $pdo->prepare('SELECT 1 FROM admin.users WHERE id = ? AND is_active');
    $u->execute([$userId]);
    if (!$u->fetch()) json_error('Používateľ neexistuje', 404);

    $pdo->prepare('INSERT INTO admin.group_viewers (group_id, user_id, added_by, created_at)
                   VALUES (?, ?, ?, NOW())
                   ON CONFLICT (group_id, user_id) DO NOTHING')
        ->execute([$groupId, $userId, $auth['user_id']]);
    json_ok(['added' => true]);
}

if ($method === 'DELETE') {
    // Kto uz v skupine je alebo o vstup poziadal, zo zoznamu odobrat nestaci —
    // clenstvo sa rusi zvlast, aby sa omylom nestratila ziadost.
    $pdo->prepare('DELETE FROM admin.group_viewers WHERE group_id = ? AND user_id = ?')
        ->execute([$groupId, $userId]);
    json_ok(['removed' => true]);
}

json_error('Method not allowed', 405);
