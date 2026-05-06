<?php
// POST /v1/profile-avatar  (multipart/form-data, field: avatar)
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$file = $_FILES['avatar'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) json_error('Súbor sa nenahral', 400);

$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$mime    = mime_content_type($file['tmp_name']);
if (!in_array($mime, $allowed)) json_error('Povolené sú len obrázky (jpg, png, webp, gif)', 400);
if ($file['size'] > 2 * 1024 * 1024) json_error('Súbor je príliš veľký (max 2 MB)', 400);

$ext     = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime];
$dir     = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'avatars' . DIRECTORY_SEPARATOR;
$filename = 'user_' . $auth['user_id'] . '_' . time() . '.' . $ext;

if (!is_dir($dir)) mkdir($dir, 0775, true);
if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) json_error('Chyba pri ukladaní súboru', 500);

$url = APP_URL . '/uploads/avatars/' . $filename;

// Zmaž starý avatar
$stmt = db()->prepare('SELECT avatar FROM admin.users WHERE id = ?');
$stmt->execute([$auth['user_id']]);
$old = $stmt->fetchColumn();
if ($old) {
    $old_file = $dir . basename($old);
    if (file_exists($old_file)) unlink($old_file);
}

db()->prepare('UPDATE admin.users SET avatar = ? WHERE id = ?')
    ->execute([$url, $auth['user_id']]);

json_ok(['avatar' => $url]);
