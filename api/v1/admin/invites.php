<?php
// GET  /v1/admin/invites  — zoznam pozývacích linkov
// POST /v1/admin/invites  — generuj nový link
// PUT  /v1/admin/invites  — uprav sent_to pre existujúci link
$auth = require_admin();
$pdo  = db();
require_once __DIR__ . '/../../helpers/mailer.php';

if ($method === 'GET') {
    $rows = $pdo->query(
        "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                i.user_id AS used_by_id,
                u.username AS used_by_username,
                u.first_name, u.last_name, u.email, u.phone, u.avatar
         FROM admin.invites i
         LEFT JOIN admin.users u ON u.id = i.user_id
         ORDER BY i.created_at DESC"
    )->fetchAll();

    $base = APP_URL . '/register?token=';
    foreach ($rows as &$r) {
        $r['link'] = $base . $r['invite_token'];
    }
    json_ok($rows);
}

if ($method === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $sent_to = isset($body['sent_to']) ? trim($body['sent_to']) : null;
    $token   = bin2hex(random_bytes(24));

    $stmt = $pdo->prepare(
        'INSERT INTO admin.invites (invite_token, created_by, sent_to) VALUES (?, ?, ?) RETURNING id'
    );
    $stmt->execute([$token, $auth['user_id'], $sent_to ?: null]);
    $id = $stmt->fetchColumn();

    $link       = APP_URL . '/register?token=' . $token;
    $email_sent = false;
    $email_err  = null;

    if ($sent_to && filter_var($sent_to, FILTER_VALIDATE_EMAIL)) {
        $subject = 'Pozvánka do IIHF 2026 Tipovačky';
        $body_mail = "Ahoj,\n\n"
            . "pozývame Ťa do IIHF 2026 Tipovačky — súťaže v tipovaní výsledkov Majstrovstiev sveta v ľadovom hokeji 2026 (15. – 31. mája 2026).\n\n"
            . "Zaregistruj sa kliknutím na tento odkaz:\n$link\n\n"
            . "Po registrácii si zvolíš vlastné meno a heslo. Potom môžeš:\n"
            . "• tipovať presné výsledky všetkých 64 zápasov MS\n"
            . "• súťažiť s kamarátmi v skupinách\n"
            . "• sledovať priebežné poradie\n\n"
            . "Odporúčame ti pripojiť sa k existujúcej skupine alebo si vytvoriť vlastnú a pozvať ďalších priateľov.\n\n"
            . "Link je jednorazový — platí pre jednu registráciu.\n\n"
            . "Tešíme sa na Teba!\n"
            . "IIHF 2026 Tipovačka";
        try {
            send_mail_logged($pdo, $sent_to, $subject, $body_mail);
            $pdo->prepare("UPDATE admin.invites SET email_sent=TRUE WHERE id=?")->execute([$id]);
            $email_sent = true;
        } catch (Throwable $e) {
            $email_err = $e->getMessage();
        }
    }

    json_ok(['id' => $id, 'token' => $token, 'link' => $link, 'sent_to' => $sent_to,
             'email_sent' => $email_sent, 'email_err' => $email_err], 201);
}

if ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!isset($body['id'])) json_error('Missing id', 400);
    $sent_to = isset($body['sent_to']) ? trim($body['sent_to']) : null;
    $pdo->prepare('UPDATE admin.invites SET sent_to=? WHERE id=?')
        ->execute([$sent_to ?: null, (int)$body['id']]);
    json_ok(['updated' => true]);
}

json_error('Method not allowed', 405);
