<?php
// Test modelov na skutocnom zapase.
//
// GET  /v1/admin/livescore-test-run              zoznam kandidatov a poslednych testov
// POST /v1/admin/livescore-test-run              stiahne stranku, vrati obsah a zoznam modelov
//      Telo: { "url": "...", "competition_id": 5, "limit": 15 }
// POST /v1/admin/livescore-test-run?step=1       otestuje JEDEN model
//      Telo: { "url": "...", "model": "...", "competition_id": 5, "sport": "futbal" }
//
// Modely sa volaju po jednom — bezplatne maju limit poziadaviek za minutu
// a jedno dlhe volanie so vsetkymi by casovo nevyslo.
//
// Kazdy test = zaznam v admin.livescore_log s call_type='test'. Testovacie
// volania sa neratajú do nakladov sutaze, ale ich cena je vidiet.

$auth = require_auth(true);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) json_error('Chýba api/config/openrouter.php', 500);
require_once $cfg;
require_once __DIR__ . '/../../helpers/ai_models_fn.php';
require_once __DIR__ . '/../../helpers/livescore_fn.php';
require_once __DIR__ . '/../../helpers/livescore_test_fn.php';

$pdo = db();

// ------------------------------------------------------------
// GET — kandidati a posledne testy
// ------------------------------------------------------------
if ($method === 'GET') {
    $limit = min(40, max(1, (int)($_GET['limit'] ?? 15)));

    $kandidati = array_map(static fn($m) => [
        'model_id'     => $m['model_id'],
        'name'         => $m['name'],
        'is_free'      => in_array($m['is_free'], [true, 't', '1', 1], true),
        'cena_1m'      => round((float)($m['price_input_1m'] ?? 0)
                              + (float)($m['price_output_1m'] ?? 0), 4),
        'success_rate' => $m['success_rate'] !== null ? (float)$m['success_rate'] : null,
        'tests_total'  => (int)$m['tests_total'],
    ], ai_kandidati($limit));

    $st = $pdo->prepare(
        "SELECT t.tested_at, t.model_key, t.sport, t.passed,
                t.got_score, t.got_period, t.got_minute,
                t.total_tokens, t.cost_usd, t.took_ms, t.error, t.test_url
           FROM admin.livescore_model_test t
          ORDER BY t.tested_at DESC LIMIT 60");
    $st->execute();

    // suhrn nakladov na testy
    $suhrn = $pdo->query(
        "SELECT COUNT(*) AS volani,
                COUNT(*) FILTER (WHERE success) AS uspesnych,
                COALESCE(SUM(tokens), 0)    AS tokenov,
                COALESCE(SUM(cost_usd), 0)  AS cena
           FROM admin.livescore_log
          WHERE call_type = 'test'")->fetch();

    json_ok([
        'kandidati' => $kandidati,
        'testy'     => $st->fetchAll(),
        'suhrn'     => [
            'volani'    => (int)$suhrn['volani'],
            'uspesnych' => (int)$suhrn['uspesnych'],
            'tokenov'   => (int)$suhrn['tokenov'],
            'cena_usd'  => round((float)$suhrn['cena'], 6),
        ],
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];

// Vyhodnotenie zhody nepotrebuje URL, preto je pred jej kontrolou.
if (($_GET['zhoda'] ?? '') === '1') {
    $runId = (int)($body['run_id'] ?? 0);
    if ($runId === 0) json_error('Chýba run_id', 400);

    [$skore, $zhodlo, $spolu, $timy] = ls_vyhodnot_zhodu($runId);

    // Rozpad skore: na com sa modely zhodli a na com nie. Ked je najsilnejsia
    // zhoda slaba, vysledok netreba brat vazne ani od vitaza.
    $st = $pdo->prepare(
        "SELECT score_text, COUNT(*) AS modelov,
                string_agg(model_key, ', ' ORDER BY model_key) AS ktore
           FROM admin.livescore_model_test
          WHERE run_id = ? AND passed AND score_text IS NOT NULL
          GROUP BY score_text ORDER BY COUNT(*) DESC");
    $st->execute([$runId]);
    $rozpad = $st->fetchAll();

    // Modely, ktore si vymyslel ine timy nez vacsina
    $st = $pdo->prepare(
        "SELECT model_key, teams_text FROM admin.livescore_model_test
          WHERE run_id = ? AND teams_agree = FALSE");
    $st->execute([$runId]);
    $halucinacie = $st->fetchAll();

    json_ok([
        'najcastejsie_skore' => $skore,
        'zhodlo_sa'          => $zhodlo,
        's_vysledkom'        => $spolu,
        'timy'               => $timy,
        'rozpad_skore'       => $rozpad,
        'halucinacie'        => $halucinacie,
    ]);
}

$url = trim((string)($body['url'] ?? ''));
if ($url === '') json_error('Chýba URL zápasu', 400);
livescore_check_url($url);

$competitionId = isset($body['competition_id']) && $body['competition_id']
               ? (int)$body['competition_id'] : null;

// ------------------------------------------------------------
// POST ?step=1 — otestuj jeden model
// ------------------------------------------------------------
if (($_GET['step'] ?? '') === '1') {
    $modelKey = trim((string)($body['model'] ?? ''));
    if ($modelKey === '') json_error('Chýba model', 400);

    $st = $pdo->prepare('SELECT * FROM admin.ai_models WHERE model_id = ?');
    $st->execute([$modelKey]);
    $model = $st->fetch();
    if (!$model) json_error('Model nie je v číselníku', 404);

    $page  = livescore_fetch_page($url);
    $sport = isset($body['sport']) ? trim((string)$body['sport']) : 'neznámy';

    $runId = isset($body['run_id']) ? (int)$body['run_id'] : null;

    $v = ls_test_model($model, $page['input'], $url, $sport);
    ls_zapis_test($v, $url, $competitionId, $sport, $runId);

    json_ok(['vysledok' => [
        'model'        => $v['model'],
        'passed'       => $v['passed'],
        'got_score'    => $v['got_score'],
        'got_period'   => $v['got_period'],
        'got_minute'   => $v['got_minute'],
        'error'        => $v['error'],
        'took_ms'      => $v['took_ms'],
        'total_tokens' => $v['total_tokens'],
        'cost_usd'     => round($v['cost_usd'], 6),
        'score_text'   => $v['score_text'],
        'data'         => $v['data'],
    ]]);
}

// ------------------------------------------------------------
// POST — priprav test: stiahni stranku a vrat zoznam modelov
// ------------------------------------------------------------
$limit  = min(40, max(1, (int)($body['limit'] ?? 15)));
$modely = array_column(ai_kandidati($limit), 'model_id');
if (!$modely) json_error('V číselníku nie je žiadny použiteľný model', 400);

$page = livescore_fetch_page($url);

// Beh dostane vlastne id, aby sa dala vyhodnotit zhoda medzi modelmi.
// Zoskupovanie podla casu by bolo krehke — dva behy tesne po sebe by splynuli.
$runId = (int)$pdo->query(
    "SELECT COALESCE(MAX(run_id), 0) + 1 FROM admin.livescore_model_test")->fetchColumn();

json_ok([
    'run_id'      => $runId,
    'url'         => $url,
    'match_id'    => $page['match_id'] ?? null,
    'input_chars' => mb_strlen($page['input']),
    'modely'      => $modely,
    'ukazka'      => mb_substr($page['input'], 0, 1200),
]);
