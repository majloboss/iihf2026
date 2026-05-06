<?php
// POST /v1/admin/user-edit
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$id   = (int)($body['id'] ?? 0);
if (!$id) json_error('Chýba id', 400);

$sets   = [];
$params = [':id' => $id];

foreach (['first_name', 'last_name', 'phone'] as $f) {
    if (array_key_exists($f, $body)) {
        $sets[] = "$f = :$f";
        $params[":$f"] = $body[$f] ?: null;
    }
}
if (array_key_exists('email', $body)) {
    $email = trim($body['email']);
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Neplatný email', 400);
    $sets[] = 'email = :email';
    $params[':email'] = $email ?: null;
}

if (empty($sets)) json_error('Nič na uloženie', 400);

try {
    db()->prepare('UPDATE admin.users SET ' . implode(', ', $sets) . ' WHERE id = :id')
         ->execute($params);
} catch (PDOException $e) {
    if (str_contains($e->getMessage(), 'unique') || str_contains($e->getMessage(), 'duplicate')) {
        json_error('Email je už použitý', 409);
    }
    throw $e;
}

json_ok(['saved' => true]);
