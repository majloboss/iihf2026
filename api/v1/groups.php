<?php
// GET  /v1/groups  - zoznam skupin s mojim statusom
// POST /v1/groups  - vytvor skupinu
// DELETE /v1/groups - zrus skupinu (len zakladatel)
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    // all_competitions=1 vráti skupiny vo všetkých súťažiach (pre bulk invite výber zdroja)
    $allComp = ($_GET['all_competitions'] ?? '') === '1';
    $cid     = $allComp ? null : (isset($_GET['competition_id']) ? (int)$_GET['competition_id'] : null);

    // Skrytú skupinu vidí zakladateľ, kto v nej už figuruje (prijatý, pozvaný
    // aj čakajúci) a kto je vymenovaný v zozname. Vymenovanie nie je členstvo —
    // vstup si taký človek musí vypýtať žiadosťou ako ktokoľvek iný.
    $viditelnost = '(fg.visibility = \'public\'
                     OR fg.created_by = :uid
                     OR EXISTS (SELECT 1 FROM admin.group_members gmv
                                 WHERE gmv.group_id = fg.id AND gmv.user_id = :uid)
                     OR EXISTS (SELECT 1 FROM admin.group_viewers gvv
                                 WHERE gvv.group_id = fg.id AND gvv.user_id = :uid))';
    $where = ($cid ? 'WHERE fg.competition_id = :cid AND ' : 'WHERE ') . $viditelnost;
    $params = [':uid' => $auth['user_id']];
    if ($cid) $params[':cid'] = $cid;

    $stmt = $pdo->prepare("
        SELECT fg.id, fg.name, fg.description, fg.created_by, fg.created_at, fg.competition_id,
               fg.allow_member_invite, fg.is_closed, fg.visibility,
               u.username AS creator_username,
               c.name AS competition_name, c.slug AS competition_slug,
               COUNT(gm.user_id) FILTER (WHERE gm.status = 'accepted') AS member_count,
               COUNT(gm.user_id) FILTER (WHERE gm.status = 'invited') AS invited_count,
               COUNT(gm.user_id) FILTER (WHERE gm.status = 'pending') AS pending_count,
               (SELECT gm2.status FROM admin.group_members gm2
                WHERE gm2.group_id = fg.id AND gm2.user_id = :uid) AS my_status
        FROM admin.friend_groups fg
        JOIN admin.users u ON u.id = fg.created_by
        LEFT JOIN admin.group_members gm ON gm.group_id = fg.id
        LEFT JOIN admin.competitions c ON c.id = fg.competition_id
        $where
        GROUP BY fg.id, u.username, c.name, c.slug
        ORDER BY fg.name
    ");
    $stmt->execute($params);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim($body['name'] ?? '');
    if (strlen($name) < 3) json_error('Názov musí mať aspoň 3 znaky', 400);
    $description = isset($body['description']) ? trim($body['description']) : null;
    if ($description === '') $description = null;
    $visibility = ($body['visibility'] ?? 'public') === 'invite' ? 'invite' : 'public';

    $competition_id = (int)($body['competition_id'] ?? 0);
    if (!$competition_id) json_error('Chýba competition_id', 400);

    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare(
            'INSERT INTO admin.friend_groups (name, description, created_by, competition_id, visibility, created_at)
             VALUES (?, ?, ?, ?, ?, NOW()) RETURNING id'
        );
        $stmt->execute([$name, $description, $auth['user_id'], $competition_id, $visibility]);
        $id = $stmt->fetchColumn();

        // Zakladatel je automaticky clen
        $pdo->prepare(
            "INSERT INTO admin.group_members (group_id, user_id, status, joined_at) VALUES (?, ?, 'accepted', NOW())"
        )->execute([$id, $auth['user_id']]);

        $pdo->commit();
        json_ok(['id' => $id, 'name' => $name, 'competition_id' => $competition_id], 201);
    } catch (PDOException $e) {
        $pdo->rollBack();
        if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
            json_error('Skupina s týmto názvom už existuje', 409);
        }
        throw $e;
    }
}

if ($method === 'PATCH') {
    // Úprava popisu / podmienky vstupu — len zakladateľ
    $body     = json_decode(file_get_contents('php://input'), true);
    $group_id = (int)($body['group_id'] ?? 0);
    if (!$group_id) json_error('Chýba group_id', 400);

    $stmt = $pdo->prepare('SELECT created_by FROM admin.friend_groups WHERE id = ?');
    $stmt->execute([$group_id]);
    $group = $stmt->fetch();
    if (!$group) json_error('Skupina neexistuje', 404);
    if ((int)$group['created_by'] !== (int)$auth['user_id']) json_error('Len zakladateľ môže upraviť skupinu', 403);

    // Popis (ak je v tele)
    if (array_key_exists('description', $body)) {
        $description = trim($body['description'] ?? '');
        if ($description === '') $description = null;
        $pdo->prepare('UPDATE admin.friend_groups SET description = ? WHERE id = ?')->execute([$description, $group_id]);
    }
    // Príznak: člen môže pozvať
    if (array_key_exists('allow_member_invite', $body)) {
        $pdo->prepare('UPDATE admin.friend_groups SET allow_member_invite = ? WHERE id = ?')
            ->execute([$body['allow_member_invite'] ? 'true' : 'false', $group_id]);
    }
    // Príznak: skupina uzavretá
    if (array_key_exists('visibility', $body)) {
        $v = $body['visibility'] === 'invite' ? 'invite' : 'public';
        $pdo->prepare('UPDATE admin.friend_groups SET visibility = ? WHERE id = ?')
            ->execute([$v, $group_id]);
    }
    if (array_key_exists('is_closed', $body)) {
        $pdo->prepare('UPDATE admin.friend_groups SET is_closed = ? WHERE id = ?')
            ->execute([$body['is_closed'] ? 'true' : 'false', $group_id]);
    }

    json_ok(['updated' => true]);
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
