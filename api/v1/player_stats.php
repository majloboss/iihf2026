<?php
// GET /v1/player-stats?competition_id=X
// Štatistiky prihláseného hráča v danej súťaži.
//
// Počíta sa len z vyhodnotených tipov (points_earned IS NOT NULL) — tip na
// zápas, ktorý sa ešte nehral, by skresľoval priemer aj úspešnosť.
//
// Bodovanie sa medzi súťažami líši (UCL má 5 bodov za výsledok v play-off,
// FIFA a IIHF 3), preto sa hranice čítajú zo scoring_config, nie natvrdo.

$auth = require_auth();
$pdo  = db();
$uid  = (int)$auth['user_id'];

$cid = (int)($_GET['competition_id'] ?? 0);
if (!$cid) json_error('Chýba competition_id', 400);

$cs = $pdo->prepare('SELECT slug FROM admin.competitions WHERE id = ?');
$cs->execute([$cid]);
$slug = $cs->fetchColumn();
if (!$slug) json_error('Súťaž neexistuje', 404);

// Schémy sa medzi súťažami líšia: IIHF má iné názvy stĺpcov (id, starts_at,
// phase) než FIFA a UCL, ktoré vznikli neskôr a majú rovnakú štruktúru.
if ($slug === 'iihf2026') {
    $schema    = 'iihf2026';
    $joinGames = "JOIN {$schema}.games g ON g.id = t.game_id";
    $phaseCol  = 'g.phase';
    $timeCol   = 'g.starts_at';
    $bodyCol   = 'points';
} else {
    $schema    = $slug === 'ucl2026' ? '"lm2026-27"' : 'fifa2026';
    $joinGames = "JOIN {$schema}.games g ON g.game_id = t.game_id";
    $phaseCol  = 'g.game_type_name';
    $timeCol   = 'g.start_time';
    $bodyCol   = 'points_earned';
}

// ── Súhrn ────────────────────────────────────────────────────────────────────
$sq = $pdo->prepare("
    SELECT COUNT(*)                                    AS tipov,
           COALESCE(SUM(t.{$bodyCol}), 0)           AS body,
           COALESCE(MAX(t.{$bodyCol}), 0)           AS najlepsi,
           COUNT(*) FILTER (WHERE t.{$bodyCol} = 0) AS bez_bodu
      FROM {$schema}.tips t
     WHERE t.user_id = ? AND t.{$bodyCol} IS NOT NULL");
$sq->execute([$uid]);
$suhrn = $sq->fetch() ?: ['tipov' => 0, 'body' => 0, 'najlepsi' => 0, 'bez_bodu' => 0];

$tipov = (int)$suhrn['tipov'];

// ── Rozloženie bodov ─────────────────────────────────────────────────────────
$rq = $pdo->prepare("
    SELECT t.{$bodyCol} AS body, COUNT(*) AS pocet
      FROM {$schema}.tips t
     WHERE t.user_id = ? AND t.{$bodyCol} IS NOT NULL
     GROUP BY 1 ORDER BY 1 DESC");
$rq->execute([$uid]);
$rozlozenie = array_map(fn($r) => [
    'body'  => (int)$r['body'],
    'pocet' => (int)$r['pocet'],
], $rq->fetchAll());

// Najvyššia možná hodnota — podľa nej sa pozná presný tip.
$max = $rozlozenie ? max(array_column($rozlozenie, 'body')) : 0;

// ── Presné tipy a trafené výsledky ───────────────────────────────────────────
// Presný tip = najvyšší možný zisk. Trafený výsledok = aspoň bod za znamienko,
// čo je všetko okrem nuly.
$presnych = 0;
foreach ($rozlozenie as $r) {
    if ($max > 0 && $r['body'] === $max) $presnych = $r['pocet'];
}
$sBodmi = $tipov - (int)$suhrn['bez_bodu'];

// ── Body po kolách/fázach ────────────────────────────────────────────────────
$fq = $pdo->prepare("
    SELECT {$phaseCol} AS faza,
           COUNT(*) AS tipov,
           COALESCE(SUM(t.{$bodyCol}), 0) AS body
      FROM {$schema}.tips t
      {$joinGames}
     WHERE t.user_id = ? AND t.{$bodyCol} IS NOT NULL
     GROUP BY 1
     ORDER BY MIN({$timeCol})");
$fq->execute([$uid]);
$fazy = array_map(fn($r) => [
    'faza'  => $r['faza'],
    'tipov' => (int)$r['tipov'],
    'body'  => (int)$r['body'],
], $fq->fetchAll());

// ── Poradie medzi všetkými hráčmi ────────────────────────────────────────────
// Berú sa len hráči, ktorí aspoň raz tipovali — ostatní by poradie nafúkli.
$pq = $pdo->prepare("
    WITH sucty AS (
        SELECT user_id, COALESCE(SUM({$bodyCol}), 0) AS body
          FROM {$schema}.tips
         WHERE {$bodyCol} IS NOT NULL
         GROUP BY user_id
    )
    SELECT (SELECT COUNT(*) + 1 FROM sucty s2
             WHERE s2.body > (SELECT body FROM sucty WHERE user_id = ?)) AS poradie,
           (SELECT COUNT(*) FROM sucty) AS hracov,
           (SELECT MAX(body) FROM sucty) AS najviac");
$pq->execute([$uid]);
$poradie = $pq->fetch();

json_ok([
    'tips'          => $tipov,
    'points'        => (int)$suhrn['body'],
    'best_tip'      => (int)$suhrn['najlepsi'],
    'max_possible'  => $max,
    'exact'         => $presnych,
    'scored'        => $sBodmi,
    'blank'         => (int)$suhrn['bez_bodu'],
    'avg'           => $tipov ? round((int)$suhrn['body'] / $tipov, 2) : 0,
    'distribution'  => $rozlozenie,
    'phases'        => $fazy,
    'rank'          => $poradie ? (int)$poradie['poradie'] : null,
    'players'       => $poradie ? (int)$poradie['hracov'] : null,
    'leader_points' => $poradie ? (int)$poradie['najviac'] : null,
]);
