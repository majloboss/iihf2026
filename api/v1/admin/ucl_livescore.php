<?php
// GET  /v1/admin/ucl-livescore — prehlad dnesnych zapasov a ich zivy stav
// POST /v1/admin/ucl-livescore — zisti stav a zapise ho do ls_* stlpcov
//
// Samotne stiahnutie je v helpers/ucl_livescore_fn.php, aby ho vedel volat
// aj cron. Tu zostava iba overenie prav a odpoved.
require_auth(true);
$pdo = db();

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) {
    json_error('Chýba api/config/openrouter.php — skopíruj openrouter.example.php a doplň kľúč', 500);
}
require_once $cfg;
require_once __DIR__ . '/../../helpers/ucl_livescore_fn.php';

$games = ucl_livescore_games($pdo);

if ($method === 'GET') {
    json_ok([
        'games'    => $games,
        'with_url' => count(array_filter($games, fn($g) => !empty($g['flashscore_url']))),
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$res = ucl_livescore_refresh($pdo, $games);
if (isset($res['error'])) json_error('Livescore: ' . $res['error'], 502);

json_ok($res);
