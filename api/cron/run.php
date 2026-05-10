<?php
// HTTP wrapper pre cron — volaj cez wget každých 5 minút
// URL: https://iihf2026.fellow.sk/api/cron/run.php?token=<CRON_SECRET>
require_once __DIR__ . '/../config/db.php';

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    exit('Forbidden');
}

ob_start();
require __DIR__ . '/send_notifications.php';
$out = ob_get_clean();

echo 'OK ' . date('Y-m-d H:i:s');
if ($out) echo "\n" . $out;
