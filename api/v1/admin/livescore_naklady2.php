<?php
// GET /v1/admin/livescore-naklady2
//
// Naklady po ZAPASOCH. Jedno volanie modelu sa pyta na vsetky zapasy naraz,
// takze cena sa medzi ne rozpocitava: kazdy zapas dostane podiel z volani,
// ktore ho sledovali, deleny poctom zapasov v tom volani prave beziacich.
//
// Zapasy pred vykopom a po konci sa do delenia nepocitaju — vo feede su tiez,
// ale hodnotu neprinasaju a inak by vecerny zapas platil aj za ne.
//
// Riadok = zapas x model. Ked sa model pocas zapasu zmenil, zapas ma viac
// riadkov a vidno, kolko stala ktora cast.
//
// Filtre: competition_id ('test' = testovacie volania), game (game_id),
//         model, od, do (hraci den)

require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();

$sutaz = $_GET['competition_id'] ?? '';
$jeTest = ($sutaz === 'test');

$kde = [];
$par = [];

if ($jeTest) {
    $kde[] = "l.call_type = 'test'";
} else {
    $kde[] = "l.call_type = 'live'";
    if ($sutaz !== '') {
        $kde[] = 'l.competition_id = ?';
        $par[] = (int)$sutaz;
    }
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

$where = 'WHERE ' . implode(' AND ', $kde);

// ------------------------------------------------------------
// Riadky
//
// Ostre volania sa rozlozia na jednotlive zapasy (UNNEST live_ids) a cena sa
// deli poctom prave beziacich. Testovacie volania zapasy nemaju — tie zostavaju
// zhruknute pod nazvom timov, ktore model vratil.
// ------------------------------------------------------------
$filterZapas = '';
if (!empty($_GET['game'])) {
    $filterZapas = ' AND p.game_id = ' . (int)$_GET['game'];
}

if ($jeTest) {
    // Testy: zoskupenie podla url zapasu, na ktorom test bezal.
    $sql = "SELECT NULL::int AS game_id,
                   COALESCE(
                       MODE() WITHIN GROUP (ORDER BY l.home_team)
                           FILTER (WHERE l.home_team IS NOT NULL) || ' — ' ||
                       MODE() WITHIN GROUP (ORDER BY l.away_team)
                           FILTER (WHERE l.away_team IS NOT NULL),
                       '(neznámy)')            AS zapas,
                   NULL::timestamp             AS zaciatok,
                   l.url                       AS url,
                   l.model,
                   MIN(l.checked_at)::date     AS hraci_den,
                   COUNT(*)                    AS volani,
                   COUNT(*) FILTER (WHERE l.success) AS uspesnych,
                   COALESCE(SUM(l.tokens), 0)  AS tokenov,
                   COALESCE(SUM(l.cost_usd), 0) AS cena,
                   ROUND(EXTRACT(EPOCH FROM (MAX(l.checked_at) - MIN(l.checked_at)))/60)::int AS minut,
                   MAX(l.checked_at)           AS posledne
              FROM admin.livescore_log l
              $where
             GROUP BY l.url, l.model
             ORDER BY MAX(l.checked_at) DESC
             LIMIT 300";
} else {
    $sql = "WITH podiely AS (
                SELECT UNNEST(l.live_ids) AS game_id,
                       l.model,
                       l.checked_at,
                       l.success,
                       l.cost_usd / GREATEST(ARRAY_LENGTH(l.live_ids, 1), 1) AS podiel,
                       l.tokens::numeric / GREATEST(ARRAY_LENGTH(l.live_ids, 1), 1) AS tok
                  FROM admin.livescore_log l
                  $where
                   AND l.live_ids IS NOT NULL
            )
            SELECT p.game_id,
                   COALESCE(hc.club_name || ' — ' || ac.club_name,
                            '#' || p.game_id::text) AS zapas,
                   g.start_time                 AS zaciatok,
                   g.flashscore_url             AS url,
                   p.model,
                   MIN(p.checked_at)::date      AS hraci_den,
                   COUNT(*)                     AS volani,
                   COUNT(*) FILTER (WHERE p.success) AS uspesnych,
                   ROUND(SUM(p.tok))            AS tokenov,
                   SUM(p.podiel)                AS cena,
                   ROUND(EXTRACT(EPOCH FROM (MAX(p.checked_at) - MIN(p.checked_at)))/60)::int AS minut,
                   MAX(p.checked_at)            AS posledne
              FROM podiely p
              LEFT JOIN \"lm2026-27\".games g ON g.game_id = p.game_id
              LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
              LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
             WHERE TRUE $filterZapas
             GROUP BY p.game_id, hc.club_name, ac.club_name, g.start_time,
                      g.flashscore_url, p.model
             ORDER BY g.start_time DESC NULLS LAST, p.game_id, p.model
             LIMIT 300";
}

