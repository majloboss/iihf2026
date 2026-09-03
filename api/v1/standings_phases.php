<?php
// GET /v1/standings-phases?competition_id=X
// Zoznam kôl a fáz súťaže pre filter nad tabuľkami skupín.
//
// Vracajú sa len fázy, kde je aspoň jeden vyhodnotený tip — filter na kolo,
// v ktorom sa ešte nehralo, by dal samé nuly.
//
// Kolá sa radia podľa čísla v názve, nie podľa času: pri testovaní sa hracie
// dni posúvajú a časy prestanú zodpovedať poradiu.

$auth = require_auth();
$pdo  = db();

$cid = (int)($_GET['competition_id'] ?? 0);
if (!$cid) json_error('Chýba competition_id', 400);

$cs = $pdo->prepare('SELECT slug FROM admin.competitions WHERE id = ?');
$cs->execute([$cid]);
$slug = $cs->fetchColumn();
if (!$slug) json_error('Súťaž neexistuje', 404);

// IIHF vzniklo ako prvé a má vlastné názvy stĺpcov.
if ($slug === 'iihf2026') {
    $schema  = 'iihf2026';
    $gameKey = 'g.id';
    $phase   = 'g.phase';
    $body    = 'points';
} else {
    $schema  = $slug === 'ucl2026' ? '"lm2026-27"' : 'fifa2026';
    $gameKey = 'g.game_id';
    $phase   = 'g.game_type_name';
    $body    = 'points_earned';
}

$q = $pdo->query("
    SELECT {$phase} AS phase, COUNT(DISTINCT t.game_id) AS games
      FROM {$schema}.games g
      JOIN {$schema}.tips t ON {$gameKey} = t.game_id AND t.{$body} IS NOT NULL
     GROUP BY 1
     ORDER BY COALESCE(NULLIF(substring({$phase} from '([0-9]+)\\. kolo'), '')::int, 99),
              MIN(" . ($slug === 'iihf2026' ? 'g.starts_at' : 'g.start_time') . ")");

json_ok(array_map(fn($r) => [
    'phase' => $r['phase'],
    'games' => (int)$r['games'],
], $q->fetchAll()));
