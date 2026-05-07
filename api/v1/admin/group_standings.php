<?php
// POST /v1/admin/group-standings        — sync computed standings to DB
// PUT  /v1/admin/group-standings        — update single row (manual edit)
// DELETE /v1/admin/group-standings/{ph} — reset phase (remove from DB, back to live)
require_auth(true);
$pdo = db();

if ($method === 'POST') {
    // Compute live standings and upsert into DB
    $all_rows = $pdo->query("
        SELECT phase, team1 AS team FROM iihf2026.games WHERE phase IN ('A','B') AND team1 IS NOT NULL
        UNION
        SELECT phase, team2 FROM iihf2026.games WHERE phase IN ('A','B') AND team2 IS NOT NULL
    ")->fetchAll();

    $groups = ['A' => [], 'B' => []];
    foreach ($all_rows as $r) {
        $groups[$r['phase']][$r['team']] ??= ['gp'=>0,'w'=>0,'d'=>0,'l'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
    }

    $games = $pdo->query("
        SELECT phase, team1, team2, score1, score2
        FROM iihf2026.games
        WHERE phase IN ('A','B') AND status='finished' AND score1 IS NOT NULL
    ")->fetchAll();

    foreach ($games as $g) {
        $ph = $g['phase']; $t1 = $g['team1']; $t2 = $g['team2'];
        $s1 = (int)$g['score1']; $s2 = (int)$g['score2'];
        $groups[$ph][$t1]['gp']++; $groups[$ph][$t1]['gf'] += $s1; $groups[$ph][$t1]['ga'] += $s2;
        $groups[$ph][$t2]['gp']++; $groups[$ph][$t2]['gf'] += $s2; $groups[$ph][$t2]['ga'] += $s1;
        if ($s1 > $s2) {
            $groups[$ph][$t1]['w']++; $groups[$ph][$t2]['l']++; $groups[$ph][$t1]['pts'] += 2;
        } elseif ($s2 > $s1) {
            $groups[$ph][$t2]['w']++; $groups[$ph][$t1]['l']++; $groups[$ph][$t2]['pts'] += 2;
        } else {
            $groups[$ph][$t1]['d']++; $groups[$ph][$t2]['d']++;
            $groups[$ph][$t1]['pts']++; $groups[$ph][$t2]['pts']++;
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO iihf2026.group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
        VALUES (:phase,:team,:rank,:gp,:w,:d,:l,:gf,:ga,:pts,FALSE,NOW())
        ON CONFLICT (phase, team) DO UPDATE SET
            rank=EXCLUDED.rank, gp=EXCLUDED.gp, w=EXCLUDED.w, d=EXCLUDED.d,
            l=EXCLUDED.l, gf=EXCLUDED.gf, ga=EXCLUDED.ga, pts=EXCLUDED.pts,
            finalized=FALSE, updated_at=NOW()
    ");

    foreach (['A', 'B'] as $ph) {
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
    // Only rank and finalized flag can be changed — stats are always from computed results
    $body = json_decode(file_get_contents('php://input'), true);
    if (!isset($body['phase'], $body['team'])) json_error('Missing phase/team', 400);

    $sets = []; $params = ['phase'=>$body['phase'], 'team'=>$body['team']];
    if (isset($body['rank']))      { $sets[] = "rank=:rank";           $params['rank']      = (int)$body['rank']; }
    if (isset($body['finalized'])) { $sets[] = "finalized=:finalized"; $params['finalized'] = (bool)$body['finalized']; }
    if (empty($sets)) json_error('Nothing to update', 400);

    $sets[] = "updated_at=NOW()";
    $pdo->prepare("UPDATE iihf2026.group_standings SET " . implode(',', $sets) . " WHERE phase=:phase AND team=:team")
        ->execute($params);

    json_ok(['updated' => true]);

} elseif ($method === 'DELETE') {
    // Reset phase standings — remove from DB, go back to live computation
    $parts = explode('/', $path);
    $ph = strtoupper(end($parts));
    if (!in_array($ph, ['A', 'B'])) {
        // Delete both
        $pdo->exec("DELETE FROM iihf2026.group_standings");
    } else {
        $pdo->prepare("DELETE FROM iihf2026.group_standings WHERE phase=?")->execute([$ph]);
    }
    json_ok(['reset' => true]);

} else {
    json_error('Method not allowed', 405);
}
