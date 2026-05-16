<?php
// Temporary server probe — DELETE after use
header('Content-Type: text/plain; charset=utf-8');

echo "=== PHP ===\n";
echo "Version: " . PHP_VERSION . "\n";
echo "SAPI: " . php_sapi_name() . "\n\n";

echo "=== Extensions ===\n";
$needed = ['openssl', 'curl', 'mbstring', 'json', 'pdo', 'pdo_pgsql'];
foreach ($needed as $ext) {
    echo "$ext: " . (extension_loaded($ext) ? 'YES' : 'NO') . "\n";
}
echo "\n";

echo "=== OpenSSL EC (VAPID) ===\n";
if (extension_loaded('openssl')) {
    $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    echo "EC key gen (prime256v1): " . ($key ? 'YES' : 'NO') . "\n";
    if ($key) {
        $details = openssl_pkey_get_details($key);
        echo "EC key bits: " . ($details['bits'] ?? 'n/a') . "\n";
    }
} else {
    echo "openssl not loaded\n";
}
echo "\n";

echo "=== Shell ===\n";
$shell_funcs = ['exec', 'shell_exec', 'system', 'passthru', 'proc_open'];
foreach ($shell_funcs as $fn) {
    $disabled = in_array($fn, array_map('trim', explode(',', ini_get('disable_functions'))));
    echo "$fn: " . ($disabled ? 'DISABLED' : 'available') . "\n";
}
echo "\n";

echo "=== Composer ===\n";
if (function_exists('shell_exec') && !in_array('shell_exec', array_map('trim', explode(',', ini_get('disable_functions'))))) {
    $composer = shell_exec('which composer 2>/dev/null');
    echo "composer in PATH: " . (trim($composer ?: '') ?: 'NOT FOUND') . "\n";
    $composer2 = shell_exec('composer --version 2>/dev/null');
    echo "composer --version: " . (trim($composer2 ?: '') ?: 'N/A') . "\n";
} else {
    echo "shell_exec not available — cannot check\n";
}
echo "\n";

echo "=== Done ===\n";
