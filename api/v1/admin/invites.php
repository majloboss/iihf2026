<?php
// GET  /v1/admin/invites  — zoznam pozývacích linkov
// POST /v1/admin/invites  — generuj nový link
// PUT  /v1/admin/invites  — uprav sent_to pre existujúci link
$auth = require_admin();
$pdo  = db();
require_once __DIR__ . '/../../helpers/mailer.php';

if ($method === 'GET') {
    // Skús plnú query s group_id; ak stĺpec ešte neexistuje (run_013.sql), použij fallback
    // Postupný fallback pre prípad chýbajúcich stĺpcov (run_012 / run_013)
    $baseSelect = "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                          i.user_id AS used_by_id,
                          u.username AS used_by_username,
                          u.first_name, u.last_name, u.email, u.phone, u.avatar
                   FROM admin.invites i
                   LEFT JOIN admin.users u ON u.id = i.user_id
                   ORDER BY i.created_at DESC";
    try {
        $rows = $pdo->query(
            "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                    i.email_sent, i.group_id,
                    fg.name AS group_name,
                    i.user_id AS used_by_id,
                    u.username AS used_by_username,
                    u.first_name, u.last_name, u.email, u.phone, u.avatar
             FROM admin.invites i
             LEFT JOIN admin.users u ON u.id = i.user_id
             LEFT JOIN admin.friend_groups fg ON fg.id = i.group_id
             ORDER BY i.created_at DESC"
        )->fetchAll();
    } catch (PDOException $e) {
        try {
            // Bez group_id (run_013 nespustený)
            $rows = $pdo->query(
                "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at,
                        i.email_sent,
                        i.user_id AS used_by_id,
                        u.username AS used_by_username,
                        u.first_name, u.last_name, u.email, u.phone, u.avatar
                 FROM admin.invites i
                 LEFT JOIN admin.users u ON u.id = i.user_id
                 ORDER BY i.created_at DESC"
            )->fetchAll();
            foreach ($rows as &$r) { $r['group_id'] = null; $r['group_name'] = null; }
            unset($r);
        } catch (PDOException $e2) {
            // Bez email_sent aj group_id (run_012 nespustený)
            $rows = $pdo->query($baseSelect)->fetchAll();
            foreach ($rows as &$r) {
                $r['email_sent'] = false;
                $r['group_id']   = null;
                $r['group_name'] = null;
            }
            unset($r);
        }
    }

    $base = APP_URL . '/register?token=';
    foreach ($rows as &$r) {
        $r['link'] = $base . $r['invite_token'];
    }

    // Skupiny kde je admin členom (pre dropdown)
    $groups = $pdo->prepare(
        "SELECT fg.id, fg.name
         FROM admin.friend_groups fg
         JOIN admin.group_members gm ON gm.group_id = fg.id AND gm.user_id = ? AND gm.status = 'accepted'
         ORDER BY fg.name"
    );
    $groups->execute([$auth['user_id']]);

    json_ok(['invites' => $rows, 'groups' => $groups->fetchAll()]);
}

if ($method === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $sent_to  = isset($body['sent_to']) ? trim($body['sent_to']) : null;
    $group_id = isset($body['group_id']) ? (int)$body['group_id'] : null;
    $token    = bin2hex(random_bytes(24));

    // Overiť že admin je členom skupiny
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
        // Fallback ak group_id stĺpec ešte neexistuje (run_013.sql)
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
        // Získaj názov skupiny ak bol zadaný
        $group_name = null;
        if ($group_id) {
            $gname = $pdo->prepare('SELECT name FROM admin.friend_groups WHERE id=?');
            $gname->execute([$group_id]);
            $group_name = $gname->fetchColumn() ?: null;
        }

        $subject = 'Pozvánka do IIHF 2026 Tipovačky';
        $group_line = $group_name
            ? "Po registrácii budeš automaticky pridaný do skupiny „{$group_name}" — kde budeš môcť súťažiť s ostatnými členmi.\n\n"
            : "Odporúčame ti pripojiť sa k existujúcej skupine alebo si vytvoriť vlastnú a pozvať ďalších priateľov.\n\n";

        $rules_url = APP_URL . '/pravidla';
        $body_mail = "Ahoj,\n\n"
            . "pozývame Ťa do IIHF 2026 Tipovačky — súťaže v tipovaní výsledkov Majstrovstiev sveta v ľadovom hokeji 2026 (15. – 31. mája 2026).\n\n"
            . "Zaregistruj sa kliknutím na tento odkaz:\n$link\n\n"
            . "Po registrácii si zvolíš vlastné meno a heslo. Potom môžeš:\n"
            . "• tipovať presné výsledky všetkých 64 zápasov MS\n"
            . "• súťažiť s kamarátmi v skupinách\n"
            . "• sledovať priebežné poradie\n\n"
            . $group_line
            . "Pred začatím odporúčame prečítať si pravidlá tipovačky:\n$rules_url\n\n"
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
             'group_id' => $group_id, 'email_sent' => $email_sent, 'email_err' => $email_err], 201);
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
