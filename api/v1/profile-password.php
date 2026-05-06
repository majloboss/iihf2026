<?php
// POST /v1/profile-password
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body        = json_decode(file_get_contents('php://input'), true);
$old_pass    = $body['old_password'] ?? '';
$new_pass    = $body['new_password'] ?? '';

if (!$old_pass || !$new_pass) json_error('Chýba heslo', 400);
if (strlen($new_pass) < 6)    json_error('Nové heslo musí mať aspoň 6 znakov', 400);

$stmt = db()->prepare('SELECT password FROM admin.users WHERE id = ?');
$stmt->execute([$auth['user_id']]);
$user = $stmt->fetch();

if (!password_verify($old_pass, $user['password'])) json_error('Nesprávne aktuálne heslo', 401);

db()->prepare('UPDATE admin.users SET password = ? WHERE id = ?')
    ->execute([password_hash($new_pass, PASSWORD_DEFAULT), $auth['user_id']]);

json_ok(['changed' => true]);
