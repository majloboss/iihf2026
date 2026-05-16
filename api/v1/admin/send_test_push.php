<?php
require_once __DIR__ . '/../../helpers/webpush.php';

$auth = require_auth('admin');
$uid  = $auth['user_id'];
$pdo  = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$vapid = wp_load_vapid();
if (!$vapid) json_error('VAPID kľúče nie sú nakonfigurované. Najprv ich vygeneruj.', 503);

$row = $pdo->prepare("SELECT web_push_sub FROM admin.users WHERE id = ?");
$row->execute([$uid]);
$sub_json = $row->fetchColumn();
if (!$sub_json) json_error('Tvoj browser nie je prihlásený na push. Najprv sa prihláš.', 400);

$sub = json_decode($sub_json, true);
if (!$sub) json_error('Uložená subscription je poškodená.', 500);

$payload = json_encode([
    'title' => 'IIHF 2026 — Test Push',
    'body'  => 'Push notifikácie fungujú správne!',
    'url'   => '/',
]);

$result = send_web_push($sub, $payload, $vapid);

if ($result['ok']) {
    json_ok(['sent' => true, 'status' => $result['status']]);
} else {
    json_error('Push zlyhal (HTTP ' . ($result['status'] ?? '?') . '): ' . ($result['error'] ?? ''), 500);
}
