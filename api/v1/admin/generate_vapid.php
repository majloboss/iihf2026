<?php
require_auth('admin');
if ($method !== 'POST') json_error('Method not allowed', 405);

$key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
if (!$key) json_error('openssl_pkey_new failed: ' . openssl_error_string(), 500);

openssl_pkey_export($key, $private_pem);
$d = openssl_pkey_get_details($key);
$pub_raw = "\x04"
    . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT)
    . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);
$pub_b64 = rtrim(strtr(base64_encode($pub_raw), '+/', '-_'), '=');

$config_content = "<?php\nreturn [\n"
    . "    'subject'         => 'mailto:miloslav.krchniak@gmail.com',\n"
    . "    'public_key'      => " . var_export($pub_b64, true) . ",\n"
    . "    'private_key_pem' => " . var_export($private_pem, true) . ",\n"
    . "];\n";

$path = __DIR__ . '/../../config/vapid.php';
if (file_put_contents($path, $config_content) === false) {
    json_error('Zápis vapid.php zlyhal — skontroluj oprávnenia na ' . $path, 500);
}

json_ok(['public_key' => $pub_b64]);
