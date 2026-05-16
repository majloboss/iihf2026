<?php
// Public — no auth needed; returns VAPID public key for browser subscription
$f = __DIR__ . '/../config/vapid.php';
if (!file_exists($f)) json_error('VAPID not configured', 503);
$v = require $f;
json_ok(['public_key' => $v['public_key']]);
