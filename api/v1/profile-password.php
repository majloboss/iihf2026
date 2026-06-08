<?php
// POST /v1/profile-password
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body        = json_decode(file_get_contents('php://input'), true);
$old_pass    = $body['old_password'] ?? '';
$new_pass    = $body['new_password'] ?? '';

if (!$old_pass || !$new_pass) json_error('Chýba heslo', 400);
if (strlen($new_pass) < 6)    json_error('Nové heslo musí mať aspoň 6 znakov', 400);

$stmt = db()->prepare('SELECT password, role, username_changed, token_version FROM admin.users WHERE id = ?');
$stmt->execute([$auth['user_id']]);
$user = $stmt->fetch();

if (!password_verify($old_pass, $user['password'])) json_error('Nesprávne aktuálne heslo', 401);

$newVersion = (int)$user['token_version'] + 1;
db()->prepare('UPDATE admin.users SET password = ?, token_version = ? WHERE id = ?')
    ->execute([password_hash($new_pass, PASSWORD_DEFAULT), $newVersion, $auth['user_id']]);

// Vrátime nový token s novou verziou — aktuálna session ostáva prihlásená
$token = jwt_create([
    'user_id'          => $auth['user_id'],
    'role'             => $user['role'],
    'username_changed' => (bool)$user['username_changed'],
    'tv'               => $newVersion,
    'exp'              => time() + 86400 * 7,
]);

json_ok(['changed' => true, 'token' => $token]);
