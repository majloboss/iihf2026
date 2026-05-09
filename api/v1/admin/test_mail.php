<?php
// POST /v1/admin/test-mail  { "to": "email@example.com" }
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

require_once __DIR__ . '/../../helpers/mailer.php';

$body = json_decode(file_get_contents('php://input'), true);
$to   = trim($body['to'] ?? '');
if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) json_error('Neplatný email', 400);

try {
    send_mail($to, 'Test notifikácií IIHF 2026',
        "Ahoj,\n\nToto je testovací email z IIHF 2026 Tipovačky.\nSMTP funguje správne.\n\nIIHF 2026 Tipovačka"
    );
    json_ok(['sent' => true, 'to' => $to]);
} catch (Throwable $e) {
    json_error('SMTP chyba: ' . $e->getMessage(), 500);
}
