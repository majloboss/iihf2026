<?php
// POST /v1/auth/password-reset-request  body: { username, email }
// Odošle reset link ak username + email sedí k tomu istému účtu.
if ($method !== 'POST') json_error('Method not allowed', 405);
require_once __DIR__ . '/../../helpers/mailer.php';

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$username = trim($body['username'] ?? '');
$email    = trim($body['email'] ?? '');

if (!$username || !$email) json_error('Vyplň username aj email', 400);

$pdo = db();

$stmt = $pdo->prepare("SELECT id, email FROM admin.users WHERE username = ? AND is_active = TRUE");
$stmt->execute([$username]);
$user = $stmt->fetch();

// Ak user neexistuje, nemá email alebo email nesedí — vždy rovnaká odpoveď (bezpečnosť)
if (!$user || !$user['email'] || strtolower($user['email']) !== strtolower($email)) {
    json_ok(['sent' => false]);
}

// Zruš staré nevyužité tokeny
$pdo->prepare("DELETE FROM admin.password_reset_tokens WHERE user_id = ? AND used_at IS NULL")
    ->execute([$user['id']]);

// Vytvor nový token
$token = bin2hex(random_bytes(32));
$pdo->prepare("INSERT INTO admin.password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, NOW() + INTERVAL '1 hour')")
    ->execute([$user['id'], $token]);

$resetUrl = APP_URL . '/reset-password?token=' . $token;
$body_mail = "Ahoj,\n\n"
    . "dostali sme žiadosť o reset hesla pre účet " . $username . ".\n\n"
    . "Klikni na odkaz nižšie a nastav si nové heslo (platí 1 hodinu):\n"
    . $resetUrl . "\n\n"
    . "Ak si o reset hesla nežiadal, ignoruj tento email.\n\n"
    . "BetClub – Tipujte s kamošmi";

try {
    send_mail_logged($pdo, $email, 'reset hesla', $body_mail);
} catch (Throwable $e) {
    json_error('Nepodarilo sa odoslať email: ' . $e->getMessage(), 500);
}

json_ok(['sent' => true]);
