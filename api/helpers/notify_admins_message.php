<?php
// Helper: nová správa od usera → notifikuj všetkých adminov (push + email)
function notify_admins_new_message(PDO $pdo, int $from_uid, string $from_username, string $text): void {
    $admins = $pdo->query("SELECT id, email FROM admin.users WHERE role = 'admin' AND is_active = TRUE")->fetchAll();
    if (!$admins) return;

    $title = 'Nová správa od ' . $from_username;
    $bodyText = mb_strlen($text) > 120 ? mb_substr($text, 0, 120) . '…' : $text;
    $url = '/admin/messages?user_id=' . $from_uid;

    // Push setup (raz)
    $vapidFile = __DIR__ . '/../config/vapid.php';
    $vapid = null;
    if (file_exists($vapidFile)) {
        require_once $vapidFile;
        if (defined('VAPID_PUBLIC') && defined('VAPID_PRIVATE')) {
            require_once __DIR__ . '/webpush.php';
            $vapid = ['public' => VAPID_PUBLIC, 'private' => VAPID_PRIVATE];
        }
    }
    $payload = json_encode(['title' => $title, 'body' => $bodyText, 'url' => '/admin']);

    foreach ($admins as $a) {
        if ($vapid) {
            try { send_push_to_user($pdo, (int)$a['id'], $payload, $vapid); } catch (Throwable $e) {}
        }
        if (!empty($a['email'])) {
            try {
                require_once __DIR__ . '/mailer.php';
                $mail = $bodyText . "\n\n" . APP_URL . $url . "\n\nBetClub – Tipujte s kamošmi";
                send_mail_logged($pdo, $a['email'], $title . ' – BetClub', $mail);
            } catch (Throwable $e) {}
        }
    }
}
