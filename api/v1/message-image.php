<?php
// POST /v1/message-image  (multipart/form-data, field: image)
// Nahrá obrázok do správy a vráti jeho URL. Použité userom aj adminom.
$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$file = $_FILES['image'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) json_error('Súbor sa nenahral', 400);

$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$mime    = mime_content_type($file['tmp_name']);
if (!in_array($mime, $allowed)) json_error('Povolené sú len obrázky (jpg, png, webp, gif)', 400);
if ($file['size'] > 5 * 1024 * 1024) json_error('Súbor je príliš veľký (max 5 MB)', 400);

$ext      = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'][$mime];
$dir      = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'messages' . DIRECTORY_SEPARATOR;
$filename = 'msg_' . $auth['user_id'] . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;

if (!is_dir($dir)) mkdir($dir, 0775, true);
if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) json_error('Chyba pri ukladaní súboru', 500);

$url = APP_URL . '/uploads/messages/' . $filename;
json_ok(['image_url' => $url]);
