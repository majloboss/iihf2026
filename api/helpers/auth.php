<?php
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_create($payload) {
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function jwt_verify($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$header, $payload, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;
    $data = json_decode(base64url_decode($payload), true);
    if (!$data || $data['exp'] < time()) return null;
    return $data;
}

function require_auth() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token  = str_starts_with($header, 'Bearer ') ? substr($header, 7) : null;
    if (!$token) json_error('Unauthorized', 401);
    $payload = jwt_verify($token);
    if (!$payload) json_error('Unauthorized', 401);
    return $payload;
}

function require_admin() {
    $payload = require_auth();
    if ($payload['role'] !== 'admin') json_error('Forbidden', 403);
    return $payload;
}
