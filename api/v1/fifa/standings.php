<?php
// GET /v1/fifa/standings  - skupinove tabulky FIFA 2026 (skupiny A-L)
require_auth();
$pdo = db();

$stmt = $pdo->query("
    SELECT s.phase, s.team, s.rank, s.gp, s.w, s.d, s.l,
           s.gf, s.ga, (s.gf - s.ga) AS gd, s.pts, s.finalized,
           t.team_name
    FROM fifa2026.group_standings s
    JOIN fifa2026.teams t ON t.team_code = s.team
    ORDER BY s.phase, s.pts DESC, (s.gf - s.ga) DESC, s.gf DESC, s.team
");

$rows = $stmt->fetchAll();

$grouped = [];
foreach ($rows as $r) {
    $grouped[$r['phase']][] = $r;
}

// Pridaj rank v ramci skupiny
foreach ($grouped as $phase => &$teams) {
    foreach ($teams as $i => &$t) {
        $t['rank'] = $i + 1;
        $t['gd']   = (int)$t['gd'];
        $t['pts']  = (int)$t['pts'];
        $t['gp']   = (int)$t['gp'];
        $t['w']    = (int)$t['w'];
        $t['d']    = (int)$t['d'];
        $t['l']    = (int)$t['l'];
        $t['gf']   = (int)$t['gf'];
        $t['ga']   = (int)$t['ga'];
    }
}
unset($teams, $t);

json_ok($grouped);
