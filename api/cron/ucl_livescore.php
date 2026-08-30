<?php
// Cron pre priebezne vysledky Ligy majstrov.
//
// Volaj kazdych 5 minut, napriklad cez wget:
//   https://dev_betclub.fellow.sk/api/cron/ucl_livescore.php?token=<CRON_SECRET>
//
// Script sam rozhodne, ci ma zmysel volat model: sahaju sa iba zapasy, ktore
// mozu prave bezat (od piatich minut pred vykopom do troch hodin po nom).
// Mimo toho okna skonci hned a nic nestoji, takze cron moze bezat stale.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';

header('Content-Type: text/plain; charset=utf-8');

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    exit('Forbidden');
}

$cfg = __DIR__ . '/../config/openrouter.php';
if (!file_exists($cfg)) {
    http_response_code(500);
    exit('Chýba api/config/openrouter.php');
}
require_once $cfg;
require_once __DIR__ . '/../helpers/ucl_livescore_fn.php';

$cas = gmdate('Y-m-d H:i:s') . ' UTC';

try {
    $pdo = db();
    $games = ucl_livescore_games($pdo);

    if (!$games) {
        exit("$cas — dnes sa nehra, nic sa nerobi.\n");
    }
    if (!ucl_livescore_due($games)) {
        exit("$cas — dnes su zapasy, ale ziadny prave nebezi.\n");
    }

    $res = ucl_livescore_refresh($pdo, $games);
    if (isset($res['error'])) {
        http_response_code(502);
        exit("$cas — CHYBA: {$res['error']}\n");
    }

    echo "$cas — aktualizovanych {$res['updated']} z {$res['watched']} sledovanych\n";
    foreach ($res['games'] as $g) {
        echo sprintf("  #%d %s  %s  %s\n", $g['game_id'], $g['teams'],
                     $g['score'] ?? '-:-', $g['status'] ?: '');
    }
    if (!empty($res['missing'])) {
        echo '  vo feede chybali: ' . implode(', ', $res['missing']) . "\n";
    }
} catch (Throwable $e) {
    http_response_code(500);
    exit("$cas — CHYBA: " . $e->getMessage() . "\n");
}
