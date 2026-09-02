<?php
// Skúšobné notifikácie vyžiadané z obrazovky Notifikácie.
//
// Používateľ si v aplikácii vyžiada skúšobnú správu, ktorá sa zapíše do
// admin.notification_log ako 'test_request'. Tento skript ju vyzdvihne a
// odošle — vďaka tomu test overí aj to, či cron naozaj beží. Keby endpoint
// posielal sám, o crone by nepovedal nič.
//
// Po odoslaní sa žiadosť prepíše na 'test_sent', aby ju ďalší beh nespracoval
// znovu a aplikácia vedela zobraziť, kedy správa odišla.
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

// Starsie ako hodinu sa nespracuvavaju: taku ziadost uz aplikacia hlasi ako
// nedorucenu a odoslat ju spatne by len miatlo.
$ziadosti = $pdo->query("
    SELECT nl.id, nl.user_id, u.username, u.email
      FROM admin.notification_log nl
      JOIN admin.users u ON u.id = nl.user_id
     WHERE nl.notif_type = 'test_request'
       AND nl.sent_at >= NOW() - INTERVAL '1 hour'
       AND u.is_active = TRUE
")->fetchAll();

foreach ($ziadosti as $z) {
    $uid = (int)$z['user_id'];
    $cas = (new DateTime('now', new DateTimeZone('Europe/Bratislava')))->format('j. n. Y H:i');

    if (!empty($z['email'])) {
        $subject = 'Skúšobná správa z BetClubu' . $prostred;
        $body = "Ahoj {$z['username']},\n\n"
              . "toto je skúšobná správa, ktorú si si vyžiadal v nastaveniach upozornení.\n"
              . "Ak ju čítaš, e-maily z BetClubu ti chodia správne.\n\n"
              . "Odoslané: $cas\n\n"
              . "Skutočné upozornenia ti prídu podľa toho, čo máš zapnuté —\n"
              . "napríklad pred začiatkom zápasu alebo po zadaní výsledku.\n\n"
              . ($jeTest
                  ? "Táto správa prišla z TESTOVACEJ verzie (dev_betclub).\n\nBetClub"
                  : 'BetClub');
        try { send_mail($z['email'], $subject, $body); }
        catch (Throwable $e) { error_log("test notif email uid=$uid: " . $e->getMessage()); }
    }

    if ($vapid) {
        $payload = json_encode([
            'title' => 'Skúšobná správa' . $prostred,
            'body'  => "Upozornenia ti fungujú. Odoslané $cas.",
            'url'   => '/notifications',
        ]);
        try { send_push_to_user($pdo, $uid, $payload, $vapid); }
        catch (Throwable $e) { error_log("test notif push uid=$uid: " . $e->getMessage()); }
    }

    // Ziadost sa oznaci ako vybavena aj ked odoslanie zlyhalo — inak by sa
    // pokus opakoval kazdych pat minut cely nasledujuci hodinu.
    $pdo->prepare("UPDATE admin.notification_log
                      SET notif_type = 'test_sent', sent_at = NOW()
                    WHERE id = ?")
        ->execute([(int)$z['id']]);
}
