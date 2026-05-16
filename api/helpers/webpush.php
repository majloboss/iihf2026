<?php
// Web Push helpers — VAPID JWT signing + RFC 8291 payload encryption

function wp_b64u_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function wp_b64u_decode(string $data): string {
    $pad = (4 - strlen($data) % 4) % 4;
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', $pad));
}

function wp_hkdf_extract(string $salt, string $ikm): string {
    return hash_hmac('sha256', $ikm, $salt, true);
}

function wp_hkdf_expand(string $prk, string $info, int $len): string {
    $t = ''; $okm = '';
    for ($i = 1; strlen($okm) < $len; $i++) {
        $t = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
        $okm .= $t;
    }
    return substr($okm, 0, $len);
}

function wp_ec_uncompressed(\OpenSSLAsymmetricKey $key): string {
    $d = openssl_pkey_get_details($key);
    return "\x04"
        . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT)
        . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);
}

function wp_p256_pub_from_raw(string $raw65): \OpenSSLAsymmetricKey|false {
    // Wrap 65-byte uncompressed EC point in SubjectPublicKeyInfo DER for P-256
    $prefix = "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"
             . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00";
    $pem = "-----BEGIN PUBLIC KEY-----\n"
         . chunk_split(base64_encode($prefix . $raw65), 64, "\n")
         . "-----END PUBLIC KEY-----\n";
    return openssl_pkey_get_public($pem);
}

function wp_der_to_raw_sig(string $der): string {
    // DER SEQUENCE { INTEGER r, INTEGER s } → raw 64-byte r||s
    $offset = 2;
    if (ord($der[1]) & 0x80) $offset += (ord($der[1]) & 0x7f) + 1;
    $offset++; $r_len = ord($der[$offset++]);
    $r = substr($der, $offset, $r_len); $offset += $r_len;
    $offset++; $s_len = ord($der[$offset++]);
    $s = substr($der, $offset, $s_len);
    return str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT)
         . str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
}

function wp_vapid_jwt(string $endpoint, string $subject, string $private_pem): string {
    $p   = parse_url($endpoint);
    $aud = $p['scheme'] . '://' . $p['host'];
    $hdr = wp_b64u_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $pay = wp_b64u_encode(json_encode(['aud' => $aud, 'exp' => time() + 43200, 'sub' => $subject]));
    $data = "$hdr.$pay";
    openssl_sign($data, $der_sig, $private_pem, OPENSSL_ALGO_SHA256);
    return $data . '.' . wp_b64u_encode(wp_der_to_raw_sig($der_sig));
}

function wp_load_vapid(): array|false {
    $f = __DIR__ . '/../config/vapid.php';
    return file_exists($f) ? require $f : false;
}

function send_web_push(array $sub, string $payload, array $vapid): array {
    $endpoint    = $sub['endpoint'];
    $ua_pub_raw  = wp_b64u_decode($sub['keys']['p256dh']); // 65 bytes
    $auth_secret = wp_b64u_decode($sub['keys']['auth']);   // 16 bytes

    // Ephemeral server key pair (per-message)
    $as_key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    $as_pub = wp_ec_uncompressed($as_key);

    // Client public key
    $ua_key = wp_p256_pub_from_raw($ua_pub_raw);
    if (!$ua_key) return ['ok' => false, 'error' => 'Invalid client public key'];

    // ECDH
    $ecdh = openssl_pkey_derive($ua_key, $as_key, 32);
    if (!$ecdh) return ['ok' => false, 'error' => 'ECDH failed: ' . openssl_error_string()];

    // RFC 8291 key derivation
    $PRK_key  = wp_hkdf_extract($auth_secret, $ecdh);
    $key_info = "WebPush: info\x00" . $ua_pub_raw . $as_pub;
    $ikm      = wp_hkdf_expand($PRK_key, $key_info, 32);

    // RFC 8188 aes128gcm content keys
    $salt    = random_bytes(16);
    $PRK_cnt = wp_hkdf_extract($salt, $ikm);
    $cek     = wp_hkdf_expand($PRK_cnt, "Content-Encoding: aes128gcm\x00", 16);
    $nonce   = wp_hkdf_expand($PRK_cnt, "Content-Encoding: nonce\x00", 12);

    // Encrypt (payload + 0x02 delimiter = last record marker)
    $tag = '';
    $ct  = openssl_encrypt($payload . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    $record = $salt . pack('N', 4096) . chr(65) . $as_pub . $ct . $tag;

    // VAPID
    $jwt    = wp_vapid_jwt($endpoint, $vapid['subject'], $vapid['private_key_pem']);
    $vk     = $vapid['public_key']; // base64url of 65-byte uncompressed point

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $record,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Authorization: vapid t=' . $jwt . ',k=' . $vk,
            'TTL: 86400',
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $body   = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err    = curl_error($ch);
    curl_close($ch);

    if ($status >= 200 && $status < 300) {
        return ['ok' => true, 'status' => $status];
    }
    return ['ok' => false, 'status' => $status, 'error' => $err ?: $body];
}
