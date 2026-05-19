<?php
// GET /v1/admin/game-tips?game_id=X  — all tips for a game (admin only)
require_admin();
if ($method !== 'GET') json_error('Method not allowed', 405);

$game_id = isset($_GET['game_id']) ? (int)$_GET['game_id'] : 0;
if (!$game_id) json_error('Chýba game_id', 400);

$stmt = db()->prepare("
    SELECT u.id AS user_id, u.username, u.avatar,
           t.tip1, t.tip2, t.points, t.updated_at
    FROM admin.users u
    LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.game_id = ?
    WHERE u.is_active = TRUE AND u.role = 'user'
    ORDER BY t.points DESC NULLS LAST, u.username
");
$stmt->execute([$game_id]);
json_ok($stmt->fetchAll());
