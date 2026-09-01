<?php
// GET /v1/ucl/game-tips?game_id=X
// Tipy clenov mojich skupin na dany zapas LM (viditelne az po zaciatku zapasu).
$auth = require_auth();
$pdo  = db();

if ($method !== 'GET') json_error('Method not allowed', 405);

$game_id = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
if (!$game_id) json_error('Chýba game_id', 400);

$g = $pdo->prepare('SELECT start_time, result_approved FROM "lm2026-27".games WHERE game_id = ?');
$g->execute([$game_id]);
$game = $g->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

// Cudzie tipy sa odkryju az po zaciatku zapasu (UTC).
$start = new DateTime($game['start_time'], new DateTimeZone('UTC'));
if (new DateTime('now', new DateTimeZone('UTC')) < $start) {
    json_error('Tipy skupín budú viditeľné po začiatku zápasu.', 403);
}

// Sutaz sa zakladala bez explicitneho id, preto sa zistuje podla slugu.
$cid = $pdo->query("SELECT id FROM admin.competitions WHERE slug = 'ucl2026'")->fetchColumn();
if (!$cid) json_error('Súťaž ucl2026 nie je v číselníku', 500);

$stmt = $pdo->prepare('
    SELECT fg.id AS group_id, fg.name AS group_name,
           u.id AS user_id, u.username, u.avatar,
           t.home_score_tip AS tip1, t.away_score_tip AS tip2, t.points_earned AS points
      FROM admin.group_members gm_me
      JOIN admin.friend_groups fg      ON fg.id = gm_me.group_id AND fg.competition_id = :cid
      JOIN admin.group_members gm_them ON gm_them.group_id = fg.id AND gm_them.status = \'accepted\'
      JOIN admin.users u               ON u.id = gm_them.user_id
      LEFT JOIN "lm2026-27".tips t     ON t.user_id = u.id AND t.game_id = :game_id
     WHERE gm_me.user_id = :uid AND gm_me.status = \'accepted\'
     ORDER BY fg.name, u.username');
$stmt->execute([':uid' => $auth['user_id'], ':game_id' => $game_id, ':cid' => $cid]);

$groups = [];
$seen   = [];
foreach ($stmt->fetchAll() as $r) {
    $gid = $r['group_id']; $uid = $r['user_id'];
    if (isset($seen[$gid][$uid])) continue;
    $seen[$gid][$uid] = true;
    if (!isset($groups[$gid])) {
        $groups[$gid] = ['group_id' => $gid, 'group_name' => $r['group_name'], 'members' => []];
    }
    $groups[$gid]['members'][] = [
        'user_id'  => (int)$uid,
        'username' => $r['username'],
        'avatar'   => $r['avatar'],
        'tip1'     => $r['tip1'] === null ? null : (int)$r['tip1'],
        'tip2'     => $r['tip2'] === null ? null : (int)$r['tip2'],
        'points'   => $r['points'] === null ? null : (int)$r['points'],
        'is_me'    => (int)$uid === (int)$auth['user_id'],
    ];
}

json_ok(array_values($groups));
