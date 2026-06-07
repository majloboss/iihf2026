<?php
// GET /v1/admin/fifa-game-tips?game_id=X  — všetky tipy na FIFA zápas (admin)
require_admin();
if ($method !== 'GET') json_error('Method not allowed', 405);

$game_id = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
if (!$game_id) json_error('Chýba game_id', 400);

$stmt = db()->prepare("
    SELECT u.id AS user_id, u.username, u.avatar,
           t.home_score_tip AS tip1, t.away_score_tip AS tip2,
           t.points_earned AS points, t.updated_at
    FROM admin.users u
    LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.game_id = ?
    WHERE u.is_active = TRUE AND u.role = 'user'
    ORDER BY t.points_earned DESC NULLS LAST, u.username
");
$stmt->execute([$game_id]);
$rows = $stmt->fetchAll();
foreach ($rows as &$r) {
    $r['tip1']   = $r['tip1']   === null ? null : (int)$r['tip1'];
    $r['tip2']   = $r['tip2']   === null ? null : (int)$r['tip2'];
    $r['points'] = $r['points'] === null ? null : (int)$r['points'];
}
unset($r);
json_ok($rows);
