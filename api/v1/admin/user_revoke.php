<?php
// POST /v1/admin/user-revoke
// Inkrementuje token_version pre usera → všetky jeho aktívne tokeny okamžite prestanú platiť.
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$id   = (int)($body['id'] ?? 0);
if (!$id) json_error('Chýba id', 400);

$stmt = db()->prepare('UPDATE admin.users SET token_version = token_version + 1 WHERE id = ? RETURNING token_version');
$stmt->execute([$id]);
$row = $stmt->fetch();
if (!$row) json_error('User neexistuje', 404);

json_ok(['revoked' => true, 'token_version' => (int)$row['token_version']]);
