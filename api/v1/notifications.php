<?php
// GET  /v1/notifications  — načítaj nastavenia notifikácií
// POST /v1/notifications  — ulož nastavenia notifikácií
$auth = require_auth();
$pdo  = db();
$uid  = $auth['user_id'];

$TYPES = [
    'untipped_game'      => ['label' => 'Netipovaný zápas',          'timed' => true],
    'game_start'         => ['label' => 'Začiatok zápasu',            'timed' => true],
    'result_entered'     => ['label' => 'Výsledok zápasu',            'timed' => false],
    'group_stage_closed' => ['label' => 'Uzavretie základnej časti',  'timed' => false],
    'new_games_added'    => ['label' => 'Nové play-off zápasy',       'timed' => false],
];

if ($method === 'GET') {
    $rows = $pdo->prepare("SELECT * FROM admin.notification_settings WHERE user_id = ?");
    $rows->execute([$uid]);
    $saved = [];
    foreach ($rows->fetchAll() as $r) {
        $saved[$r['notif_type']] = $r;
    }

    $result = [];
    foreach ($TYPES as $type => $meta) {
        $s = $saved[$type] ?? null;
        $result[] = [
            'type'           => $type,
            'label'          => $meta['label'],
            'timed'          => $meta['timed'],
            'enabled'        => $s ? (bool)$s['enabled']       : false,
            'email_enabled'  => $s ? (bool)$s['email_enabled'] : false,
            'push_enabled'   => $s ? (bool)$s['push_enabled']  : false,
            'minutes_before' => $s ? (int)$s['minutes_before'] : 30,
        ];
    }
    json_ok($result);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) json_error('Neplatné dáta', 400);

    $stmt = $pdo->prepare("
        INSERT INTO admin.notification_settings (user_id, notif_type, enabled, email_enabled, push_enabled, minutes_before)
        VALUES (:uid, :type, :en, :email, :push, :min)
        ON CONFLICT (user_id, notif_type) DO UPDATE SET
            enabled       = EXCLUDED.enabled,
            email_enabled = EXCLUDED.email_enabled,
            push_enabled  = EXCLUDED.push_enabled,
            minutes_before= EXCLUDED.minutes_before
    ");

    foreach ($body as $item) {
        $type = $item['type'] ?? '';
        if (!isset($TYPES[$type])) continue;
        $stmt->execute([
            ':uid'   => $uid,
            ':type'  => $type,
            ':en'    => ($item['enabled']       ?? false) ? 'true' : 'false',
            ':email' => ($item['email_enabled'] ?? false) ? 'true' : 'false',
            ':push'  => ($item['push_enabled']  ?? false) ? 'true' : 'false',
            ':min'   => $TYPES[$type]['timed'] ? (int)($item['minutes_before'] ?? 30) : null,
        ]);
    }
    json_ok(['saved' => true]);
}

json_error('Method not allowed', 405);
