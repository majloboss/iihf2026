<?php
// Upozornenie na novú správu od organizátora.
//
// Správa v chate sa doteraz dala zistiť len otvorením obrazovky Správy. Keď
// organizátor odpísal, hráč sa o tom nedozvedel, kým sa sám neprihlásil.
//
// Posielajú sa len správy od admina, ktoré si hráč ešte neprečítal. Prečítanú
// správu netreba pripomínať; naopak neprečítaná sa pošle raz a dedup zabezpečí
// záznam v admin.notification_log.
//
// Spúšťa sa z run.php spolu s ostatnými notifikáciami.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/webpush.php';

$pdo   = db();
$vapid = wp_load_vapid();

// Testovacie a ostre prostredie posielaju rovnaku spravu, takze bez oznacenia
// sa neda rozlisit, odkial prisla. Rozpoznava sa podla nazvu databazy.
$jeTest   = defined('DB_NAME') && stripos(DB_NAME, 'DEV') !== false;
$prostred = $jeTest ? ' [TEST]' : '';

// Zoznam sa obmedzuje na posledny tyzden: starsiu spravu uz nema zmysel
// pripominat a bez limitu by sa pri prvom behu rozposlala cela historia.
//
// Kto notifikacie nema nastavene, dostane ich: odpoved organizatora byva
// dolezita a vypnut sa da v Notifikaciach.
$spravy = $pdo->query("
    SELECT m.id, m.user_id, m.body, m.image_url,
           u.username, u.email,
           COALESCE(ns.email_enabled, TRUE) AS chce_email,
           COALESCE(ns.push_enabled, TRUE)  AS chce_push
      FROM admin.messages m
      JOIN admin.users u ON u.id = m.user_id
      LEFT JOIN admin.notification_settings ns
             ON ns.user_id = u.id AND ns.notif_type = 'admin_message'
     WHERE m.sender = 'admin'
       AND m.read_at IS NULL
       AND m.deleted_at IS NULL
       AND m.created_at >= NOW() - INTERVAL '7 days'
       AND u.is_active = TRUE
       AND COALESCE(ns.enabled, TRUE) = TRUE
       AND (u.email IS NOT NULL
            OR EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id))
       AND NOT EXISTS (
             SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = m.user_id
                AND nl.notif_type = 'admin_message'
                AND nl.game_id = m.id)
     ORDER BY m.created_at
")->fetchAll();

foreach ($spravy as $s) {
    $uid = (int)$s['user_id'];
    $mid = (int)$s['id'];

    // Sprava moze byt aj samotny obrazok — vtedy `body` chyba.
    $text = trim((string)($s['body'] ?? ''));
    if ($text === '') $text = $s['image_url'] ? '(obrázok)' : '(prázdna správa)';

    // Dlhy text sa do notifikacie nezmesti; cely si ho precita v appke.
    $skratene = mb_strlen($text) > 160 ? mb_substr($text, 0, 157) . '…' : $text;

    if (!empty($s['email']) && $s['chce_email']) {
        $subject = 'Správa od organizátora' . $prostred;
        $body = "Ahoj {$s['username']},\n\n"
              . "organizátor ti napísal:\n\n"
              . "$text\n\n"
              . "Odpovedať môžeš v aplikácii v sekcii Správy.\n\n"
              . ($jeTest
                  ? "Táto správa prišla z TESTOVACEJ verzie (dev_betclub).\n\nBetClub"
                  : 'BetClub');
        try { send_mail($s['email'], $subject, $body); }
        catch (Throwable $e) { error_log("admin_message email uid=$uid: " . $e->getMessage()); }
    }

    if ($vapid && $s['chce_push']) {
        $payload = json_encode([
            'title' => 'Správa od organizátora' . $prostred,
            'body'  => $skratene,
            'url'   => '/spravy',
        ]);
        try { send_push_to_user($pdo, $uid, $payload, $vapid); }
        catch (Throwable $e) { error_log("admin_message push uid=$uid: " . $e->getMessage()); }
    }

    // Zapisuje sa aj ked odoslanie zlyhalo — inak by sa pokus opakoval
    // kazdych pat minut, kym si spravu neprecita.
    $pdo->prepare("
        INSERT INTO admin.notification_log (user_id, notif_type, game_id, sent_at)
        VALUES (?, 'admin_message', ?, NOW())")
        ->execute([$uid, $mid]);
}
