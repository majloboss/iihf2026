<?php
// GET /v1/game-tips?game_id=X
// Returns tips of all accepted group-members for the given game, grouped by group
$auth = require_auth();
$pdo  = db();

if ($method !== 'GET') json_error('Method not allowed', 405);

$game_id = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
if (!$game_id) json_error('Chýba game_id', 400);

// Verify game exists and is live or finished (no peeking at future tips)
$game = $pdo->prepare('SELECT status FROM iihf2026.games WHERE id = ?');
$game->execute([$game_id]);
$g = $game->fetch();
if (!$g) json_error('Zápas neexistuje', 404);
if ($g['status'] === 'scheduled') json_error('Tipy sú dostupné až po začatí zápasu', 403);

$stmt = $pdo->prepare("
    SELECT
        fg.id   AS group_id,
        fg.name AS group_name,
        u.id    AS user_id,
        u.username,
        t.tip1,
        t.tip2,
        t.points
    FROM admin.group_members gm_me
    JOIN admin.friend_groups fg      ON fg.id = gm_me.group_id
    JOIN admin.group_members gm_them ON gm_them.group_id = fg.id
                                     AND gm_them.status = 'accepted'
    JOIN admin.users u               ON u.id = gm_them.user_id
    LEFT JOIN iihf2026.tips t        ON t.user_id = u.id AND t.game_id = :game_id
    WHERE gm_me.user_id = :uid
      AND gm_me.status  = 'accepted'
    ORDER BY fg.name, u.username
");
$stmt->execute([':uid' => $auth['user_id'], ':game_id' => $game_id]);
$rows = $stmt->fetchAll();

// Group by group_id, deduplicate users within each group
$groups = [];
$seen   = []; // [group_id][user_id]
foreach ($rows as $r) {
    $gid = $r['group_id'];
    $uid = $r['user_id'];
    if (isset($seen[$gid][$uid])) continue;
    $seen[$gid][$uid] = true;
    if (!isset($groups[$gid])) {
        $groups[$gid] = ['group_id' => $gid, 'group_name' => $r['group_name'], 'members' => []];
    }
    $groups[$gid]['members'][] = [
        'user_id'  => $uid,
        'username' => $r['username'],
        'tip1'     => $r['tip1'],
        'tip2'     => $r['tip2'],
        'points'   => $r['points'],
        'is_me'    => $uid === $auth['user_id'],
    ];
}

json_ok(array_values($groups));
