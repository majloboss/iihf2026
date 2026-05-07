<?php
// POST /v1/admin/user-delete
$auth = require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$id   = (int)($body['id'] ?? 0);
if (!$id) json_error('Chýba id', 400);

if ($id === (int)$auth['user_id']) json_error('Nemôžeš zmazať sám seba', 403);

db()->prepare('DELETE FROM admin.users WHERE id = ?')->execute([$id]);

json_ok(['deleted' => true]);
