<?php
// POST /v1/admin/user-update
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$id   = (int)($body['id'] ?? 0);
if (!$id) json_error('Chýba id', 400);

$pdo = db();

// Exkluzívny admin (username='admin') je chránený pred zmenou roly a deaktiváciou
$target = $pdo->prepare('SELECT username FROM admin.users WHERE id = ?');
$target->execute([$id]);
if (($target->fetchColumn() === 'admin') && (isset($body['role']) || isset($body['is_active']))) {
    json_error('Exkluzívny admin nemôže byť zmenený', 403);
}

// Len povolené polia
$sets = [];
$params = [':id' => $id];

if (isset($body['role'])) {
    if (!in_array($body['role'], ['user', 'admin'])) json_error('Neplatná rola', 400);
    $sets[] = 'role = :role';
    $params[':role'] = $body['role'];
}
if (isset($body['is_active'])) {
    $sets[] = 'is_active = :is_active';
    $params[':is_active'] = (bool)$body['is_active'];
}

if (empty($sets)) json_error('Nič na aktualizáciu', 400);

$pdo->prepare('UPDATE admin.users SET ' . implode(', ', $sets) . ' WHERE id = :id')
    ->execute($params);

json_ok(['updated' => true]);
