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
        $path === 'v1/admin/users'         => require __DIR__ . '/v1/admin/users.php',
        $path === 'v1/admin/user-update'   => require __DIR__ . '/v1/admin/user_update.php',
        $path === 'v1/admin/invites'       => require __DIR__ . '/v1/admin/invites.php',
        $path === 'v1/admin/invite-use'    => require __DIR__ . '/v1/auth/invite_use.php',
        $path === 'v1/auth/complete'       => require __DIR__ . '/v1/auth/complete.php',
        default                            => json_error('Not found', 404)
    };
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
