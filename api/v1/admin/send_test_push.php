<?php
require_once __DIR__ . '/../../helpers/webpush.php';

$auth = require_auth('admin');
$uid  = $auth['user_id'];
$pdo  = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$vapid = wp_load_vapid();
if (!$vapid) json_error('VAPID kľúče nie sú nakonfigurované. Najprv ich vygeneruj.', 503);

$payload = json_encode([
    'title' => 'IIHF 2026 — Test Push',
    'body'  => 'Push notifikácie fungujú správne!',
    'url'   => '/',
]);

$result = send_push_to_user($pdo, $uid, $payload, $vapid);

if ($result['no_subscriptions'] ?? false) {
    json_error('Žiadny browser nie je prihlásený na push. Najprv sa prihláś.', 400);
}

json_ok(['sent' => $result['sent'], 'failed' => $result['failed']]);
