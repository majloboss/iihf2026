<?php
// GET /v1/profile       - vlastné údaje
// POST /v1/profile      - aktualizácia vlastného profilu
$auth = require_auth();

if ($method === 'GET') {
    $stmt = db()->prepare(
        'SELECT id, username, first_name, last_name, email, phone, role, avatar, created_at
         FROM admin.users WHERE id = ?'
    );
    $stmt->execute([$auth['user_id']]);
    json_ok($stmt->fetch());
}

if ($method === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true);
    $sets  = [];
    $params = [':id' => $auth['user_id']];

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
}

json_error('Method not allowed', 405);
