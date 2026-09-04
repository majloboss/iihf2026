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
    $body    = 'points';
} else {
    $schema  = $slug === 'ucl2026' ? '"lm2026-27"' : 'fifa2026';
    $gameKey = 'g.game_id';
    $body    = 'points_earned';
}

// Názov, skratka, farba aj poradie prichádzajú z číselníka. Predtým sa názov
// bral z `game_type_name`, skratka z `game_type_code` (odtiaľ SKA, SKB…)
// a poradie sa vyťahovalo z názvu regulárnym výrazom.
$q = $pdo->query("
    SELECT ph.match_stat_desc AS phase, ph.match_stat_code AS code,
           ph.color_code, ph.group_code,
           COUNT(DISTINCT t.game_id) AS games
      FROM {$schema}.games g
      JOIN admin.competition_phases ph ON ph.id = g.phase_id
      JOIN {$schema}.tips t ON {$gameKey} = t.game_id AND t.{$body} IS NOT NULL
     GROUP BY ph.match_stat_desc, ph.match_stat_code, ph.color_code,
              ph.group_code, ph.sort_order
     ORDER BY ph.sort_order");

json_ok(array_map(fn($r) => [
    'phase' => $r['phase'],
    'code'  => $r['code'],
    'color' => $r['color_code'],
    'group' => $r['group_code'],
    'games' => (int)$r['games'],
], $q->fetchAll()));
