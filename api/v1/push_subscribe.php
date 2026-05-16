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
    $pdo->prepare("
        INSERT INTO admin.user_push_subscriptions (user_id, endpoint, subscription)
        VALUES (?, ?, ?::jsonb)
        ON CONFLICT (endpoint) DO UPDATE SET
            user_id      = EXCLUDED.user_id,
            subscription = EXCLUDED.subscription
    ")->execute([$uid, $sub['endpoint'], json_encode($sub)]);
    json_ok(['saved' => true]);
}

if ($method === 'DELETE') {
    $body     = json_decode(file_get_contents('php://input'), true);
    $endpoint = $body['endpoint'] ?? null;
    if ($endpoint) {
        $pdo->prepare("DELETE FROM admin.user_push_subscriptions WHERE user_id = ? AND endpoint = ?")
            ->execute([$uid, $endpoint]);
    } else {
        $pdo->prepare("DELETE FROM admin.user_push_subscriptions WHERE user_id = ?")
            ->execute([$uid]);
    }
    json_ok(['removed' => true]);
}

json_error('Method not allowed', 405);
