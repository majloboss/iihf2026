<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/db.php';

$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Odstran prefix ak je na serveri (napr. /api)
$path = preg_replace('#^api/?#', '', $path);

try {
    match (true) {
        $path === 'v1/auth/login'          => require __DIR__ . '/v1/auth/login.php',
        $path === 'v1/admin/users'          => require __DIR__ . '/v1/admin/users.php',
        $path === 'v1/admin/user-update'   => require __DIR__ . '/v1/admin/user_update.php',
        $path === 'v1/admin/user-edit'     => require __DIR__ . '/v1/admin/user_edit.php',
        $path === 'v1/admin/user-password' => require __DIR__ . '/v1/admin/user_password.php',
        $path === 'v1/admin/user-delete'   => require __DIR__ . '/v1/admin/user_delete.php',
        $path === 'v1/admin/invites'       => require __DIR__ . '/v1/admin/invites.php',
        $path === 'v1/admin/invite-use'    => require __DIR__ . '/v1/auth/invite_use.php',
        $path === 'v1/auth/complete'       => require __DIR__ . '/v1/auth/complete.php',
        $path === 'v1/profile'             => require __DIR__ . '/v1/profile.php',
        $path === 'v1/profile-password'    => require __DIR__ . '/v1/profile-password.php',
        $path === 'v1/profile-delete'      => require __DIR__ . '/v1/profile-delete.php',
        $path === 'v1/profile-avatar'      => require __DIR__ . '/v1/profile-avatar.php',
        $path === 'v1/groups'              => require __DIR__ . '/v1/groups.php',
        $path === 'v1/group-join'          => require __DIR__ . '/v1/group-join.php',
        $path === 'v1/group-leave'         => require __DIR__ . '/v1/group-leave.php',
        $path === 'v1/group-members'       => require __DIR__ . '/v1/group-members.php',
        $path === 'v1/users'               => require __DIR__ . '/v1/users.php',
        $path === 'v1/admin/game-update'     => require __DIR__ . '/v1/admin/game_update.php',
        $path === 'v1/admin/game-tips'       => require __DIR__ . '/v1/admin/game_tips.php',
        $path === 'v1/admin/recalc-points'   => require __DIR__ . '/v1/admin/recalc_points.php',
        $path === 'v1/game-tips'           => require __DIR__ . '/v1/game_tips.php',
        $path === 'v1/games'               => require __DIR__ . '/v1/games.php',
        $path === 'v1/tips'                => require __DIR__ . '/v1/tips.php',
        $path === 'v1/standings'           => require __DIR__ . '/v1/standings.php',
        $path === 'v1/admin/standings'     => require __DIR__ . '/v1/admin/standings.php',
        default                            => json_error('Not found', 404)
    };
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
