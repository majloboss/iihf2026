<?php
require_auth('admin');
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$checks = [];

// OpenSSL + EC key generation (needed for VAPID)
if (extension_loaded('openssl')) {
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    $checks['openssl_ec'] = $key ? 'ok' : 'fail';
} else {
    $checks['openssl_ec'] = 'missing';
}

// curl (needed to send Web Push HTTP requests)
$checks['curl'] = extension_loaded('curl') ? 'ok' : 'missing';

// mbstring (needed for base64url encoding)
$checks['mbstring'] = extension_loaded('mbstring') ? 'ok' : 'missing';

// VAPID config file
$vapid_file = __DIR__ . '/../../config/vapid.php';
if (file_exists($vapid_file)) {
    $vapid = require $vapid_file;
    $checks['vapid_config']      = 'ok';
    $checks['vapid_public_key']  = !empty($vapid['public_key'])  ? 'ok' : 'empty';
    $checks['vapid_private_key'] = !empty($vapid['private_key']) ? 'ok' : 'empty';
} else {
    $checks['vapid_config']      = 'missing';
    $checks['vapid_public_key']  = 'missing';
    $checks['vapid_private_key'] = 'missing';
}

// How many users have a Web Push subscription saved
$sub_count = (int)$pdo->query(
    "SELECT COUNT(*) FROM admin.users WHERE web_push_sub IS NOT NULL AND web_push_sub <> ''"
)->fetchColumn();
$checks['subscribed_users'] = $sub_count;

// PHP version
$checks['php_version'] = PHP_VERSION;

json_ok($checks);
