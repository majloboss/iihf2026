<?php
// GET  /v1/invites  - moje pozvánky (odoslané prihlaseným userom)
// POST /v1/invites  - vytvor novú pozvánku
$auth = require_auth();
$pdo  = db();
require_once __DIR__ . '/../helpers/mailer.php';

if ($method === 'GET') {
    try {
        $rows = $pdo->prepare(
            "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                    i.email_sent, i.group_id,
                    fg.name AS group_name,
                    u.username AS used_by_username
             FROM admin.invites i
             LEFT JOIN admin.users u ON u.id = i.user_id
             LEFT JOIN admin.friend_groups fg ON fg.id = i.group_id
             WHERE i.created_by = ?
             ORDER BY i.created_at DESC"
        );
        $rows->execute([$auth['user_id']]);
        $invites = $rows->fetchAll();
    } catch (PDOException $e) {
        // Fallback bez group_id / email_sent
        $rows = $pdo->prepare(
            "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                    u.username AS used_by_username
             FROM admin.invites i
             LEFT JOIN admin.users u ON u.id = i.user_id
             WHERE i.created_by = ?
             ORDER BY i.created_at DESC"
        );
        $rows->execute([$auth['user_id']]);
        $invites = $rows->fetchAll();
        foreach ($invites as &$r) {
            $r['email_sent']  = false;
            $r['group_id']    = null;
            $r['group_name']  = null;
        }
        unset($r);
    }

    $base = APP_URL . '/register?token=';
    foreach ($invites as &$r) {
        $r['link'] = $base . $r['invite_token'];
    }
    unset($r);

    // Skupiny kde je user členom (pre dropdown)
    $gStmt = $pdo->prepare(
        "SELECT fg.id, fg.name
         FROM admin.friend_groups fg
         JOIN admin.group_members gm ON gm.group_id = fg.id AND gm.user_id = ? AND gm.status = 'accepted'
         ORDER BY fg.name"
    );
    $gStmt->execute([$auth['user_id']]);

    json_ok(['invites' => $invites, 'groups' => $gStmt->fetchAll()]);
}

if ($method === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $sent_to  = isset($body['sent_to']) ? trim($body['sent_to']) : null;
    $group_id = isset($body['group_id']) ? (int)$body['group_id'] : null;
    $token    = bin2hex(random_bytes(24));

    // Overit ze user je členom skupiny
    if ($group_id) {
        $chk = $pdo->prepare(
            "SELECT 1 FROM admin.group_members WHERE group_id=? AND user_id=? AND status='accepted'"
        );
        $chk->execute([$group_id, $auth['user_id']]);
        if (!$chk->fetch()) $group_id = null;
    }

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO admin.invites (invite_token, created_by, sent_to, group_id) VALUES (?, ?, ?, ?) RETURNING id'
        );
        $stmt->execute([$token, $auth['user_id'], $sent_to ?: null, $group_id ?: null]);
    } catch (PDOException $e) {
        $group_id = null;
        $stmt = $pdo->prepare(
            'INSERT INTO admin.invites (invite_token, created_by, sent_to) VALUES (?, ?, ?) RETURNING id'
        );
        $stmt->execute([$token, $auth['user_id'], $sent_to ?: null]);
    }
    $id = $stmt->fetchColumn();

    $link       = APP_URL . '/register?token=' . $token;
    $email_sent = false;
    $email_err  = null;

    if ($sent_to && filter_var($sent_to, FILTER_VALIDATE_EMAIL)) {
        // Meno odosielateľa
        $senderStmt = $pdo->prepare('SELECT username FROM admin.users WHERE id = ?');
        $senderStmt->execute([$auth['user_id']]);
        $sender_username = $senderStmt->fetchColumn() ?: 'Hráč';

        $group_name = null;
        if ($group_id) {
            $gname = $pdo->prepare('SELECT name FROM admin.friend_groups WHERE id=?');
            $gname->execute([$group_id]);
            $group_name = $gname->fetchColumn() ?: null;
        }
        $subject   = 'Pozvánka do IIHF 2026 Tipovačky';
        $rules_url = APP_URL . '/pravidla';

        $group_line = $group_name
            ? "Po registrácii budeš automaticky pridaný do skupiny \"" . $group_name . "\", kde budeš môcť súťažiť so " . $sender_username . " a ostatnými členmi.\n\n"
            : "Odporúčame ti pripojiť sa k existujúcej skupine alebo si vytvoriť vlastnú a pozvať ďalších priateľov.\n\n";

        $body_mail = "Ahoj,\n\n"
            . $sender_username . " ťa pozýva do IIHF 2026 Tipovačky – súťaže v tipovaní výsledkov Majstrovstiev sveta v ľadovom hokeji 2026 (15. – 31. mája 2026).\n\n"
            . "Zaregistruj sa kliknutím na tento odkaz:\n" . $link . "\n\n"
            . "Po registrácii si zvolíš vlastné meno a heslo. Potom môžeš:\n"
            . "- tipovať presné výsledky všetkých 64 zápasov MS\n"
            . "- súťažiť s kamarátmi v skupinách\n"
            . "- sledovať priebežné poradie\n\n"
            . $group_line
            . "Pred začatím odporúčame prečítať si pravidlá tipovačky:\n" . $rules_url . "\n\n"
            . "Link je jednorazový – platí pre jednu registráciu.\n\n"
            . "Tešíme sa na teba!\n"
            . "IIHF 2026 Tipovačka";
        try {
            send_mail_logged($pdo, $sent_to, $subject, $body_mail);
            $pdo->prepare("UPDATE admin.invites SET email_sent=TRUE WHERE id=?")->execute([$id]);
            $email_sent = true;
        } catch (Throwable $e) {
            $email_err = $e->getMessage();
        }
    }

    json_ok(['id' => $id, 'token' => $token, 'link' => $link,
             'sent_to' => $sent_to, 'group_id' => $group_id,
             'email_sent' => $email_sent, 'email_err' => $email_err], 201);
}

json_error('Method not allowed', 405);
