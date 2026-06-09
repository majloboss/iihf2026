<?php
// GET  /v1/invites  - moje pozvánky (odoslané prihlaseným userom)
// POST /v1/invites  - vytvor novú pozvánku
$auth = require_auth();
$pdo  = db();
require_once __DIR__ . '/../helpers/mailer.php';

if ($method === 'GET') {
    try {
        $rows = $pdo->prepare(
            "SELECT i.id, i.invite_token, i.sent_to, i.created_at, i.used_at, i.cancelled_at,
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

    // Skupiny kde je user členom (pre dropdown):
    //  - len pre aktuálny turnaj (ak je zadaný competition_id)
    //  - nie uzavreté skupiny (do tých sa nedá pozývať)
    //  - člen smie pozývať len ak skupina povoľuje, alebo je zakladateľ
    $cid = isset($_GET['competition_id']) ? (int)$_GET['competition_id'] : null;
    $compFilter = $cid ? "AND fg.competition_id = :cid" : "";
    $gParams = [':uid' => $auth['user_id']];
    if ($cid) $gParams[':cid'] = $cid;

    $gStmt = $pdo->prepare(
        "SELECT fg.id, fg.name, c.name AS competition_name
         FROM admin.friend_groups fg
         JOIN admin.group_members gm ON gm.group_id = fg.id AND gm.user_id = :uid AND gm.status = 'accepted'
         LEFT JOIN admin.competitions c ON c.id = fg.competition_id
         WHERE fg.is_closed = FALSE
           AND (fg.allow_member_invite = TRUE OR fg.created_by = :uid)
           $compFilter
         ORDER BY fg.name"
    );
    $gStmt->execute($gParams);

    $meStmt = $pdo->prepare('SELECT username FROM admin.users WHERE id = ?');
    $meStmt->execute([$auth['user_id']]);
    $my_username = $meStmt->fetchColumn() ?: 'Hráč';

    json_ok(['invites' => $invites, 'groups' => $gStmt->fetchAll(), 'my_username' => $my_username]);
}

if ($method === 'POST') {
    $body     = json_decode(file_get_contents('php://input'), true) ?? [];
    $sent_to  = isset($body['sent_to']) ? trim($body['sent_to']) : null;
    $group_id = isset($body['group_id']) ? (int)$body['group_id'] : null;
    $token    = bin2hex(random_bytes(24));

    // Kontrola či email nie je už zaregistrovaný alebo má pozvánku
    if ($sent_to && filter_var($sent_to, FILTER_VALIDATE_EMAIL)) {
        // 1. Je už registrovaný ako používateľ?
        $regChk = $pdo->prepare("SELECT username FROM admin.users WHERE email = ? AND is_active = TRUE");
        $regChk->execute([$sent_to]);
        if ($reg = $regChk->fetch()) {
            json_error('Hráč s týmto emailom je už zaregistrovaný (@' . $reg['username'] . ')', 409);
        }

        // 2. Existuje pozvánka (čakajúca alebo použitá)? Zrušené ignorujeme.
        $dup = $pdo->prepare(
            "SELECT i.id, i.created_by, i.used_at, u.username
             FROM admin.invites i
             JOIN admin.users u ON u.id = i.created_by
             WHERE i.sent_to = ? AND i.cancelled_at IS NULL
             ORDER BY i.created_at DESC LIMIT 1"
        );
        $dup->execute([$sent_to]);
        if ($row = $dup->fetch()) {
            if ($row['used_at']) {
                json_error('Tento email je už zaregistrovaný — pozvánku použil hráč pozvaný od ' . $row['username'], 409);
            } elseif ((int)$row['created_by'] === (int)$auth['user_id']) {
                json_error('Pre tento email už existuje tvoja čakajúca pozvánka', 409);
            } else {
                json_error('Pozvánku na tento email už odoslal hráč ' . $row['username'], 409);
            }
        }
    }

    // Overit ze user je členom skupiny + skupina prijíma pozvánky
    if ($group_id) {
        $chk = $pdo->prepare(
            "SELECT fg.is_closed, fg.allow_member_invite, fg.created_by
             FROM admin.friend_groups fg
             JOIN admin.group_members gm ON gm.group_id = fg.id AND gm.user_id = ? AND gm.status = 'accepted'
             WHERE fg.id = ?"
        );
        $chk->execute([$auth['user_id'], $group_id]);
        $g = $chk->fetch();
        // nie člen | uzavretá | člen bez práva pozývať (a nie zakladateľ) → bez skupiny
        if (!$g
            || $g['is_closed']
            || (!$g['allow_member_invite'] && (int)$g['created_by'] !== (int)$auth['user_id'])) {
            $group_id = null;
        }
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
        $subject   = 'Pozvánka do BetClub Tipovačky';
        $rules_url = APP_URL . '/pravidla';

        $group_line = $group_name
            ? "Po registrácii budeš automaticky pridaný do skupiny \"" . $group_name . "\", kde budeš môcť súťažiť s hráčom " . $sender_username . " a ostatnými členmi.\n\n"
            : "Odporúčame Ti pripojiť sa k existujúcej skupine alebo si vytvoriť vlastnú a pozvať ďalších priateľov.\n\n";

        $body_mail = "Ahoj,\nhráč " . $sender_username . " Ťa pozýva do BetClub - tipovačky výsledkov športových zápasov pre Teba a Tvojich kamošov.\n\n"
            . "Zaregistruj sa kliknutím na tento odkaz:\n" . $link . "\n\n"
            . "Po registrácii si zvolíš vlastné meno a heslo. Potom môžeš:\n"
            . "- tipovať presné výsledky zápasov\n"
            . "- súťažiť s kamarátmi v skupinách\n"
            . "- sledovať priebežné poradie\n\n"
            . $group_line
            . "Pred začatím si prečítaj pravidlá tipovačky:\n" . $rules_url . "\n\n"
            . "Link je jednorazový – platí pre jednu registráciu.\n\n"
            . "Tešíme sa na Teba!\n"
            . "BetClub – Tipujte s kamošmi";
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

if ($method === 'DELETE') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $id   = (int)($body['id'] ?? 0);
    if (!$id) json_error('Chýba id', 400);

    // Len vlastné, nepoužité, nezrušené pozvánky
    $stmt = $pdo->prepare("SELECT id FROM admin.invites WHERE id = ? AND created_by = ? AND used_at IS NULL AND cancelled_at IS NULL");
    $stmt->execute([$id, $auth['user_id']]);
    if (!$stmt->fetch()) json_error('Pozvánka neexistuje alebo už bola použitá', 404);

    $pdo->prepare("UPDATE admin.invites SET cancelled_at = NOW() WHERE id = ?")->execute([$id]);
    json_ok(['cancelled' => true]);
}

json_error('Method not allowed', 405);
