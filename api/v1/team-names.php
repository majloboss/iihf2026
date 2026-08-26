<?php
// GET /v1/team-names?competition_id=X
// Vráti mapovanie skratka → celý názov krajiny: { "CPV": "Cape Verde", ... }
$auth = require_auth();
$pdo  = db();

$cid = (int)($_GET['competition_id'] ?? 0);
if (!$cid) json_error('Chýba competition_id', 400);

$cs = $pdo->prepare("SELECT slug FROM admin.competitions WHERE id = ?");
$cs->execute([$cid]);
$slug = $cs->fetchColumn();
if (!$slug) json_error('Súťaž neexistuje', 404);

if ($slug === 'ucl2026') {
    // UCL: kluby z trvaleho ciselnika
    $rows = $pdo->query('SELECT club_code AS team_code, club_name AS team_name FROM admin.uefa_clubs')->fetchAll();
} elseif ($slug === 'fifa2026') {
    $rows = $pdo->query("SELECT team_code, team_name FROM fifa2026.teams")->fetchAll();
} else {
    // IIHF: stĺpce code / name
    $rows = $pdo->query("SELECT code AS team_code, name AS team_name FROM iihf2026.teams")->fetchAll();
}

$map = [];
foreach ($rows as $r) {
    if (!empty($r['team_code'])) {
        $map[strtoupper($r['team_code'])] = $r['team_name'];
    }
}

json_ok($map);
