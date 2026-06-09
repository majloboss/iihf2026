<?php
// GET /v1/hall-of-fame — Sieň slávy
// Dynamicky (on-the-fly): pre každý SKONČENÝ turnaj vypočíta finálne poradie
// všetkých tipérov a pridelí body top 10 (1.=10b ... 10.=1b, od 11.=0b).
// Body sa kumulujú per hráč. Vráti 3 tabuľky: global / football / hockey.
// Turnaj je "skončený" ak majú všetky jeho zápasy zadaný výsledok.
$auth = require_auth();
$pdo  = db();

// Body za umiestnenie (index 0 = 1. miesto)
$PLACE_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

$comps = $pdo->query("
    SELECT id, slug, name, sport, starts_at
    FROM admin.competitions
    WHERE is_active = TRUE
    ORDER BY starts_at DESC NULLS LAST, id DESC
")->fetchAll();

// Akumulátory: [user_id => ['username','avatar','total','tournaments'=>[...]]]
$agg = [];

function ensureUser(&$agg, $uid, $username, $avatar) {
    if (!isset($agg[$uid])) {
        $agg[$uid] = [
            'user_id'     => (int)$uid,
            'username'    => $username,
            'avatar'      => $avatar,
            'total'       => 0,
            'tournaments' => [],   // [{name, slug, sport, place, hof_points, total_points}]
        ];
    }
}

$finishedTournaments = [];  // pre info

foreach ($comps as $c) {
    $slug = $c['slug'];

    // 1) Je turnaj skončený? (všetky zápasy majú výsledok)
    if ($slug === 'fifa2026') {
        $row = $pdo->query("
            SELECT COUNT(*) AS total,
                   COUNT(CASE WHEN result_approved = TRUE THEN 1 END) AS done
            FROM fifa2026.games
        ")->fetch();
    } else {
        $row = $pdo->query("
            SELECT COUNT(*) AS total,
                   COUNT(CASE WHEN status = 'finished' THEN 1 END) AS done
            FROM iihf2026.games
        ")->fetch();
    }
    $total = (int)$row['total'];
    $done  = (int)$row['done'];
    if ($total === 0 || $done < $total) {
        continue; // turnaj ešte neskončil
    }
    $finishedTournaments[] = ['name' => $c['name'], 'slug' => $slug];

    // 2) Finálne poradie všetkých tipérov v turnaji
    if ($slug === 'fifa2026') {
        $tipsJoin = "LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.points_earned IS NOT NULL";
        $ptsCol   = "t.points_earned";
    } else {
        $tipsJoin = "LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.points IS NOT NULL";
        $ptsCol   = "t.points";
    }

    $sql = "
        SELECT u.id AS user_id, u.username, u.avatar,
               COALESCE(SUM($ptsCol), 0)               AS total_points,
               COUNT(CASE WHEN $ptsCol = 7 THEN 1 END) AS pts7,
               COUNT(CASE WHEN $ptsCol = 6 THEN 1 END) AS pts6,
               COUNT(CASE WHEN $ptsCol = 5 THEN 1 END) AS pts5,
               COUNT(CASE WHEN $ptsCol = 4 THEN 1 END) AS pts4,
               COUNT(CASE WHEN $ptsCol = 3 THEN 1 END) AS pts3,
               COUNT(CASE WHEN $ptsCol = 2 THEN 1 END) AS pts2,
               COUNT(CASE WHEN $ptsCol = 1 THEN 1 END) AS pts1
        FROM admin.users u
        $tipsJoin
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.username, u.avatar
        HAVING COUNT($ptsCol) > 0
        ORDER BY total_points DESC, pts7 DESC, pts6 DESC, pts5 DESC,
                 pts4 DESC, pts3 DESC, pts2 DESC, pts1 DESC, u.username
    ";
    $ranking = $pdo->query($sql)->fetchAll();

    // 3) Prideľ body top 10
    foreach ($ranking as $i => $r) {
        $place      = $i + 1;
        $hofPoints  = $i < count($PLACE_POINTS) ? $PLACE_POINTS[$i] : 0;
        if ($hofPoints === 0) break; // od 11. miesta nič

        $uid = (int)$r['user_id'];
        ensureUser($agg, $uid, $r['username'], $r['avatar']);
        $agg[$uid]['total'] += $hofPoints;
        $agg[$uid]['tournaments'][] = [
            'name'         => $c['name'],
            'slug'         => $slug,
            'sport'        => $c['sport'],
            'place'        => $place,
            'hof_points'   => $hofPoints,
            'total_points' => (int)$r['total_points'],
        ];
    }
}

// 4) Postav 3 tabuľky
function buildTable($agg, $sportFilter) {
    $rows = [];
    foreach ($agg as $u) {
        // body len z turnajov daného športu (alebo všetky pri global)
        $sum = 0;
        $tours = [];
        foreach ($u['tournaments'] as $t) {
            if ($sportFilter === null || $t['sport'] === $sportFilter) {
                $sum += $t['hof_points'];
                $tours[] = $t;
            }
        }
        if ($sum <= 0) continue;
        $rows[] = [
            'user_id'     => $u['user_id'],
            'username'    => $u['username'],
            'avatar'      => $u['avatar'],
            'points'      => $sum,
            'tournaments' => $tours,
        ];
    }
    usort($rows, function ($a, $b) {
        if ($b['points'] !== $a['points']) return $b['points'] - $a['points'];
        return strcasecmp($a['username'], $b['username']);
    });
    return $rows;
}

json_ok([
    'finished'  => $finishedTournaments,
    'global'    => buildTable($agg, null),
    'football'  => buildTable($agg, 'football'),
    'hockey'    => buildTable($agg, 'hockey'),
]);
