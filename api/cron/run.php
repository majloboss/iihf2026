<?php
// HTTP wrapper pre cron — volaj cez wget kazdych 5 minut
// URL: https://iihf2026.fellow.sk/api/cron/run.php?token=<CRON_SECRET>
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/cron_heartbeat.php';

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    exit('Forbidden');
}

ob_start();

// Kazdy skript bezi SAMOSTATNE. Predtym boli volane priamo za sebou, takze
// chyba v jednom zhodila aj vsetky nasledujuce — 14.9.2026 tak duplicitny
// JOIN v _ucl zastavil aj _test a skusobne spravy tiicho zostali vo fronte.
//
// Chyba sa teraz zapise a pokracuje sa dalsim skriptom.
$skripty = ['send_notifications', 'send_notifications_fifa',
            'send_notifications_ucl', 'send_notifications_test'];
$chyby = [];

foreach ($skripty as $skript) {
    try {
        require __DIR__ . '/' . $skript . '.php';
    } catch (Throwable $e) {
        $chyby[] = $skript . ': ' . $e->getMessage();
        error_log('cron ' . $skript . ': ' . $e->getMessage());
    }
}

$out = ob_get_clean();

// Heartbeat: bez neho sa z admin.cron_heartbeat nedalo zistit, ci notifikacny
// cron vobec bezi — v tabulke boli len livescore skripty a pad sa prejavil
// az tym, ze notifikacie ticho prestali chodit.
cron_beh('notifikacie', $chyby ? ('CHYBY: ' . implode(' | ', $chyby)) : 'ok');

echo 'OK ' . date('Y-m-d H:i:s');
if ($chyby) echo "\nCHYBY:\n" . implode("\n", $chyby);
if ($out)   echo "\n" . $out;
