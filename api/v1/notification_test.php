<?php
// POST /v1/notification-test — zaradí skúšobnú notifikáciu do fronty.
// GET  /v1/notification-test — stav poslednej žiadosti.
//
// Správa sa NEodosiela hneď. Zapíše sa žiadosť a odošle ju až cron pri
// najbližšom behu — presne to je zmysel testu: overiť, či cron naozaj beží.
// Keby endpoint poslal e-mail sám, o crone by nepovedal vôbec nič.
//
// Fronta žije v admin.notification_log, ktorý sa aj inak používa na evidenciu
// notifikácií:
//   'test_request' — žiadosť čaká na cron
//   'test_sent'    — cron ju spracoval
//
// Žiadosť staršia ako hodinu sa považuje za nedoručenú: cron beží každých päť
// minút, takže dovtedy ju musel zachytiť.

$auth = require_auth();
$pdo  = db();
$uid  = (int)$auth['user_id'];

/** Kedy bola posledná žiadosť a či ju už cron spracoval. */
function test_stav(PDO $pdo, int $uid): array {
    $q = $pdo->prepare("
        SELECT notif_type, sent_at
          FROM admin.notification_log
         WHERE user_id = ? AND notif_type IN ('test_request', 'test_sent')
         ORDER BY sent_at DESC");
    $q->execute([$uid]);

    $ziadost = null;
    $odoslane = null;
    foreach ($q->fetchAll() as $r) {
        if ($r['notif_type'] === 'test_request' && !$ziadost)  $ziadost  = $r['sent_at'];
        if ($r['notif_type'] === 'test_sent'    && !$odoslane) $odoslane = $r['sent_at'];
    }

    $caka  = $ziadost && (!$odoslane || $odoslane < $ziadost);
    $stara = $ziadost && (strtotime($ziadost) < time() - 3600);

    return [
        'requested_at' => $ziadost,
        'sent_at'      => $odoslane,
        'waiting'      => (bool)($caka && !$stara),
        'stale'        => (bool)($caka && $stara),
    ];
}

if ($method === 'GET') {
    json_ok(test_stav($pdo, $uid));
}

if ($method !== 'POST') json_error('Method not allowed', 405);

// Staré žiadosti sa zmažú, aby bol stav jednoznačný — platí vždy len posledná.
$pdo->prepare("DELETE FROM admin.notification_log
                WHERE user_id = ? AND notif_type IN ('test_request', 'test_sent')")
    ->execute([$uid]);

$pdo->prepare("INSERT INTO admin.notification_log (user_id, notif_type, game_id, competition_id)
               VALUES (?, 'test_request', NULL, NULL)")
    ->execute([$uid]);

json_ok(test_stav($pdo, $uid) + [
    'queued'  => true,
    // Bez zargonu: pouzivatela nezaujima cron, ale ze ma pockat.
    'message' => 'Správa je pripravená na odoslanie. Systém rozposiela '
               . 'upozornenia každých pár minút, takže ti príde zvyčajne '
               . 'do piatich minút — netreba nič ďalšie robiť.',
]);
