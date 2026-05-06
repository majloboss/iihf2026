<?php
// POST /v1/admin/invite-use  — user otvoril pozyvaci link
if ($method !== 'POST') json_error('Method not allowed', 405);

$body  = json_decode(file_get_contents('php://input'), true);
$token = trim($body['token'] ?? '');
if (!$token) json_error('Chýba token');

$pdo = db();
$stmt = $pdo->prepare('SELECT id, used_at FROM admin.invites WHERE invite_token = ?');
$stmt->execute([$token]);
$invite = $stmt->fetch();

if (!$invite) json_error('Neplatný pozývací link', 404);
if ($invite['used_at']) json_error('Pozývací link bol už použitý', 409);

// Vytvor placeholder usera
$pdo->beginTransaction();
try {
    $inviteId = $invite['id'];
    $username = 'iihf2026_' . $inviteId;
    $placeholderHash = password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT);

    $ins = $pdo->prepare(
        'INSERT INTO admin.users (username, password, is_active) VALUES (?, ?, FALSE) RETURNING id'
    );
    $ins->execute([$username, $placeholderHash]);
    $userId = $ins->fetchColumn();

    $upd = $pdo->prepare(
        'UPDATE admin.invites SET used_at = NOW(), user_id = ? WHERE id = ?'
    );
    $upd->execute([$userId, $inviteId]);

    $pdo->commit();

    // Vrat docasny token pre dokoncenie registracie
    $tempToken = jwt_create([
        'user_id'  => $userId,
        'role'     => 'user',
        'complete' => true,         // oznacenie: musi dokoncit registraciu
        'exp'      => time() + 3600 // 1 hodina na dokoncenie
    ]);
    json_ok(['temp_token' => $tempToken]);
} catch (Exception $e) {
    $pdo->rollBack();
    json_error('Chyba pri vytváraní účtu', 500);
}
