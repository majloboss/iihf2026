<?php
// POST   /v1/admin/fifa-group-standings  — sync z výsledkov (90 min) do DB
// PUT    /v1/admin/fifa-group-standings  — update jedného riadku (reorder/finalize)
// DELETE /v1/admin/fifa-group-standings/{ph} — reset fázy (vynuluj)
require_auth(true);
$pdo = db();

$GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

if ($method === 'POST') {
    // Inicializuj všetky tímy na 0
    $teams = $pdo->query("SELECT team_code, group_name FROM fifa2026.teams")->fetchAll();
    $groups = [];
    foreach ($GROUPS as $g) $groups[$g] = [];
    foreach ($teams as $t) {
        $groups[$t['group_name']][$t['team_code']] = ['gp'=>0,'w'=>0,'d'=>0,'l'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
    }

    // Odohrané skupinové zápasy (90 min skóre)
    $games = $pdo->query("
        SELECT g.game_type_code,
               ht.team_code AS t1, at.team_code AS t2,
               g.home_score_regular AS s1, g.away_score_regular AS s2
        FROM fifa2026.games g
        JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        WHERE g.game_type_code LIKE 'GROUP_%'
          AND g.result_approved = TRUE
          AND g.home_score_regular IS NOT NULL
    ")->fetchAll();

    foreach ($games as $g) {
        $ph = substr($g['game_type_code'], 6); // 'GROUP_A' -> 'A'
        $t1 = $g['t1']; $t2 = $g['t2'];
        $s1 = (int)$g['s1']; $s2 = (int)$g['s2'];
        if (!isset($groups[$ph][$t1], $groups[$ph][$t2])) continue;
        $groups[$ph][$t1]['gp']++; $groups[$ph][$t1]['gf'] += $s1; $groups[$ph][$t1]['ga'] += $s2;
        $groups[$ph][$t2]['gp']++; $groups[$ph][$t2]['gf'] += $s2; $groups[$ph][$t2]['ga'] += $s1;
        if ($s1 > $s2) {
            $groups[$ph][$t1]['w']++; $groups[$ph][$t2]['l']++; $groups[$ph][$t1]['pts'] += 3;
        } elseif ($s2 > $s1) {
            $groups[$ph][$t2]['w']++; $groups[$ph][$t1]['l']++; $groups[$ph][$t2]['pts'] += 3;
        } else {
            $groups[$ph][$t1]['d']++; $groups[$ph][$t2]['d']++;
            $groups[$ph][$t1]['pts']++; $groups[$ph][$t2]['pts']++;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO fifa2026.group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
        VALUES (:phase,:team,:rank,:gp,:w,:d,:l,:gf,:ga,:pts,FALSE,NOW())
        ON CONFLICT (phase, team) DO UPDATE SET
            rank=EXCLUDED.rank, gp=EXCLUDED.gp, w=EXCLUDED.w, d=EXCLUDED.d,
            l=EXCLUDED.l, gf=EXCLUDED.gf, ga=EXCLUDED.ga, pts=EXCLUDED.pts,
            finalized=fifa2026.group_standings.finalized, updated_at=NOW()
    ");

    foreach ($GROUPS as $ph) {
        uasort($groups[$ph], fn($a,$b) =>
            ($b['pts'] - $a['pts']) ?:
            (($b['gf']-$b['ga']) - ($a['gf']-$a['ga'])) ?:
            ($b['gf'] - $a['gf'])
        );
        $rank = 1;
        foreach ($groups[$ph] as $code => $s) {
            $stmt->execute([
                'phase'=>$ph, 'team'=>$code, 'rank'=>$rank++,
                'gp'=>$s['gp'], 'w'=>$s['w'], 'd'=>$s['d'], 'l'=>$s['l'],
                'gf'=>$s['gf'], 'ga'=>$s['ga'], 'pts'=>$s['pts']
            ]);
        }
    }
    json_ok(['synced' => true]);

} elseif ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!isset($body['phase'], $body['team'])) json_error('Missing phase/team', 400);

    $pdo->prepare("
        INSERT INTO fifa2026.group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
        VALUES (:phase,:team,:rank,:gp,:w,:d,:l,:gf,:ga,:pts,:finalized,NOW())
        ON CONFLICT (phase, team) DO UPDATE SET
            rank=EXCLUDED.rank, gp=EXCLUDED.gp, w=EXCLUDED.w, d=EXCLUDED.d,
            l=EXCLUDED.l, gf=EXCLUDED.gf, ga=EXCLUDED.ga, pts=EXCLUDED.pts,
            finalized=EXCLUDED.finalized, updated_at=NOW()
    ")->execute([
        'phase'=>$body['phase'], 'team'=>$body['team'],
        'rank'=>(int)($body['rank'] ?? 1),
        'gp'=>(int)($body['gp'] ?? 0), 'w'=>(int)($body['w'] ?? 0),
        'd'=>(int)($body['d'] ?? 0), 'l'=>(int)($body['l'] ?? 0),
        'gf'=>(int)($body['gf'] ?? 0), 'ga'=>(int)($body['ga'] ?? 0),
        'pts'=>(int)($body['pts'] ?? 0),
        'finalized'=>(bool)($body['finalized'] ?? false),
    ]);
    json_ok(['updated' => true]);

} elseif ($method === 'DELETE') {
    $parts = explode('/', $path);
    $ph = strtoupper(end($parts));
    if (in_array($ph, $GROUPS)) {
        $pdo->prepare("UPDATE fifa2026.group_standings SET gp=0,w=0,d=0,l=0,gf=0,ga=0,pts=0,rank=0,finalized=FALSE,updated_at=NOW() WHERE phase=?")->execute([$ph]);
    } else {
        $pdo->exec("UPDATE fifa2026.group_standings SET gp=0,w=0,d=0,l=0,gf=0,ga=0,pts=0,rank=0,finalized=FALSE,updated_at=NOW()");
    }
    json_ok(['reset' => true]);

} else {
    json_error('Method not allowed', 405);
}