$st = $pdo->prepare($sql);
$st->execute($par);

$riadky = [];
foreach ($st->fetchAll() as $r) {
    $tokenov = (int)$r['tokenov'];
    $cena    = (float)$r['cena'];

    $riadky[] = [
        'game_id'   => $r['game_id'] !== null ? (int)$r['game_id'] : null,
        'kluc'      => ($r['game_id'] !== null ? 'g' . $r['game_id'] : 'u' . md5((string)$r['url'])),
        'zapas'     => $r['zapas'],
        'zaciatok'  => $r['zaciatok'],
        'url'       => $r['url'],
        'typ'       => $jeTest ? 'test' : 'live',
        'hraci_den' => $r['hraci_den'],
        'model'     => $r['model'],
        'volani'    => (int)$r['volani'],
        'uspesnych' => (int)$r['uspesnych'],
        'minut'     => (int)$r['minut'],
        'tokenov'   => $tokenov,
        'cena'      => round($cena, 6),
        'cena_1m'   => $tokenov > 0 ? round($cena / $tokenov * 1000000, 4) : null,
        'posledne'  => $r['posledne'],
    ];
}

// ------------------------------------------------------------
// Sumar pre vyfiltrovane riadky
//
// Pocita sa z riadkov, nie zvlast z logu: po rozpocitani by samostatny dotaz
// nad volaniami dal iny sucet nez to, co je v tabulke.
// ------------------------------------------------------------
$cenaSpolu = 0.0;
$tokSpolu  = 0;
$volania   = 0;
$uspesnych = 0;
$zapasy    = [];
$modely    = [];
$dni       = [];

foreach ($riadky as $r) {
    $cenaSpolu += $r['cena'];
    $tokSpolu  += $r['tokenov'];
    $volania   += $r['volani'];
    $uspesnych += $r['uspesnych'];
    $zapasy[$r['kluc']]     = true;
    $modely[$r['model']]    = true;
    $dni[$r['hraci_den']]   = true;
}

$poctZapasov = count($zapasy);

// ------------------------------------------------------------
// Ciselniky pre filtre
// ------------------------------------------------------------
$sutaze = $pdo->query(
    'SELECT id, name FROM admin.competitions WHERE is_active ORDER BY id')->fetchAll();

$modelyFilter = $pdo->query(
    "SELECT DISTINCT model FROM admin.livescore_log
      WHERE model IS NOT NULL AND model <> '' ORDER BY model")
    ->fetchAll(PDO::FETCH_COLUMN);

// Zapasy do filtra sa beru zo zapasov, ktore livescore naozaj sledovalo —
// nie z nazvov v logu. Tam boli aj cudzie zapasy z testovania.
$zapasyFilter = $pdo->query(
    "SELECT DISTINCT g.game_id,
            hc.club_name || ' — ' || ac.club_name AS nazov,
            g.start_time::date AS den
       FROM admin.livescore_log l
       JOIN \"lm2026-27\".games g ON g.game_id = ANY(l.live_ids)
       LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
       LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
      WHERE l.live_ids IS NOT NULL
      ORDER BY g.start_time::date DESC, g.game_id
      LIMIT 100")->fetchAll();

json_ok([
    'riadky' => $riadky,
    'sumar'  => [
        'volani'     => $volania,
        'uspesnych'  => $uspesnych,
        'zapasov'    => $poctZapasov,
        'modelov'    => count($modely),
        'dni'        => count($dni),
        'tokenov'    => $tokSpolu,
        'cena'       => round($cenaSpolu, 6),
        'cena_1m'    => $tokSpolu > 0 ? round($cenaSpolu / $tokSpolu * 1000000, 4) : null,
        'cena_zapas' => $poctZapasov > 0 ? round($cenaSpolu / $poctZapasov, 6) : null,
    ],
    'filtre' => [
        'sutaze' => $sutaze,
        'modely' => $modelyFilter,
        'zapasy' => $zapasyFilter,
    ],
]);
