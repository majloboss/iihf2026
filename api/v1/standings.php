<?php
// GET /v1/standings  — tabuľky skupín pre aktuálneho používateľa
$auth = require_auth();
$pdo  = db();

$rows = $pdo->prepare("
    SELECT fg.id AS group_id, fg.name AS group_name,
           u.id AS user_id, u.username, u.avatar,
           COALESCE(SUM(t.points), 0) AS total_points,
           COUNT(t.points) AS scored_tips
    FROM admin.friend_groups fg
    JOIN admin.group_members gm ON gm.group_id = fg.id
    JOIN admin.users u ON u.id = gm.user_id
    LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.points IS NOT NULL
    WHERE gm.status = 'accepted'
      AND fg.id IN (
          SELECT group_id FROM admin.group_members
          WHERE user_id = :uid AND status = 'accepted'
      )
    GROUP BY fg.id, fg.name, u.id, u.username, u.avatar
    ORDER BY fg.name, total_points DESC, u.username
");
$rows->execute([':uid' => $auth['user_id']]);

$groups = [];
foreach ($rows->fetchAll() as $r) {
    $gid = $r['group_id'];
    if (!isset($groups[$gid])) {
        $groups[$gid] = ['id' => $gid, 'name' => $r['group_name'], 'members' => []];
    }
    $groups[$gid]['members'][] = [
        'user_id'     => (int)$r['user_id'],
        'username'    => $r['username'],
        'avatar'      => $r['avatar'],
        'total_points'=> (int)$r['total_points'],
        'scored_tips' => (int)$r['scored_tips'],
    ];
}

json_ok(array_values($groups));
