<?php
// POST /v1/auth/password-reset  body: { token, password }
// Nastaví nové heslo ak je token platný a nevypršaný.
if ($method !== 'POST') json_error('Method not allowed', 405);

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$token    = trim($body['token'] ?? '');
$password = $body['password'] ?? '';

if (!$token)               json_error('Chýba token', 400);
if (strlen($password) < 6) json_error('Heslo musí mať aspoň 6 znakov', 400);

$pdo = db();

$stmt = $pdo->prepare("
    SELECT t.id, t.user_id
    FROM admin.password_reset_tokens t
    WHERE t.token = ? AND t.used_at IS NULL AND t.expires_at > NOW()
");
$stmt->execute([$token]);
$row = $stmt->fetch();

if (!$row) json_error('Reset link je neplatný alebo vypršal', 400);

$hash = password_hash($password, PASSWORD_BCRYPT);

// Nastav nové heslo + inkrementuj token_version (zneplatní všetky staré JWT)
$pdo->prepare("UPDATE admin.users SET password = ?, token_version = token_version + 1 WHERE id = ?")
    ->execute([$hash, $row['user_id']]);

// Označ token ako použitý
$pdo->prepare("UPDATE admin.password_reset_tokens SET used_at = NOW() WHERE id = ?")
    ->execute([$row['id']]);

json_ok(['reset' => true]);
