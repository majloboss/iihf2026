<?php
// POST /v1/profile-delete
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$pass = $body['password'] ?? '';
if (!$pass) json_error('Chýba heslo', 400);

$stmt = db()->prepare('SELECT password FROM admin.users WHERE id = ?');
$stmt->execute([$auth['user_id']]);
$user = $stmt->fetch();

if (!password_verify($pass, $user['password'])) json_error('Nesprávne heslo', 401);

db()->prepare('DELETE FROM admin.users WHERE id = ?')->execute([$auth['user_id']]);

json_ok(['deleted' => true]);
