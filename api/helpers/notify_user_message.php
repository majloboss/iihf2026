<?php
// Helper: admin odpovedal → notifikuj usera (push + email)
function notify_user_new_message(PDO $pdo, int $target_uid, string $text): void {
    $u = $pdo->prepare("SELECT email FROM admin.users WHERE id = ? AND is_active = TRUE");
    $u->execute([$target_uid]);
    $row = $u->fetch();
    if (!$row) return;

    $title    = 'Nová správa od admina';
    $bodyText = mb_strlen($text) > 120 ? mb_substr($text, 0, 120) . '…' : $text;
    $url      = '/spravy';

    // Push
    $vapidFile = __DIR__ . '/../config/vapid.php';
    if (file_exists($vapidFile)) {
        require_once $vapidFile;
        if (defined('VAPID_PUBLIC') && defined('VAPID_PRIVATE')) {
            require_once __DIR__ . '/webpush.php';
            $vapid   = ['public' => VAPID_PUBLIC, 'private' => VAPID_PRIVATE];
            $payload = json_encode(['title' => $title, 'body' => $bodyText, 'url' => $url]);
            try { send_push_to_user($pdo, $target_uid, $payload, $vapid); } catch (Throwable $e) {}
        }
    }

    // Email
    if (!empty($row['email'])) {
        try {
            require_once __DIR__ . '/mailer.php';
            $mail = $bodyText . "\n\n" . APP_URL . $url . "\n\nBetClub – Tipujte s kamošmi";
            send_mail_logged($pdo, $row['email'], $title . ' – BetClub', $mail);
        } catch (Throwable $e) {}
    }
}
