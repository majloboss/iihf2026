<?php
// GET /v1/admin/livescore-cena-zapasov
//
// Kolko stal ktory zapas. Jedno volanie modelu obsluzi viac zapasov naraz,
// takze cena sa medzi ne rozpocitava: kazdy zapas dostane podiel z volani,
// ktore ho sledovali, delený poctom zapasov, ktore v tom volani prave bezali.
//
// Zapasy pred vykopom alebo po konci sa do delenia nepocitaju — su vo feede
// tiez, ale hodnotu neprinasaju a inak by lacneli vecerne zapasy na ukor
// tych skorsich.
//
// Filtre: competition_id, od, do (hraci den)

require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();

$kde = ["l.call_type = 'live'", 'l.live_ids IS NOT NULL'];
$par = [];

if (!empty($_GET['competition_id'])) {
    $kde[] = 'l.competition_id = ?';
    $par[] = (int)$_GET['competition_id'];
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

// Kazde volanie sa rozlozi na svoje beziace zapasy (unnest) a cena sa deli
// ich poctom. Sucet podielov cez vsetky volania dava cenu zapasu.
$st = $pdo->prepare(
    "WITH podiely AS (
        SELECT UNNEST(l.live_ids)                          AS game_id,
               l.model,
               l.cost_usd / GREATEST(ARRAY_LENGTH(l.live_ids, 1), 1) AS podiel,
               l.tokens::numeric / GREATEST(ARRAY_LENGTH(l.live_ids, 1), 1) AS tok_podiel,
               l.checked_at,
               l.success
          FROM admin.livescore_log l
          $where
     )
     SELECT p.game_id,
            hc.club_name AS domaci,
            ac.club_name AS hostia,
            g.start_time,
            STRING_AGG(DISTINCT p.model, ', ')  AS modely,
            COUNT(*)                            AS volani,
            COUNT(*) FILTER (WHERE p.success)   AS uspesnych,
            SUM(p.podiel)                       AS cena,
            ROUND(SUM(p.tok_podiel))            AS tokenov,
            MIN(p.checked_at)                   AS prve,
            MAX(p.checked_at)                   AS posledne
       FROM podiely p
       LEFT JOIN \"lm2026-27\".games g ON g.game_id = p.game_id
       LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
       LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
      GROUP BY p.game_id, hc.club_name, ac.club_name, g.start_time
      ORDER BY g.start_time DESC NULLS LAST, p.game_id");
$st->execute($par);

$zapasy = [];
$spolu  = 0.0;

foreach ($st->fetchAll() as $r) {
    $cena    = (float)$r['cena'];
    $spolu  += $cena;

    $zapasy[] = [
        'game_id'   => (int)$r['game_id'],
        'zapas'     => $r['domaci']
                       ? $r['domaci'] . ' — ' . ($r['hostia'] ?? '?')
                       : '#' . $r['game_id'],
        'zaciatok'  => $r['start_time'],
        'modely'    => $r['modely'],
        'volani'    => (int)$r['volani'],
        'uspesnych' => (int)$r['uspesnych'],
        'tokenov'   => (int)$r['tokenov'],
        'cena'      => round($cena, 6),
        'prve'      => $r['prve'],
        'posledne'  => $r['posledne'],
    ];
}

json_ok([
    'zapasy' => $zapasy,
    'sumar'  => [
        'zapasov' => count($zapasy),
        'cena'    => round($spolu, 6),
    ],
]);
