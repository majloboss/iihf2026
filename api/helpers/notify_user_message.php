<?php
// Admin odpovedal hráčovi → upozornenie push aj e-mailom.
//
// Posiela sa hneď pri odoslaní správy, nie cez cron: odpoveď organizátora
// má prísť obratom, nie s odstupom až piatich minút.
require_once __DIR__ . '/webpush.php';
require_once __DIR__ . '/mailer.php';

function notify_user_new_message(PDO $pdo, int $target_uid, string $text): void {
    $u = $pdo->prepare("SELECT email FROM admin.users WHERE id = ? AND is_active = TRUE");
    $u->execute([$target_uid]);
    $row = $u->fetch();
    if (!$row) return;

    // Kto si upozornenia na správy vypol, nedostane ich. Kto nastavenie nemá,
    // dostáva — odpoveď organizátora býva dôležitá.
    $ns = $pdo->prepare("SELECT enabled, email_enabled, push_enabled
                           FROM admin.notification_settings
                          WHERE user_id = ? AND notif_type = 'admin_message'");
    $ns->execute([$target_uid]);
    $nast = $ns->fetch() ?: [];
    $zapnute   = !array_key_exists('enabled', $nast)       || $nast['enabled'];
    $chceMail  = !array_key_exists('email_enabled', $nast) || $nast['email_enabled'];
    $chcePush  = !array_key_exists('push_enabled', $nast)  || $nast['push_enabled'];
    if (!$zapnute) return;

    // Testovacie a ostre prostredie posielaju rovnaku spravu, takze bez
    // oznacenia sa neda rozlisit, odkial prisla.
    $jeTest   = defined('DB_NAME') && stripos(DB_NAME, 'DEV') !== false;
    $prostred = $jeTest ? ' [TEST]' : '';

    // Dlhy text sa do notifikacie nezmesti; cely si ho precita v appke.
    $skratene = mb_strlen($text) > 120 ? mb_substr($text, 0, 120) . '…' : $text;
    $url      = '/spravy';

    if ($chcePush) {
        // `wp_load_vapid()` vracia pole so subject / public_key / private_key_pem.
        // Predtym sa tu cakali konstanty VAPID_PUBLIC a VAPID_PRIVATE, ktore
        // konfiguracia nema — push preto ticho vypadaval a chodil len mail.
        $vapid = wp_load_vapid();
        if ($vapid) {
            $payload = json_encode([
                'title' => 'Nová správa od admina' . $prostred,
                'body'  => $skratene,
                'url'   => $url,
            ]);
            try { send_push_to_user($pdo, $target_uid, $payload, $vapid); }
            catch (Throwable $e) { error_log("admin_message push uid=$target_uid: " . $e->getMessage()); }
        }
    }

    if ($chceMail && !empty($row['email'])) {
        // Predponu "Betclub - " doplna send_mail.
        $mail = $skratene . "\n\n" . APP_URL . $url . "\n\n"
              . ($jeTest ? "Táto správa prišla z TESTOVACEJ verzie (dev_betclub).\n\nBetClub" : 'BetClub');
        try { send_mail_logged($pdo, $row['email'], 'nová správa od admina' . $prostred, $mail); }
        catch (Throwable $e) { error_log("admin_message email uid=$target_uid: " . $e->getMessage()); }
    }
}
