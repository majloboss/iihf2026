<?php
// POST /v1/admin/test-setup
// Dynamické dátumy: skupiny končia včera, QF začína zajtra.
// Výsledky + tipy len pre skupinovú fázu; playoff len dátumy.
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$pdo = db();

// ── Ratings ──────────────────────────────────────────────────────────────────
$ratings = [
    'CAN'=>1,'USA'=>2,'FIN'=>3,'SWE'=>4,'CZE'=>5,'SUI'=>6,'SVK'=>7,'GER'=>8,
    'LAT'=>9,'DEN'=>10,'AUT'=>11,'NOR'=>12,'ITA'=>13,'SLO'=>14,'HUN'=>15,'GBR'=>16,
];

// Skóre podľa ratingu; susediace tímy (diff 1-2) môžu remizovať (len skupiny, gid>0)
function calc_score(string $t1, string $t2, array $r, int $gid = 0): array {
    $d = abs($r[$t1] - $r[$t2]);
    if ($gid > 0 && $d <= 2) {
        mt_srand($gid * 7919);
        $roll = mt_rand(0, 99); $draw_score = mt_rand(0, 2) === 0 ? 2 : 1;
        if ($roll < ($d === 1 ? 35 : 15)) return [$draw_score, $draw_score];
    }
    if ($d === 1)     { $w = 2; $l = 1; }
    elseif ($d === 2) { $w = 3; $l = 1; }
    elseif ($d === 3) { $w = 3; $l = 0; }
    elseif ($d === 4) { $w = 4; $l = 0; }
    else              { $w = 5; $l = 0; }
    return $r[$t1] < $r[$t2] ? [$w, $l] : [$l, $w];
}

// Tip s variáciou (podporuje remízy)
function gen_tip(int $uid, int $gid, int $s1, int $s2): array {
    mt_srand($uid * 997 + $gid * 31);
    $roll = mt_rand(0, 99);
    if ($roll < 30) return [$s1, $s2];
    $win = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);
    if ($roll < 80) {
        $sp = $roll < 55 ? 1 : 2;
        $t1 = max(0, $s1 + (mt_rand(0, $sp * 2) - $sp));
        $t2 = max(0, $s2 + (mt_rand(0, $sp * 2) - $sp));
        if ($win === 1  && $t1 <= $t2) $t1 = $t2 + 1;
        if ($win === -1 && $t2 <= $t1) $t2 = $t1 + 1;
        if ($win === 0  && $t1 !== $t2) $t2 = $t1;
        return [$t1, $t2];
    }
    if ($win === 0) return mt_rand(0, 1) === 0 ? [$s1 + 1, $s2] : [$s1, $s2 + 1];
    return [$s2, $s1];
}

// ── Dynamické dátumy ─────────────────────────────────────────────────────────
// Skupinová fáza: Sk.A končí predvčerom, Sk.B včera (7 kôl × 2 dni = 12 dní dozadu)
$today   = new DateTime('today UTC');
$last_a  = (clone $today)->modify('-2 days');
$last_b  = (clone $today)->modify('-1 day');
$base_a  = (clone $last_a)->modify('-12 days')->format('Y-m-d');
$base_b  = (clone $last_b)->modify('-12 days')->format('Y-m-d');

$base_date  = ['A' => $base_a, 'B' => $base_b];
$time_slots = ['10:20:00', '12:40:00', '15:00:00', '17:20:00'];

// Playoff: QF zajtra, SF o 3 dni, Bronz+Finále o 5 dní
$qf_base  = (clone $today)->modify('+1 day');
$sf_base  = (clone $today)->modify('+3 days');
$fin_base = (clone $today)->modify('+5 days');

$playoff_dates = [
    'QF'     => [
        $qf_base->format('Y-m-d')                             . 'T16:15:00+00:00',
        $qf_base->format('Y-m-d')                             . 'T20:15:00+00:00',
        (clone $qf_base)->modify('+1 day')->format('Y-m-d')   . 'T16:15:00+00:00',
        (clone $qf_base)->modify('+1 day')->format('Y-m-d')   . 'T20:15:00+00:00',
    ],
    'SF'     => [
        $sf_base->format('Y-m-d')                             . 'T16:15:00+00:00',
        $sf_base->format('Y-m-d')                             . 'T20:15:00+00:00',
    ],
    'BRONZE' => [$fin_base->format('Y-m-d')                   . 'T16:15:00+00:00'],
    'GOLD'   => [$fin_base->format('Y-m-d')                   . 'T20:15:00+00:00'],
];

// ── 1. Skupinová fáza — dátumy + výsledky ────────────────────────────────────
$results     = [];
$group_games = [];

