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

$started = microtime(true);
$page = livescore_fetch_page($url);
$res  = livescore_ask_model($page['input'], $model);
$took = (int)round((microtime(true) - $started) * 1000);

if ($res['error'] !== null) json_error('OpenRouter: ' . $res['error'], 502);

// Docasny zaznamnik — sluzi na rozhodnutie, ktore udaje ukladat natrvalo.
// Model musi vratit objekt s pomenovanymi polami, nie pole ani nic ine.
$d = is_array($res['data']) && !isset($res['data'][0]) ? $res['data'] : null;
if ($d !== null) {
    $num = static fn($v) => is_numeric($v) ? (int)$v : null;
    $txt = static fn($v) => (is_string($v) || is_numeric($v)) ? mb_substr((string)$v, 0, 100) : null;
    $boo = static fn($v) => is_bool($v) ? $v : null;
    try {
        $pdo = db();
        $pdo->prepare('INSERT INTO admin.livescore_log
            (url, match_id, model, home_team, away_team, competition,
             started, finished, minute, minute_note, period, status,
             home_score, away_score, home_score_halftime, away_score_halftime,
             home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards,
             start_time_text, notes, raw, tokens, took_ms)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([
                mb_substr($url, 0, 500), $page['match_id'] ?? null, mb_substr($model, 0, 100),
                $txt($d['home_team'] ?? null), $txt($d['away_team'] ?? null), $txt($d['competition'] ?? null),
                $boo($d['started'] ?? null), $boo($d['finished'] ?? null),
                $num($d['minute'] ?? null), $txt($d['minute_note'] ?? null),
                $txt($d['period'] ?? null), $txt($d['status'] ?? null),
                $num($d['home_score'] ?? null), $num($d['away_score'] ?? null),
                $num($d['home_score_halftime'] ?? null), $num($d['away_score_halftime'] ?? null),
                $num($d['home_yellow_cards'] ?? null), $num($d['away_yellow_cards'] ?? null),
                $num($d['home_red_cards'] ?? null), $num($d['away_red_cards'] ?? null),
                $txt($d['start_time'] ?? null),
                is_string($d['notes'] ?? null) ? $d['notes'] : null,
                json_encode($d, JSON_UNESCAPED_UNICODE),
                $res['usage']['total_tokens'] ?? null, $took,
            ]);
    } catch (Throwable $e) {
        // Zaznamnik je pomocny — jeho zlyhanie nesmie zhodit zistovanie stavu.
    }
}

json_ok([
    'url'        => $url,
    'http_code'  => $page['http_code'],
    'model'      => $model,
    'usage'      => $res['usage'],
    'data'       => $res['data'],
    'raw'        => $res['data'] === null ? $res['content'] : null,
    'page_chars' => $page['chars'],
    'took_ms'    => $took,
]);
