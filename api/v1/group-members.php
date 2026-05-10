<?php
// GET  /v1/group-members?group_id=X
// POST /v1/group-members  { group_id, action: 'invite', username }        - akceptovany clen
// POST /v1/group-members  { group_id, action: 'accept_invite' }           - pozvaný hráč prijme
// POST /v1/group-members  { group_id, action: 'approve'|'reject', user_id } - zakladateľ
$auth = require_auth();
$pdo  = db();

$group_id = (int)(($_GET['group_id'] ?? 0) ?: (json_decode(file_get_contents('php://input'), true)['group_id'] ?? 0));
if (!$group_id) json_error('Chýba group_id', 400);

$stmt = $pdo->prepare('SELECT created_by FROM admin.friend_groups WHERE id = ?');
$stmt->execute([$group_id]);
$group = $stmt->fetch();
if (!$group) json_error('Skupina neexistuje', 404);

if ($method === 'GET') {
    $stmt = $pdo->prepare("
        SELECT gm.user_id, gm.status, gm.joined_at, u.username, u.first_name, u.last_name, u.avatar
        FROM admin.group_members gm
        JOIN admin.users u ON u.id = gm.user_id
        WHERE gm.group_id = ?
        ORDER BY CASE gm.status WHEN 'accepted' THEN 0 WHEN 'pending' THEN 1 WHEN 'invited' THEN 2 ELSE 3 END, u.username
    ");
    $stmt->execute([$group_id]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true);
    $action = $body['action'] ?? '';

    if ($action === 'invite') {
        $chk = $pdo->prepare("SELECT 1 FROM admin.group_members WHERE group_id = ? AND user_id = ? AND status = 'accepted'");
        $chk->execute([$group_id, $auth['user_id']]);
        if (!$chk->fetch()) json_error('Nie si členom skupiny', 403);

        $username = trim($body['username'] ?? '');
        if (!$username) json_error('Chýba meno používateľa', 400);

        $u = $pdo->prepare("SELECT id FROM admin.users WHERE username = ? AND active = TRUE");
        $u->execute([$username]);
        $invitee = $u->fetch();
        if (!$invitee) json_error('Používateľ nenájdený', 404);
        $inv_id = (int)$invitee['id'];

        $ex = $pdo->prepare("SELECT status FROM admin.group_members WHERE group_id = ? AND user_id = ?");
        $ex->execute([$group_id, $inv_id]);
        $existing = $ex->fetch();
        if ($existing) {
            if ($existing['status'] === 'accepted') json_error('Používateľ už je členom skupiny', 409);
            if ($existing['status'] === 'invited')  json_error('Pozvánka už bola odoslaná', 409);
            if ($existing['status'] === 'pending') {
                $pdo->prepare("UPDATE admin.group_members SET status='accepted', joined_at=NOW() WHERE group_id=? AND user_id=?")->execute([$group_id, $inv_id]);
                json_ok(['done' => true]);
            }
        }
        $pdo->prepare("INSERT INTO admin.group_members (group_id, user_id, status) VALUES (?, ?, 'invited')")->execute([$group_id, $inv_id]);
        json_ok(['done' => true]);
    }

    if ($action === 'accept_invite') {
        $chk = $pdo->prepare("SELECT 1 FROM admin.group_members WHERE group_id = ? AND user_id = ? AND status = 'invited'");
        $chk->execute([$group_id, $auth['user_id']]);
        if (!$chk->fetch()) json_error('Nenájdená pozvánka', 404);
        $pdo->prepare("UPDATE admin.group_members SET status='accepted', joined_at=NOW() WHERE group_id=? AND user_id=?")->execute([$group_id, $auth['user_id']]);
        json_ok(['done' => true]);
    }

    if ((int)$group['created_by'] !== (int)$auth['user_id']) json_error('Len zakladateľ môže spravovať členov', 403);

    $user_id = (int)($body['user_id'] ?? 0);
    if (!$user_id || !in_array($action, ['approve', 'reject'])) json_error('Neplatné parametre', 400);

    if ($action === 'approve') {
        $pdo->prepare("UPDATE admin.group_members SET status='accepted', joined_at=NOW() WHERE group_id=? AND user_id=?")->execute([$group_id, $user_id]);
    } else {
        $pdo->prepare('DELETE FROM admin.group_members WHERE group_id=? AND user_id=?')->execute([$group_id, $user_id]);
    }
    json_ok(['done' => true]);
}

json_error('Method not allowed', 405);