foreach (['A', 'B'] as $phase) {
    $stmt = $pdo->prepare("SELECT id, game_number, team1, team2 FROM iihf2026.games WHERE phase=? ORDER BY game_number");
    $stmt->execute([$phase]);
    $group_games[$phase] = $stmt->fetchAll();

    foreach ($group_games[$phase] as $idx => $game) {
        $round  = intdiv($idx, 4);
        $slot   = $idx % 4;
        $starts = new DateTime($base_date[$phase] . 'T' . $time_slots[$slot] . '+00:00');
        $starts->modify('+' . ($round * 2) . ' days');

        [$s1, $s2] = calc_score($game['team1'], $game['team2'], $ratings, $game['id']);
        $results[$game['id']] = [$s1, $s2];

        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,score1=?,score2=?,status='finished' WHERE id=?")
            ->execute([$starts->format('Y-m-d H:i:sP'), $s1, $s2, $game['id']]);
    }
}

// ── 2. Tabuľka skupín → top 4 ────────────────────────────────────────────────
$top4 = [];
foreach (['A', 'B'] as $phase) {
    $stats = [];
    foreach ($group_games[$phase] as $game) {
        foreach ([$game['team1'], $game['team2']] as $t) {
            if (!isset($stats[$t])) $stats[$t] = ['pts' => 0, 'gf' => 0, 'ga' => 0];
        }
        [$s1, $s2] = $results[$game['id']];
        $stats[$game['team1']]['gf'] += $s1; $stats[$game['team1']]['ga'] += $s2;
        $stats[$game['team2']]['gf'] += $s2; $stats[$game['team2']]['ga'] += $s1;
        if ($s1 > $s2)      $stats[$game['team1']]['pts'] += 2;
        elseif ($s2 > $s1)  $stats[$game['team2']]['pts'] += 2;
        else { $stats[$game['team1']]['pts'] += 1; $stats[$game['team2']]['pts'] += 1; }
    }
    uasort($stats, fn($a, $b) =>
        ($b['pts'] - $a['pts']) ?:
        (($b['gf'] - $b['ga']) - ($a['gf'] - $a['ga'])) ?:
        ($b['gf'] - $a['gf'])
    );
    $top4[$phase] = array_slice(array_keys($stats), 0, 4);
}

// ── 3. Playoff — len dátumy, tímy a výsledky zadá admin ──────────────────────
foreach ($playoff_dates as $phase => $dates) {
    $games = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='$phase' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($games as $i => $gid) {
        $dt = $dates[$i] ?? end($dates);
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,status='scheduled',team1=NULL,team2=NULL,score1=NULL,score2=NULL WHERE id=?")
            ->execute([$dt, $gid]);
    }
}

// ── 4. Tipy — len skupinová fáza ─────────────────────────────────────────────
$users      = $pdo->query("SELECT id FROM admin.users WHERE is_active=TRUE")->fetchAll(PDO::FETCH_COLUMN);
$group_only = $pdo->query("SELECT id,score1,score2 FROM iihf2026.games WHERE phase IN ('A','B') AND score1 IS NOT NULL ORDER BY id")->fetchAll();

$pdo->exec("DELETE FROM iihf2026.tips");
$ins = $pdo->prepare("INSERT INTO iihf2026.tips (user_id, game_id, tip1, tip2, updated_at) VALUES (?,?,?,?,NOW())");

foreach ($users as $uid) {
    foreach ($group_only as $game) {
        [$t1, $t2] = gen_tip((int)$uid, (int)$game['id'], (int)$game['score1'], (int)$game['score2']);
        $ins->execute([$uid, $game['id'], $t1, $t2]);
    }
}

// ── 5. Prepočet bodov ─────────────────────────────────────────────────────────
$sc_cfg = [];
foreach ($pdo->query("SELECT phase,pts_winner,pts_goals1,pts_goals2 FROM iihf2026.scoring_config")->fetchAll() as $r) {
    $sc_cfg[$r['phase']] = $r;
}
$upd = $pdo->prepare("UPDATE iihf2026.tips SET points=? WHERE id=?");

foreach ($group_only as $game) {
    $s1  = (int)$game['score1'];
    $s2  = (int)$game['score2'];
    $sc  = $sc_cfg['A'] ?? null;
    $wp  = (int)($sc['pts_winner'] ?? 1);
    $gp1 = (int)($sc['pts_goals1'] ?? 1);
    $gp2 = (int)($sc['pts_goals2'] ?? 1);
    $rw  = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);

    $tips = $pdo->prepare("SELECT id,tip1,tip2 FROM iihf2026.tips WHERE game_id=?");
    $tips->execute([$game['id']]);
    foreach ($tips->fetchAll() as $t) {
        $t1 = (int)$t['tip1']; $t2 = (int)$t['tip2'];
        $pts = 0;
        $tw  = $t1 > $t2 ? 1 : ($t1 < $t2 ? -1 : 0);
        if ($tw === $rw) $pts += $wp;
        if ($t1 === $s1) $pts += $gp1;
        if ($t2 === $s2) $pts += $gp2;
        $upd->execute([$pts, $t['id']]);
    }
}

json_ok([
    'group_games'    => count($group_only),
    'users'          => count($users),
    'tips_generated' => count($users) * count($group_only),
    'group_A_top4'   => $top4['A'],
    'group_B_top4'   => $top4['B'],
    'group_A_base'   => $base_a,
    'group_B_base'   => $base_b,
    'qf_starts'      => $qf_base->format('Y-m-d'),
]);
