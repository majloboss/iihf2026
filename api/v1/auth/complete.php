<?php
// POST /v1/auth/complete — dokoncenie registracie (nastavenie username + hesla)
if ($method !== 'POST') json_error('Method not allowed', 405);

$payload = require_auth();
if (empty($payload['complete'])) json_error('Forbidden', 403);

$body     = json_decode(file_get_contents('php://input'), true);
$username = trim($body['username'] ?? '');
$password = $body['password'] ?? '';

if (strlen($username) < 3) json_error('Username musí mať aspoň 3 znaky');
if (strlen($password) < 6) json_error('Heslo musí mať aspoň 6 znakov');

$pdo = db();

// Skontroluj ze username nie je obsadeny
$chk = $pdo->prepare('SELECT id FROM admin.users WHERE username = ? AND id != ?');
$chk->execute([$username, $payload['user_id']]);
if ($chk->fetch()) json_error('Username je už obsadený');

$hash = password_hash($password, PASSWORD_BCRYPT);
$pdo->prepare(
    'UPDATE admin.users SET username = ?, password = ?, is_active = TRUE, username_changed = TRUE WHERE id = ?'
)->execute([$username, $hash, $payload['user_id']]);

// Auto-join skupiny z pozvánky (ak bola zadaná)
$inv = $pdo->prepare('SELECT group_id FROM admin.invites WHERE user_id = ? AND group_id IS NOT NULL LIMIT 1');
$inv->execute([$payload['user_id']]);
$invRow = $inv->fetch();
if ($invRow) {
    $gid = (int)$invRow['group_id'];
    // Pridaj len ak ešte nie je členom
    $exists = $pdo->prepare('SELECT 1 FROM admin.group_members WHERE group_id=? AND user_id=?');
    $exists->execute([$gid, $payload['user_id']]);
    if (!$exists->fetch()) {
        $pdo->prepare(
            "INSERT INTO admin.group_members (group_id, user_id, status, joined_at) VALUES (?, ?, 'accepted', NOW())"
        )->execute([$gid, $payload['user_id']]);
    }
}

$token = jwt_create([
    'user_id'          => $payload['user_id'],
    'role'             => 'user',
    'username_changed' => true,
    'exp'              => time() + 86400 * 7
]);

json_ok(['token' => $token, 'role' => 'user']);
