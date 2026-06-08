<?php
// POST /v1/admin/impersonate  body: { user_id }
// Admin získa JWT token pre iného usera (prihlásenie bez hesla).
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$auth = require_admin();
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$uid  = (int)($body['user_id'] ?? 0);
if (!$uid) json_error('Chýba user_id', 400);

$stmt = db()->prepare("SELECT id, username, role, is_active, username_changed, token_version FROM admin.users WHERE id = ?");
$stmt->execute([$uid]);
$u = $stmt->fetch();
if (!$u) json_error('Používateľ neexistuje', 404);
if (!$u['is_active']) json_error('Používateľ nie je aktívny', 403);

$token = jwt_create([
    'user_id'          => (int)$u['id'],
    'role'             => $u['role'],
    'username_changed' => (bool)$u['username_changed'],
    'tv'               => (int)$u['token_version'],
    'imp_by'           => (int)$auth['user_id'],   // audit: kto impersonuje
    'exp'              => time() + 86400 * 2,        // 2 dni
]);

// Audit log
try {
    db()->prepare("INSERT INTO admin.login_logs (user_id, username, ip_address, user_agent, env)
                   VALUES (?,?,?,?,?)")
        ->execute([$u['id'], $u['username'] . ' (imp by #' . $auth['user_id'] . ')',
                   $_SERVER['REMOTE_ADDR'] ?? null, $_SERVER['HTTP_USER_AGENT'] ?? null,
                   str_contains($_SERVER['HTTP_HOST'] ?? '', 'dev_') ? 'develop' : 'main']);
} catch (Exception $e) { /* non-fatal */ }

json_ok(['token' => $token, 'username' => $u['username']]);
