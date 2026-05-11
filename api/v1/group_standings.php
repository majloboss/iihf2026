<?php
// GET /v1/group-standings — tabuľky skupín A a B
require_auth();
$pdo = db();

// Helper: live computation for given phases
function computeLive(PDO $pdo, array $phases): array {
    $all_rows = $pdo->query("
        SELECT phase, team1 AS team FROM iihf2026.games WHERE phase IN ('A','B') AND team1 IS NOT NULL
        UNION
        SELECT phase, team2 FROM iihf2026.games WHERE phase IN ('A','B') AND team2 IS NOT NULL
    ")->fetchAll();

    $groups = ['A' => [], 'B' => []];
    foreach ($all_rows as $r) {
        $groups[$r['phase']][$r['team']] ??= ['gp'=>0,'w'=>0,'otw'=>0,'otl'=>0,'d'=>0,'l'=>0,'gf'=>0,'ga'=>0,'pts'=>0];
    }

    $games = $pdo->query("
        SELECT phase, team1, team2, score1, score2, final1, final2
        FROM iihf2026.games
        WHERE phase IN ('A','B') AND status='finished' AND score1 IS NOT NULL
    ")->fetchAll();

    foreach ($games as $g) {
        $ph = $g['phase']; $t1 = $g['team1']; $t2 = $g['team2'];
        $s1 = (int)$g['score1']; $s2 = (int)$g['score2'];
        $isOT = ($s1 === $s2) && $g['final1'] !== null;
        $gf1 = $isOT ? (int)$g['final1'] : $s1;
        $gf2 = $isOT ? (int)$g['final2'] : $s2;
        $groups[$ph][$t1]['gp']++; $groups[$ph][$t1]['gf'] += $gf1; $groups[$ph][$t1]['ga'] += $gf2;
        $groups[$ph][$t2]['gp']++; $groups[$ph][$t2]['gf'] += $gf2; $groups[$ph][$t2]['ga'] += $gf1;
        if ($s1 > $s2) {
            $groups[$ph][$t1]['w']++; $groups[$ph][$t2]['l']++; $groups[$ph][$t1]['pts'] += 3;
        } elseif ($s2 > $s1) {
            $groups[$ph][$t2]['w']++; $groups[$ph][$t1]['l']++; $groups[$ph][$t2]['pts'] += 3;
        } elseif ($isOT && (int)$g['final1'] > (int)$g['final2']) {
            $groups[$ph][$t1]['otw']++; $groups[$ph][$t2]['otl']++; $groups[$ph][$t1]['pts'] += 2; $groups[$ph][$t2]['pts'] += 1;
        } elseif ($isOT && (int)$g['final2'] > (int)$g['final1']) {
            $groups[$ph][$t2]['otw']++; $groups[$ph][$t1]['otl']++; $groups[$ph][$t2]['pts'] += 2; $groups[$ph][$t1]['pts'] += 1;
        } else {
            $groups[$ph][$t1]['d']++; $groups[$ph][$t2]['d']++;
            $groups[$ph][$t1]['pts']++; $groups[$ph][$t2]['pts']++;
        }
    }

    $result = [];
    foreach ($phases as $ph) {
        uasort($groups[$ph], fn($a,$b) =>
            ($b['pts'] - $a['pts']) ?:
            (($b['gf']-$b['ga']) - ($a['gf']-$a['ga'])) ?:
            ($b['gf'] - $a['gf'])
        );
        $result[$ph] = [];
        $rank = 1;
        foreach ($groups[$ph] as $code => $s) {
            $result[$ph][] = ['team'=>$code, 'rank'=>$rank++, 'gp'=>$s['gp'], 'w'=>$s['w'],
                              'otw'=>$s['otw'], 'otl'=>$s['otl'],
                              'd'=>$s['d'], 'l'=>$s['l'], 'gf'=>$s['gf'], 'ga'=>$s['ga'],
                              'gd'=>$s['gf']-$s['ga'], 'pts'=>$s['pts'], 'finalized'=>false];
        }
    }
    return $result;
}

// Stored data (finalized or synced phases)
$stored = $pdo->query("SELECT * FROM iihf2026.group_standings ORDER BY phase, rank")->fetchAll();

$result = ['A' => [], 'B' => []];
$storedPhases = [];

foreach ($stored as $r) {
    $ph = $r['phase'];
    if (!isset($result[$ph])) continue;
    $result[$ph][] = [
        'team' => $r['team'], 'rank' => (int)$r['rank'],
        'gp'   => (int)$r['gp'], 'w'  => (int)$r['w'],
        'otw'  => (int)($r['otw'] ?? 0), 'otl' => (int)($r['otl'] ?? 0),
        'd'    => (int)$r['d'],  'l'  => (int)$r['l'],
        'gf'   => (int)$r['gf'], 'ga' => (int)$r['ga'],
        'gd'   => (int)$r['gf'] - (int)$r['ga'],
        'pts'  => (int)$r['pts'],
        'finalized' => $r['finalized'] === 't' || $r['finalized'] === true || $r['finalized'] === 1 || $r['finalized'] === '1',
    ];
    $storedPhases[$ph] = true;
}

// Pre fázy bez uložených dát vypočítaj live
$livePhasesNeeded = array_values(array_filter(['A', 'B'], fn($ph) => !isset($storedPhases[$ph])));
if (!empty($livePhasesNeeded)) {
    $live = computeLive($pdo, $livePhasesNeeded);
    foreach ($livePhasesNeeded as $ph) {
        $result[$ph] = $live[$ph];
    }
}

json_ok($result);
