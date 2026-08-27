<?php
// POST /v1/admin/livescore-test — zistenie stavu zapasu z URL cez OpenRouter
// Telo: { "url": "https://www.flashscore.com/match/...", "model": "..." (volitelne) }
//
// Stranka sa stiahne na serveri a jej obsah sa posle modelu, ktory z neho vytiahne
// stav zapasu. Model je pouzity zamerne — vie sa zorientovat aj ked sa struktura
// stranky zmeni, na rozdiel od pevneho parsera.
require_auth(true);
if ($method !== 'POST') json_error('Method not allowed', 405);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) {
    json_error('Chýba api/config/openrouter.php — skopíruj openrouter.example.php a doplň kľúč', 500);
}
require_once $cfg;
if (!defined('OPENROUTER_KEY') || !str_starts_with(OPENROUTER_KEY, 'sk-or-')) {
    json_error('V openrouter.php nie je platný kľúč', 500);
}
require_once __DIR__ . '/../../helpers/livescore_fn.php';

$body  = json_decode(file_get_contents('php://input'), true) ?: [];
$url   = trim((string)($body['url'] ?? ''));
$model = trim((string)($body['model'] ?? ''))
      ?: (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'google/gemma-4-31b-it:free');

if ($url === '') json_error('Chýba URL', 400);
livescore_check_url($url);

$page = livescore_fetch_page($url);
$res  = livescore_ask_model($page['input'], $model);

if ($res['error'] !== null) json_error('OpenRouter: ' . $res['error'], 502);

json_ok([
    'url'        => $url,
    'http_code'  => $page['http_code'],
    'model'      => $model,
    'usage'      => $res['usage'],
    'data'       => $res['data'],
    'raw'        => $res['data'] === null ? $res['content'] : null,
    'page_chars' => $page['chars'],
]);
