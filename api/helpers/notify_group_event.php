<?php
// Helper: pošli notifikáciu pre skupinovú udalosť (pozvánka / schválenie)

function notify_group_event(PDO $pdo, int $target_user_id, string $title, string $body_text, string $url = '/profile'): void {
    // Načítaj nastavenia + kontaktné info usera
    $stmt = $pdo->prepare("
        SELECT u.email,
               ns.enabled, ns.email_enabled, ns.push_enabled
        FROM admin.users u
        LEFT JOIN admin.notification_settings ns
            ON ns.user_id = u.id AND ns.notif_type = 'group_events'
        WHERE u.id = ?
    ");
    $stmt->execute([$target_user_id]);
    $row = $stmt->fetch();

    if (!$row || !$row['enabled']) return;

    // Email
    if ($row['email_enabled'] && !empty($row['email'])) {
        try {
            require_once __DIR__ . '/mailer.php';
            $mail_body = $body_text . "\n\n" . APP_URL . $url . "\n\nBetClub – Tipujte s kamošmi";
            send_mail_logged($pdo, $row['email'], $title . ' – BetClub', $mail_body);
        } catch (Throwable $e) { /* non-fatal */ }
    }

    // Push
    if ($row['push_enabled']) {
        $vapidFile = __DIR__ . '/../config/vapid.php';
        if (!file_exists($vapidFile)) return;
        require_once $vapidFile;
        if (!defined('VAPID_PUBLIC') || !defined('VAPID_PRIVATE')) return;
        require_once __DIR__ . '/webpush.php';
        $vapid   = ['public' => VAPID_PUBLIC, 'private' => VAPID_PRIVATE];
        $payload = json_encode(['title' => $title, 'body' => $body_text, 'url' => $url]);
        try {
            send_push_to_user($pdo, $target_user_id, $payload, $vapid);
        } catch (Throwable $e) { /* non-fatal */ }
    }
}
