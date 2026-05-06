<?php
// GET /v1/users        - zoznam vsetkych aktivnych hracov
// GET /v1/users?id=X   - detail jedneho hraca (avatar, meno, email, telefon)
$auth = require_auth();
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();
$id  = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($id) {
    $stmt = $pdo->prepare("
        SELECT id, username, first_name, last_name, avatar, email, phone
        FROM admin.users
        WHERE id = ? AND is_active = TRUE
    ");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) json_error('Používateľ neexistuje', 404);
    json_ok($user);
}

$stmt = $pdo->query("
    SELECT id, username, first_name, last_name, avatar
    FROM admin.users
    WHERE is_active = TRUE AND role = 'user'
    ORDER BY COALESCE(NULLIF(first_name,''), username), last_name
");
json_ok($stmt->fetchAll());
