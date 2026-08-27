<?php
// GET /v1/global-standings — globálne poradie všetkých tipérov po turnajoch
// Vráti pole "skupín", kde každá skupina = jeden turnaj (FIFA, IIHF, ...),
// zoradené podľa dátumu turnaja (najnovší prvý → FIFA, potom IIHF).
$auth = require_auth();
$pdo  = db();

// Načítaj aktívne súťaže zoradené podľa dátumu začiatku (najnovší prvý)
$comps = $pdo->query("
    SELECT id, slug, name, sport, starts_at
    FROM admin.competitions
    WHERE is_active = TRUE
    ORDER BY starts_at DESC NULLS LAST, id DESC
")->fetchAll();

$result = [];

foreach ($comps as $c) {
    $slug = $c['slug'];

    if ($slug === 'ucl2026') {
        $tipsJoin = "LEFT JOIN \"lm2026-27\".tips t ON t.user_id = u.id AND t.points_earned IS NOT NULL";
        $ptsCol   = "t.points_earned";
        $maxPts   = 7;
        $schema   = '"lm2026-27"';
    } elseif ($slug === 'fifa2026') {
        $tipsJoin = "LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.points_earned IS NOT NULL";
        $ptsCol   = "t.points_earned";
        $maxPts   = 7;
        $schema   = 'fifa2026';
    } else {
        $tipsJoin = "LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.points IS NOT NULL";
        $ptsCol   = "t.points";
        $maxPts   = 7;
        $schema   = 'iihf2026';
    }

    // Všetci tipéri ktorí majú aspoň jeden vyhodnotený tip v danom turnaji
    $sql = "
        SELECT u.id AS user_id, u.username, u.avatar,
               COALESCE(SUM($ptsCol), 0)                  AS total_points,
               COUNT($ptsCol)                              AS scored_tips,
               COUNT(CASE WHEN $ptsCol = 7 THEN 1 END)    AS pts7,
               COUNT(CASE WHEN $ptsCol = 6 THEN 1 END)    AS pts6,
               COUNT(CASE WHEN $ptsCol = 5 THEN 1 END)    AS pts5,
               COUNT(CASE WHEN $ptsCol = 4 THEN 1 END)    AS pts4,
               COUNT(CASE WHEN $ptsCol = 3 THEN 1 END)    AS pts3,
               COUNT(CASE WHEN $ptsCol = 2 THEN 1 END)    AS pts2,
               COUNT(CASE WHEN $ptsCol = 1 THEN 1 END)    AS pts1,
               COUNT(CASE WHEN $ptsCol = 0 THEN 1 END)    AS pts0
        FROM admin.users u
        $tipsJoin
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.username, u.avatar
        HAVING COUNT($ptsCol) > 0
        ORDER BY total_points DESC, pts7 DESC, pts6 DESC, pts5 DESC,
                 pts4 DESC, pts3 DESC, pts2 DESC, pts1 DESC, u.username
    ";

    $rows = $pdo->query($sql)->fetchAll();

    $members = [];
    foreach ($rows as $r) {
        $members[] = [
            'user_id'      => (int)$r['user_id'],
            'username'     => $r['username'],
            'avatar'       => $r['avatar'],
            'total_points' => (int)$r['total_points'],
            'scored_tips'  => (int)$r['scored_tips'],
            'pts7'         => (int)$r['pts7'],
            'pts6'         => (int)$r['pts6'],
            'pts5'         => (int)$r['pts5'],
            'pts4'         => (int)$r['pts4'],
            'pts3'         => (int)$r['pts3'],
            'pts2'         => (int)$r['pts2'],
            'pts1'         => (int)$r['pts1'],
            'pts0'         => (int)$r['pts0'],
        ];
    }

    // Aj turnaj bez tipov zobrazíme (prázdny), nech je vidno štruktúru
    $result[] = [
        'id'             => (int)$c['id'],
        'name'           => $c['name'],
        'slug'           => $slug,
        'competition_id' => (int)$c['id'],
        'max_pts'        => $maxPts,
        'members'        => $members,
    ];
}

json_ok($result);
