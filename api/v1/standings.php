<?php
// GET /v1/standings?competition_id=X  — tabuľky skupín pre aktuálneho používateľa
$auth = require_auth();
$pdo  = db();

$cid = isset($_GET['competition_id']) ? (int)$_GET['competition_id'] : null;

// Zisti slug súťaže
$slug = 'iihf2026';
if ($cid) {
    $cs = $pdo->prepare("SELECT slug FROM admin.competitions WHERE id = ?");
    $cs->execute([$cid]);
    $slug = $cs->fetchColumn() ?: 'iihf2026';
}

// Dynamický join + stĺpec podľa súťaže
if ($slug === 'fifa2026') {
    $tipsJoin  = "LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.points_earned IS NOT NULL";
    $ptsCol    = "t.points_earned";
    $maxPts    = 3;
} else {
    $tipsJoin  = "LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.points IS NOT NULL";
    $ptsCol    = "t.points";
    $maxPts    = 7;
}

$compFilter = $cid ? "AND fg.competition_id = :cid" : "";

$params = [':uid' => $auth['user_id']];
if ($cid) $params[':cid'] = $cid;

$sql = "
    SELECT fg.id AS group_id, fg.name AS group_name,
           u.id AS user_id, u.username, u.avatar,
           COALESCE(SUM($ptsCol), 0)                              AS total_points,
           COUNT($ptsCol)                                          AS scored_tips,
           COUNT(CASE WHEN $ptsCol = 7  THEN 1 END)               AS pts7,
           COUNT(CASE WHEN $ptsCol = 6  THEN 1 END)               AS pts6,
           COUNT(CASE WHEN $ptsCol = 5  THEN 1 END)               AS pts5,
           COUNT(CASE WHEN $ptsCol = 4  THEN 1 END)               AS pts4,
           COUNT(CASE WHEN $ptsCol = 3  THEN 1 END)               AS pts3,
           COUNT(CASE WHEN $ptsCol = 2  THEN 1 END)               AS pts2,
           COUNT(CASE WHEN $ptsCol = 1  THEN 1 END)               AS pts1,
           COUNT(CASE WHEN $ptsCol = 0  THEN 1 END)               AS pts0
    FROM admin.friend_groups fg
    JOIN admin.group_members gm ON gm.group_id = fg.id
    JOIN admin.users u ON u.id = gm.user_id
    $tipsJoin
    WHERE gm.status = 'accepted'
      $compFilter
      AND fg.id IN (
          SELECT group_id FROM admin.group_members
          WHERE user_id = :uid AND status = 'accepted'
      )
    GROUP BY fg.id, fg.name, u.id, u.username, u.avatar
    ORDER BY fg.name, total_points DESC, pts7 DESC, pts6 DESC, pts5 DESC,
             pts4 DESC, pts3 DESC, pts2 DESC, pts1 DESC, u.username
";

$rows = $pdo->prepare($sql);
$rows->execute($params);

$groups = [];
foreach ($rows->fetchAll() as $r) {
    $gid = $r['group_id'];
    if (!isset($groups[$gid])) {
        $groups[$gid] = ['id' => $gid, 'name' => $r['group_name'], 'max_pts' => $maxPts, 'members' => []];
    }
    $groups[$gid]['members'][] = [
        'user_id'      => (int)$r['user_id'],
        'username'     => $r['username'],
        'avatar'       => $r['avatar'],
        'total_points' => (int)$r['total_points'],
        'scored_tips'  => (int)$r['scored_tips'],
        'pts7'         => (int)$r['pts7'],
        'pts6'         => (int)$r['pts6'],
        'pts5'         => (int)$r['pts5'],
        'pts4'         => (int)$r['pts4'],
        'pts3'         => (int)$r['pts3'],
        'pts2'         => (int)$r['pts2'],
        'pts1'         => (int)$r['pts1'],
        'pts0'         => (int)$r['pts0'],
    ];
}

json_ok(array_values($groups));
