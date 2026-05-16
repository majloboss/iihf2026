<?php
$auth = require_auth();
$uid  = $auth['user_id'];
$pdo  = db();

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $sub  = $body['subscription'] ?? null;
    if (!$sub || !isset($sub['endpoint'], $sub['keys']['p256dh'], $sub['keys']['auth'])) {
        json_error('Neplatná subscription', 400);
    }
    $pdo->prepare("UPDATE admin.users SET web_push_sub = ? WHERE id = ?")
        ->execute([json_encode($sub), $uid]);
    json_ok(['saved' => true]);
}

if ($method === 'DELETE') {
    $pdo->prepare("UPDATE admin.users SET web_push_sub = NULL WHERE id = ?")
        ->execute([$uid]);
    json_ok(['removed' => true]);
}

json_error('Method not allowed', 405);
