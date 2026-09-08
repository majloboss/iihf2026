<?php
// GET /v1/admin/livescore-naklady2
//
// Naklady po ZAPASOCH. Jeden riadok = jeden zapas obsluzeny jednym modelom,
// takze ked sa model pocas zapasu zmenil, zapas ma viac riadkov.
//
// Podla filtra sa da zistit, kolko stal den, konkretny zapas alebo model —
// sumar nad tabulkou plati vzdy pre prave vyfiltrovane riadky.
//
// Filtre (vsetky nepovinne):
//   competition_id  sutaz; 'test' = testovacie volania
//   game            zapas (game_id alebo cast url)
//   model           model
//   od, do          hraci den (YYYY-MM-DD)

require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();

$kde = [];
$par = [];

// Sutaz, alebo testovacie volania. Test nie je sutaz, ale z pohladu
// nakladov je to rovnocenna polozka filtra.
$sutaz = $_GET['competition_id'] ?? '';
if ($sutaz === 'test') {
    $kde[] = "l.call_type = 'test'";
} elseif ($sutaz !== '') {
    $kde[] = 'l.competition_id = ? AND l.call_type = \'live\'';
    $par[] = (int)$sutaz;
}

if (!empty($_GET['game'])) {
    $kde[] = '(l.game_id::text = ? OR l.url ILIKE ?)';
    $par[] = trim((string)$_GET['game']);
    $par[] = '%' . trim((string)$_GET['game']) . '%';
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

// ------------------------------------------------------------
// Riadky: zapas x model
//
// Zapas identifikuje game_id, a ked chyba (testovacie volania bezia na
// cudzom zapase), tak url. Nazvy timov sa beru ako NAJCASTEJSIE, nie
// posledne — model, ktory si timy vymyslel, by inak prepisal spravny nazov.
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT COALESCE(l.game_id::text, l.url) AS kluc,
            MAX(l.game_id)                    AS game_id,
            MAX(l.url)                        AS url,
            MAX(l.call_type)                  AS typ,
            MAX(c.name)                       AS sutaz,
            MIN(l.checked_at)::date           AS hraci_den,
            mode() WITHIN GROUP (ORDER BY l.home_team)
                FILTER (WHERE l.home_team IS NOT NULL) AS domaci,
            mode() WITHIN GROUP (ORDER BY l.away_team)
                FILTER (WHERE l.away_team IS NOT NULL) AS hostia,
            l.model,
            COUNT(*)                          AS volani,
            COUNT(*) FILTER (WHERE l.success) AS uspesnych,
            -- Minuty zapasu, ktore livescore pokrylo: od prveho po posledne
            -- volanie. Nie je to dlzka zapasu, ale ako dlho sme ho sledovali.
            ROUND(EXTRACT(EPOCH FROM (MAX(l.checked_at) - MIN(l.checked_at))) / 60)::int
                                              AS minut,
            COALESCE(SUM(l.prompt_tokens), 0)     AS vstup,
            COALESCE(SUM(l.completion_tokens), 0) AS vystup,
            COALESCE(SUM(l.tokens), 0)        AS tokenov,
            COALESCE(SUM(l.cost_usd), 0)      AS cena,
            MAX(l.checked_at)                 AS posledne
       FROM admin.livescore_log l
       LEFT JOIN admin.competitions c ON c.id = l.competition_id
       $where
      GROUP BY COALESCE(l.game_id::text, l.url), l.model
      ORDER BY MAX(l.checked_at) DESC
      LIMIT 300");
$st->execute($par);
$riadky = [];

foreach ($st->fetchAll() as $r) {
    $tokenov = (int)$r['tokenov'];
    $cena    = (float)$r['cena'];

    $riadky[] = [
        'kluc'       => $r['kluc'],
        'game_id'    => $r['game_id'] !== null ? (int)$r['game_id'] : null,
        'url'        => $r['url'],
        'typ'        => $r['typ'],
        'sutaz'      => $r['typ'] === 'test' ? 'TEST' : ($r['sutaz'] ?? '—'),
        'hraci_den'  => $r['hraci_den'],
        'zapas'      => $r['domaci']
                        ? $r['domaci'] . ' — ' . ($r['hostia'] ?? '?')
                        : ($r['game_id'] ? '#' . $r['game_id'] : '(neznámy)'),
        'model'      => $r['model'],
        'volani'     => (int)$r['volani'],
        'uspesnych'  => (int)$r['uspesnych'],
        'minut'      => (int)$r['minut'],
        'tokenov'    => $tokenov,
        'cena'       => round($cena, 6),
        // Prepocet na milion tokenov — porovnatelne naprie modelmi bez
        // ohladu na to, kolko volani zapas mal.
        'cena_1m'    => $tokenov > 0 ? round($cena / $tokenov * 1000000, 4) : null,
        'posledne'   => $r['posledne'],
    ];
}

// ------------------------------------------------------------
// Sumar pre prave vyfiltrovane riadky
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT COUNT(*)                              AS volani,
            COUNT(*) FILTER (WHERE l.success)     AS uspesnych,
            COUNT(DISTINCT COALESCE(l.game_id::text, l.url)) AS zapasov,
            COUNT(DISTINCT l.model)               AS modelov,
            COUNT(DISTINCT l.checked_at::date)    AS dni,
            COALESCE(SUM(l.tokens), 0)            AS tokenov,
            COALESCE(SUM(l.cost_usd), 0)          AS cena
       FROM admin.livescore_log l $where");
$st->execute($par);
$s = $st->fetch();

$tokenov = (int)$s['tokenov'];
$cena    = (float)$s['cena'];
$zapasov = (int)$s['zapasov'];

// ------------------------------------------------------------
// Ciselniky pre filtre
// ------------------------------------------------------------
$sutaze = $pdo->query(
    'SELECT id, name FROM admin.competitions WHERE is_active ORDER BY id')->fetchAll();
$modely = $pdo->query(
    "SELECT DISTINCT model FROM admin.livescore_log
      WHERE model IS NOT NULL AND model <> '' ORDER BY model")->fetchAll(PDO::FETCH_COLUMN);

// Zapasy do filtra — pomenovane, aby sa dali vybrat zo zoznamu
$zapasyFilter = $pdo->query(
    "SELECT COALESCE(game_id::text, url) AS kluc,
            COALESCE(
                mode() WITHIN GROUP (ORDER BY home_team) FILTER (WHERE home_team IS NOT NULL)
                  || ' — ' ||
                mode() WITHIN GROUP (ORDER BY away_team) FILTER (WHERE away_team IS NOT NULL),
                '#' || MAX(game_id)::text, '(neznámy)') AS nazov,
            MAX(checked_at)::date AS den
       FROM admin.livescore_log
      GROUP BY COALESCE(game_id::text, url)
      ORDER BY MAX(checked_at) DESC LIMIT 60")->fetchAll();

json_ok([
    'riadky' => $riadky,
    'sumar'  => [
        'volani'      => (int)$s['volani'],
        'uspesnych'   => (int)$s['uspesnych'],
        'zapasov'     => $zapasov,
        'modelov'     => (int)$s['modelov'],
        'dni'         => (int)$s['dni'],
        'tokenov'     => $tokenov,
        'cena'        => round($cena, 6),
        'cena_1m'     => $tokenov > 0 ? round($cena / $tokenov * 1000000, 4) : null,
        'cena_zapas'  => $zapasov > 0 ? round($cena / $zapasov, 6) : null,
    ],
    'filtre' => ['sutaze' => $sutaze, 'modely' => $modely, 'zapasy' => $zapasyFilter],
]);
