<?php
// Helper: pošli push notifikáciu pre skupinovú udalosť (pozvánka / schválenie)
// Volaj keď: user dostane pozvánku do skupiny, alebo mu bola schválená žiadosť.

function notify_group_event(PDO $pdo, int $target_user_id, string $title, string $body, string $url = '/profile'): void {
    // Má user povolené group_events notifikácie a push subscription?
    $stmt = $pdo->prepare("
        SELECT ns.push_enabled
        FROM admin.notification_settings ns
        WHERE ns.user_id = ? AND ns.notif_type = 'group_events' AND ns.push_enabled = TRUE
    ");
    $stmt->execute([$target_user_id]);
    if (!$stmt->fetch()) return;

    // Načítaj VAPID kľúče
    $vapidFile = __DIR__ . '/../config/vapid.php';
    if (!file_exists($vapidFile)) return;
    require_once $vapidFile;
    if (!defined('VAPID_PUBLIC') || !defined('VAPID_PRIVATE')) return;

    require_once __DIR__ . '/webpush.php';

    $vapid = ['public' => VAPID_PUBLIC, 'private' => VAPID_PRIVATE];
    $payload = json_encode([
        'title' => $title,
        'body'  => $body,
        'url'   => $url,
    ]);

    try {
        send_push_to_user($pdo, $target_user_id, $payload, $vapid);
    } catch (Throwable $e) { /* non-fatal */ }
}
