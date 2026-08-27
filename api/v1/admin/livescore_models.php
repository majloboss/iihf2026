<?php
// GET  /v1/admin/livescore-models — zoznam bezplatnych modelov na OpenRouteri
// POST /v1/admin/livescore-models — otestuje jeden model na zadanej URL
//     Telo: { "url": "...", "model": "google/gemma-4-31b-it:free" }
//
// Testuje sa po jednom modeli, nie vsetky naraz — bezplatne modely maju limity
// na pocet poziadaviek za minutu a jedno dlhe volanie by casovo nevyslo.
require_auth(true);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) {
    json_error('Chýba api/config/openrouter.php — skopíruj openrouter.example.php a doplň kľúč', 500);
}
require_once $cfg;
require_once __DIR__ . '/../../helpers/livescore_fn.php';

if ($method === 'GET') {
    $ch = curl_init('https://openrouter.ai/api/v1/models');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . OPENROUTER_KEY],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$resp) json_error("Zoznam modelov sa nepodarilo načítať (HTTP $code)", 502);

    $all = json_decode($resp, true)['data'] ?? [];
    $free = [];
    foreach ($all as $m) {
        if (!str_ends_with($m['id'] ?? '', ':free')) continue;
        $free[] = [
            'id'      => $m['id'],
            'name'    => $m['name'] ?? $m['id'],
            'context' => $m['context_length'] ?? null,
        ];
    }
    usort($free, fn($a, $b) => ($b['context'] ?? 0) <=> ($a['context'] ?? 0));
    json_ok(['models' => $free]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body  = json_decode(file_get_contents('php://input'), true) ?: [];
$url   = trim((string)($body['url'] ?? ''));
$model = trim((string)($body['model'] ?? ''));

if ($url === '' || $model === '') json_error('Chýba url alebo model', 400);
livescore_check_url($url);

$started = microtime(true);
$page = livescore_fetch_page($url);
$res  = livescore_ask_model($page['input'], $model);
$took = round((microtime(true) - $started) * 1000);

json_ok([
    'model'     => $model,
    'ok'        => $res['data'] !== null,
    'data'      => $res['data'],
    'raw'       => $res['data'] === null ? mb_substr($res['content'], 0, 400) : null,
    'error'     => $res['error'],
    'usage'     => $res['usage'],
    'ms'        => $took,
]);
