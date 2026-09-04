<?php
// GET /v1/player-stats?competition_id=X   — štatistiky v jednej súťaži
// GET /v1/player-stats?competition_id=all — súčet za všetky súťaže
//
// Počíta sa len z vyhodnotených tipov (body IS NOT NULL) — tip na zápas, ktorý
// sa ešte nehral, by skresľoval priemer aj úspešnosť.
//
// Schémy sa medzi súťažami líšia: IIHF vzniklo ako prvé a má vlastné názvy
// stĺpcov (id, starts_at, phase, points), FIFA a UCL prišli neskôr s rovnakou
// štruktúrou.

$auth = require_auth();
$pdo  = db();
$uid  = (int)$auth['user_id'];

/** Popis schémy podľa slugu súťaže. */
function stats_schema(string $slug): array {
    if ($slug === 'iihf2026') {
        return ['schema' => 'iihf2026', 'gameKey' => 'g.id',
                'time' => 'g.starts_at', 'body' => 'points'];
    }
    return ['schema' => $slug === 'ucl2026' ? '"lm2026-27"' : 'fifa2026',
            'gameKey' => 'g.game_id',
            'time' => 'g.start_time', 'body' => 'points_earned'];
}

$vsetky = ($_GET['competition_id'] ?? '') === 'all';
$cid    = (int)($_GET['competition_id'] ?? 0);

if (!$vsetky && !$cid) json_error('Chýba competition_id', 400);

if ($vsetky) {
    $rows = $pdo->query('SELECT id, slug, name FROM admin.competitions ORDER BY starts_at')->fetchAll();
} else {
    $cs = $pdo->prepare('SELECT id, slug, name FROM admin.competitions WHERE id = ?');
    $cs->execute([$cid]);
    $rows = $cs->fetchAll();
    if (!$rows) json_error('Súťaž neexistuje', 404);
}

$suhrn      = ['tipov' => 0, 'body' => 0, 'najlepsi' => 0, 'bez_bodu' => 0];
$rozlozenie = [];   // body => počet
$fazy       = [];
$poSutazi   = [];
$maxMozne   = 0;

