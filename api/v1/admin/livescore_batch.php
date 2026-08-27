<?php
// POST /v1/admin/livescore-batch — stav viacerych zapasov naraz
// Telo: { "urls": ["https://...", ...], "model": "..." (volitelne) }
//
// Pouziva rovnaky postup ako ostra prevadzka pre UCL: jeden hromadny feed
// z Flashscore a jedno volanie modelu bez ohladu na pocet zapasov.
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
require_once __DIR__ . '/../../helpers/livescore_bulk_fn.php';

$body  = json_decode(file_get_contents('php://input'), true) ?: [];
$model = trim((string)($body['model'] ?? ''))
      ?: (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'minimax/minimax-m3:free');

$urls = $body['urls'] ?? [];
if (!is_array($urls) || !$urls) json_error('Chýbajú adresy zápasov', 400);
if (count($urls) > 30) json_error('Naraz sa dá sledovať najviac 30 zápasov', 400);

// Kazda adresa sa overi a prelozi na id zapasu vo feede.
$byId = [];
foreach ($urls as $u) {
    $u = trim((string)$u);
    if ($u === '') continue;
    livescore_check_url($u);
    $id = livescore_match_id($u);
    if ($id === null) json_error("Z adresy sa nedá zistiť id zápasu: $u", 400);
    $byId[$id] = $u;
}
if (!$byId) json_error('Chýbajú adresy zápasov', 400);

$startedAt = microtime(true);
$res = livescore_bulk_check(array_keys($byId), $model);
$took = (int)round((microtime(true) - $startedAt) * 1000);

if (!$res['ok']) json_error('Livescore: ' . ($res['error'] ?? 'neznáma chyba'), 502);

// Docasny zaznamnik — sluzi na rozhodnutie, ktore udaje ukladat natrvalo.
$logError = null;
$num = static fn($v) => is_numeric($v) ? (int)$v : null;
$txt = static fn($v) => (is_string($v) || is_numeric($v)) ? mb_substr((string)$v, 0, 100) : null;
$boo = static fn($v) => is_bool($v) ? ($v ? 't' : 'f') : null;

try {
    $pdo = db();
    $ins = $pdo->prepare('INSERT INTO admin.livescore_log
        (url, match_id, model, home_team, away_team, competition,
         started, finished, minute, minute_note, period, status,
         home_score, away_score, home_score_halftime, away_score_halftime,
         home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards,
         start_time_text, notes, raw, tokens, took_ms)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');

    // Tokeny aj cas patria celemu volaniu, preto sa delia medzi zapasy.
    $count   = max(count($res['games']), 1);
    $tokens  = isset($res['usage']['total_tokens']) ? (int)round($res['usage']['total_tokens'] / $count) : null;
    $perGame = (int)round($took / $count);

    foreach ($res['games'] as $id => $d) {
        if (!is_array($d)) continue;
        $ins->execute([
            mb_substr($byId[$id] ?? '', 0, 500), $id, mb_substr($model, 0, 100),
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
            $tokens, $perGame,
        ]);
    }
} catch (Throwable $e) {
    $logError = $e->getMessage();
}

// Vysledok sa vracia indexovany podla adresy, aby si ho rozhranie priradilo.
$out = [];
foreach ($byId as $id => $url) {
    $out[$url] = $res['games'][$id] ?? null;
}

json_ok([
    'model'      => $model,
    'usage'      => $res['usage'] ?? null,
    'took_ms'    => $took,
    'total_feed' => $res['total_feed'] ?? null,
    'missing'    => $res['missing'] ?? [],
    'results'    => $out,
    'log_error'  => $logError,
]);
