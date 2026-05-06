<?php
// POST /v1/admin/user-password
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body     = json_decode(file_get_contents('php://input'), true);
$id       = (int)($body['id'] ?? 0);
$new_pass = $body['new_password'] ?? '';

if (!$id)               json_error('Chýba id', 400);
if (strlen($new_pass) < 6) json_error('Heslo musí mať aspoň 6 znakov', 400);

db()->prepare('UPDATE admin.users SET password = ? WHERE id = ?')
    ->execute([password_hash($new_pass, PASSWORD_DEFAULT), $id]);

json_ok(['changed' => true]);