foreach ($rows as $c) {
    $s   = stats_schema($c['slug']);
    $sch = $s['schema'];
    $b   = $s['body'];

    $q = $pdo->prepare("
        SELECT COUNT(*)                           AS tipov,
               COALESCE(SUM(t.{$b}), 0)           AS body,
               COALESCE(MAX(t.{$b}), 0)           AS najlepsi,
               COUNT(*) FILTER (WHERE t.{$b} = 0) AS bez_bodu
          FROM {$sch}.tips t
         WHERE t.user_id = ? AND t.{$b} IS NOT NULL");
    $q->execute([$uid]);
    $r = $q->fetch() ?: ['tipov' => 0, 'body' => 0, 'najlepsi' => 0, 'bez_bodu' => 0];

    // Súťaž bez tipov by do rozloženia ani do rozpisu nepridala nič, len šum.
    if (!(int)$r['tipov']) continue;

    $suhrn['tipov']    += (int)$r['tipov'];
    $suhrn['body']     += (int)$r['body'];
    $suhrn['bez_bodu'] += (int)$r['bez_bodu'];
    $suhrn['najlepsi']  = max($suhrn['najlepsi'], (int)$r['najlepsi']);

    // Rozloženie bodov — pri 'all' sa sčítava naprieč súťažami.
    $rq = $pdo->prepare("
        SELECT t.{$b} AS body, COUNT(*) AS pocet
          FROM {$sch}.tips t
         WHERE t.user_id = ? AND t.{$b} IS NOT NULL
         GROUP BY 1");
    $rq->execute([$uid]);
    foreach ($rq->fetchAll() as $x) {
        $rozlozenie[(int)$x['body']] = ($rozlozenie[(int)$x['body']] ?? 0) + (int)$x['pocet'];
        $maxMozne = max($maxMozne, (int)$x['body']);
    }

    // Rozpis po kolách len pri jednej súťaži — naprieč súťažami by sa kolá
    // pomiešali a stratili význam.
    if (!$vsetky) {
        // Radí sa podľa čísla kola, nie podľa času: pri testovaní sa hracie
        // dni posúvajú, takže časy prestanú zodpovedať poradiu kôl. Fázy bez
        // čísla (baráž, play-off) idú za ligovou fázou v poradí prvého zápasu.
        // Fáza aj jej poradie prichádzajú z číselníka. Predtým sa názov bral
        // z `game_type_name` a číslo kola sa z neho vyťahovalo regulárnym
        // výrazom — poradie sa tak rozpadlo pri každej zmene názvu.
        $fq = $pdo->prepare("
            SELECT ph.match_stat_desc AS faza, COUNT(*) AS tipov,
                   COALESCE(SUM(t.{$b}), 0) AS body
              FROM {$sch}.tips t
              JOIN {$sch}.games g ON {$s['gameKey']} = t.game_id
              JOIN admin.competition_phases ph ON ph.id = g.phase_id
             WHERE t.user_id = ? AND t.{$b} IS NOT NULL
             GROUP BY ph.match_stat_desc, ph.sort_order
             ORDER BY ph.sort_order");
        $fq->execute([$uid]);
        $fazy = array_map(fn($x) => [
            'faza'  => $x['faza'],
            'tipov' => (int)$x['tipov'],
            'body'  => (int)$x['body'],
        ], $fq->fetchAll());
    }

    // Poradie v rámci súťaže; berú sa len hráči, ktorí aspoň raz tipovali.
    $pq = $pdo->prepare("
        WITH sucty AS (
            SELECT user_id, COALESCE(SUM({$b}), 0) AS body
              FROM {$sch}.tips WHERE {$b} IS NOT NULL
             GROUP BY user_id
        )
        SELECT (SELECT COUNT(*) + 1 FROM sucty s2
                 WHERE s2.body > (SELECT body FROM sucty WHERE user_id = ?)) AS poradie,
               (SELECT COUNT(*) FROM sucty) AS hracov,
               (SELECT MAX(body) FROM sucty) AS najviac");
    $pq->execute([$uid]);
    $p = $pq->fetch();

    $poSutazi[] = [
        'id'            => (int)$c['id'],
        'name'          => $c['name'],
        'tips'          => (int)$r['tipov'],
        'points'        => (int)$r['body'],
        'avg'           => round((int)$r['body'] / (int)$r['tipov'], 2),
        'rank'          => $p ? (int)$p['poradie'] : null,
        'players'       => $p ? (int)$p['hracov'] : null,
        'leader_points' => $p ? (int)$p['najviac'] : null,
    ];
}

$tipov = $suhrn['tipov'];

// Presný tip = najvyšší možný zisk.
$presnych = $maxMozne > 0 ? ($rozlozenie[$maxMozne] ?? 0) : 0;

krsort($rozlozenie);
$rozlozenieOut = [];
foreach ($rozlozenie as $body => $pocet) {
    $rozlozenieOut[] = ['body' => $body, 'pocet' => $pocet];
}

// Poradie sa pri súčte za všetky súťaže neuvádza: každý hráč sa mohol zapojiť
// do iného počtu súťaží, takže spoločné poradie by porovnávalo neporovnateľné.
// Namiesto neho ide rozpis po súťažiach.
//
// Rozloženie bodov sa naproti tomu sčítať dá — všetky tri súťaže majú rovnakú
// stupnicu s maximom 7 bodov za presný tip.
$jedna = (!$vsetky && count($poSutazi) === 1) ? $poSutazi[0] : null;

json_ok([
    'all'           => $vsetky,
    'tips'          => $tipov,
    'points'        => $suhrn['body'],
    'best_tip'      => $suhrn['najlepsi'],
    'max_possible'  => $maxMozne,
    'exact'         => $presnych,
    'scored'        => $tipov - $suhrn['bez_bodu'],
    'blank'         => $suhrn['bez_bodu'],
    'avg'           => $tipov ? round($suhrn['body'] / $tipov, 2) : 0,
    'distribution'  => $rozlozenieOut,
    'phases'        => $fazy,
    'competitions'  => $poSutazi,
    'rank'          => $jedna['rank'] ?? null,
    'players'       => $jedna['players'] ?? null,
    'leader_points' => $jedna['leader_points'] ?? null,
]);
