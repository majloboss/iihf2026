<?php
// GET /v1/admin/livescore-naklady
//
// Prehlad nakladov na livescore s filtrami. Prvy riadok je sumarizacia
// vyfiltrovaneho, potom zoznam volani a naklady po dnoch.
//
// Filtre (vsetky nepovinne):
//   competition_id  sutaz
//   game_id         zapas
//   model           model
//   od, do          datum (YYYY-MM-DD)
//   call_type       'live' (predvolene) | 'test' | 'vsetko'
//   limit           pocet riadkov, max 500

require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();

$kde = [];
$par = [];

// Testovacie volania sa predvolene neukazuju — skreslovali by naklady sutaze.
$typ = $_GET['call_type'] ?? 'live';
if ($typ !== 'vsetko') {
    $kde[] = 'l.call_type = ?';
    $par[] = $typ === 'test' ? 'test' : 'live';
}

if (!empty($_GET['competition_id'])) {
    $kde[] = 'l.competition_id = ?';
    $par[] = (int)$_GET['competition_id'];
}
if (!empty($_GET['game_id'])) {
    $kde[] = 'l.game_id = ?';
    $par[] = (int)$_GET['game_id'];
}
if (!empty($_GET['model'])) {
    $kde[] = 'l.model = ?';
    $par[] = trim((string)$_GET['model']);
}
if (!empty($_GET['od'])) {
    $kde[] = 'l.checked_at >= ?::date';
    $par[] = $_GET['od'];
}
if (!empty($_GET['do'])) {
    $kde[] = 'l.checked_at < (?::date + 1)';
    $par[] = $_GET['do'];
}

$where = $kde ? ('WHERE ' . implode(' AND ', $kde)) : '';
$limit = min(500, max(10, (int)($_GET['limit'] ?? 100)));

// ------------------------------------------------------------
// Sumarizacia vyfiltrovaneho — prvy riadok obrazovky
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT COUNT(*)                              AS volani,
            COUNT(*) FILTER (WHERE l.success)     AS uspesnych,
            COUNT(DISTINCT l.model)               AS modelov,
            COUNT(DISTINCT l.game_id)             AS zapasov,
            COALESCE(SUM(l.prompt_tokens), 0)     AS vstup,
            COALESCE(SUM(l.completion_tokens), 0) AS vystup,
            COALESCE(SUM(l.tokens), 0)            AS tokenov,
            COALESCE(SUM(l.cost_usd), 0)          AS cena,
            MIN(l.checked_at)                     AS od,
            MAX(l.checked_at)                     AS do
       FROM admin.livescore_log l $where");
$st->execute($par);
$suhrn = $st->fetch();

// ------------------------------------------------------------
// Zoznam volani
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT l.id, l.checked_at, l.call_type, l.model, l.game_id,
            c.name AS sutaz,
            l.home_team, l.away_team, l.home_score, l.away_score,
            l.period, l.minute, l.success, l.error,
            l.prompt_tokens, l.completion_tokens, l.tokens, l.cost_usd, l.took_ms,
            l.url
       FROM admin.livescore_log l
       LEFT JOIN admin.competitions c ON c.id = l.competition_id
       $where
      ORDER BY l.checked_at DESC
      LIMIT $limit");
$st->execute($par);
$volania = $st->fetchAll();

// ------------------------------------------------------------
// Naklady po dnoch — podklad pre graf
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT l.checked_at::date          AS den,
            COUNT(*)                    AS volani,
            COALESCE(SUM(l.cost_usd), 0) AS cena,
            COALESCE(SUM(l.tokens), 0)   AS tokenov
       FROM admin.livescore_log l $where
      GROUP BY 1 ORDER BY 1 DESC LIMIT 60");
$st->execute($par);
$poDnoch = $st->fetchAll();

// ------------------------------------------------------------
// Naklady podla modelu
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT l.model,
            COUNT(*)                          AS volani,
            COUNT(*) FILTER (WHERE l.success) AS uspesnych,
            COALESCE(SUM(l.cost_usd), 0)      AS cena,
            ROUND(AVG(l.took_ms))             AS priemer_ms
       FROM admin.livescore_log l $where
      GROUP BY l.model ORDER BY SUM(l.cost_usd) DESC NULLS LAST LIMIT 30");
$st->execute($par);
$poModeloch = $st->fetchAll();

// ------------------------------------------------------------
// Ciselniky pre filtre
// ------------------------------------------------------------
$sutaze = $pdo->query(
    'SELECT id, name FROM admin.competitions WHERE is_active ORDER BY id')->fetchAll();
$modely = $pdo->query(
    "SELECT DISTINCT model FROM admin.livescore_log
      WHERE model IS NOT NULL ORDER BY model")->fetchAll(PDO::FETCH_COLUMN);

json_ok([
    'suhrn' => [
        'volani'    => (int)$suhrn['volani'],
        'uspesnych' => (int)$suhrn['uspesnych'],
        'modelov'   => (int)$suhrn['modelov'],
        'zapasov'   => (int)$suhrn['zapasov'],
        'vstup'     => (int)$suhrn['vstup'],
        'vystup'    => (int)$suhrn['vystup'],
        'tokenov'   => (int)$suhrn['tokenov'],
        'cena_usd'  => round((float)$suhrn['cena'], 6),
        'od'        => $suhrn['od'],
        'do'        => $suhrn['do'],
    ],
    'volania'     => $volania,
    'po_dnoch'    => $poDnoch,
    'po_modeloch' => $poModeloch,
    'filtre'      => ['sutaze' => $sutaze, 'modely' => $modely],
]);
