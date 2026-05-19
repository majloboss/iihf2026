<?php
// HTTP wrapper pre livescore cron — volaj cez wget každých 10 minút
// URL: https://iihf2026.fellow.sk/api/cron/run_livescore.php?token=<CRON_SECRET>
// DEV: https://dev_iihf2026.fellow.sk/api/cron/run_livescore.php?token=<CRON_SECRET>

require_once __DIR__ . '/../config/db.php';

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    exit('Forbidden');
}

ob_start();
require __DIR__ . '/livescore_poll.php';
$out = ob_get_clean();

echo 'OK ' . date('Y-m-d H:i:s');
if ($out) echo "\n" . $out;
