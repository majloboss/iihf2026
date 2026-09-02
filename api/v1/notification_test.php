<?php
// POST /v1/notification-test — skúšobná notifikácia prihlásenému používateľovi.
//
// Posiela e-mail aj push naraz, aby si používateľ overil, že mu doručenie
// funguje — bez čakania na najbližší zápas. Nezapisuje sa do
// notification_log: ten slúži na to, aby sa ostrá notifikácia neposlala
// dvakrát, a skúšobná správa doň nepatrí.
//
// Prechádza rovnakou cestou ako cron: send_mail() a send_push_to_user() sú tie
// isté funkcie, ktoré volá send_notifications_ucl.php. Navyše sa pozrie na
// uložené nastavenia a povie, čo by pri ostrej notifikácii naozaj prišlo —
// samotnú správu ale pošle vždy, aby si používateľ overil doručovanie aj vtedy,
// keď má všetko vypnuté.

require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/webpush.php';

$auth = require_auth();
if ($method !== 'POST') json_error('Method not allowed', 405);

$uid = (int)$auth['user_id'];

$u = $pdo->prepare('SELECT username, email FROM admin.users WHERE id = ?');
$u->execute([$uid]);
$user = $u->fetch();
if (!$user) json_error('Používateľ neexistuje', 404);

$cas = (new DateTime('now', new DateTimeZone('Europe/Bratislava')))->format('j. n. Y H:i');

// Čo má používateľ zapnuté — do odpovede, nech vidí, čo mu bude naozaj chodiť.
$ns = $pdo->prepare('SELECT notif_type, enabled, email_enabled, push_enabled
                       FROM admin.notification_settings WHERE user_id = ?');
$ns->execute([$uid]);
$zapnute = [];
foreach ($ns->fetchAll() as $r) {
    if (!$r['enabled']) continue;
    $kanaly = [];
    if ($r['email_enabled']) $kanaly[] = 'e-mail';
    if ($r['push_enabled'])  $kanaly[] = 'push';
    if ($kanaly) $zapnute[$r['notif_type']] = $kanaly;
}

$vysledok = ['email' => null, 'push' => null, 'settings' => $zapnute];

// ── E-mail ────────────────────────────────────────────────────────────────────
if (!empty($user['email'])) {
    $subject = 'Skúšobná správa z BetClubu';
    $body = "Ahoj {$user['username']},\n\n"
          . "toto je skúšobná správa, ktorú si si vyžiadal v nastaveniach notifikácií.\n"
          . "Ak ju čítaš, e-maily z BetClubu ti chodia správne.\n\n"
          . "Odoslané: $cas\n\n"
          . "Skutočné upozornenia ti prídu podľa toho, čo máš zapnuté —\n"
          . "napríklad pred začiatkom zápasu alebo po zadaní výsledku.\n\n"
          . 'BetClub';
    try {
        send_mail($user['email'], $subject, $body);
        $vysledok['email'] = ['sent' => true, 'to' => $user['email']];
    } catch (Throwable $e) {
        error_log("notification test email uid=$uid: " . $e->getMessage());
        $vysledok['email'] = ['sent' => false, 'error' => 'E-mail sa nepodarilo odoslať'];
    }
} else {
    $vysledok['email'] = ['sent' => false, 'error' => 'Nemáš vyplnenú e-mailovú adresu'];
}

// ── Push ──────────────────────────────────────────────────────────────────────
$vapid = wp_load_vapid();
if (!$vapid) {
    $vysledok['push'] = ['sent' => false, 'error' => 'Push nie je na serveri nastavený'];
} else {
    $payload = json_encode([
        'title' => 'Skúšobná správa',
        'body'  => 'Push notifikácie ti fungujú. Odoslané ' . $cas . '.',
        'url'   => '/notifications',
    ]);
    $r = send_push_to_user($pdo, $uid, $payload, $vapid);
    if (!empty($r['no_subscriptions'])) {
        $vysledok['push'] = ['sent' => false, 'error' => 'Push na tomto zariadení nie je povolený'];
    } else {
        $vysledok['push'] = ['sent' => (int)$r['sent'] > 0, 'count' => (int)$r['sent']];
        if ((int)$r['sent'] === 0) {
            $vysledok['push']['error'] = 'Push sa nepodarilo doručiť';
        }
    }
}

json_ok($vysledok);
