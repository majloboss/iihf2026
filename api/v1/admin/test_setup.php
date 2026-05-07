<?php
// POST /v1/admin/test-setup
// Presunie turnaj do minulosti, vygeneruje výsledky podľa ratingu a tipy pre všetkých userov
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$pdo = db();

// ── Ratinng tímov (nižšie = lepší) ──────────────────────────────────────────
$ratings = [
    'CAN'=>1,'USA'=>2,'FIN'=>3,'SWE'=>4,'CZE'=>5,'SUI'=>6,'SVK'=>7,'GER'=>8,
    'LAT'=>9,'DEN'=>10,'AUT'=>11,'NOR'=>12,'ITA'=>13,'SLO'=>14,'HUN'=>15,'GBR'=>16,
];

// Skóre podľa rozdielu ratingu (lepší tím vždy vyhráva)
function calc_score(string $t1, string $t2, array $r): array {
    $d = abs($r[$t1] - $r[$t2]);
    if ($d === 1)     { $w = 2; $l = 1; }
    elseif ($d === 2) { $w = 3; $l = 1; }
    elseif ($d === 3) { $w = 3; $l = 0; }
    elseif ($d === 4) { $w = 4; $l = 0; }
    else              { $w = 5; $l = 0; }
    return $r[$t1] < $r[$t2] ? [$w, $l] : [$l, $w];
}

// Tip s variáciou podľa usera + zápasu
function gen_tip(int $uid, int $gid, int $s1, int $s2): array {
    mt_srand($uid * 997 + $gid * 31);
    $roll = mt_rand(0, 99);

    if ($roll < 30) return [$s1, $s2]; // presný tip

    $win = $s1 > $s2 ? 1 : -1;

    if ($roll < 80) {
        // správny víťaz, malá variácia
        $spread = $roll < 55 ? 1 : 2;
        $t1 = max(0, $s1 + (mt_rand(0, $spread * 2) - $spread));
        $t2 = max(0, $s2 + (mt_rand(0, $spread * 2) - $spread));
        // zachovaj smer víťaza
        if ($win === 1  && $t1 <= $t2) $t1 = $t2 + 1;
        if ($win === -1 && $t2 <= $t1) $t2 = $t1 + 1;
        return [$t1, $t2];
    }
    // zlý víťaz: prehoď skóre
    return [$s2, $s1];
}

// ── 1. Skupinová fáza — dátumy a výsledky ───────────────────────────────────
$time_slots = ['10:20:00', '12:40:00', '15:00:00', '17:20:00'];
$base_date  = ['A' => '2026-04-15', 'B' => '2026-04-16'];

$results      = []; // game_id => [s1,s2]
$group_games  = [];

foreach (['A', 'B'] as $phase) {
    $stmt = $pdo->prepare("SELECT id, game_number, team1, team2 FROM iihf2026.games WHERE phase = ? ORDER BY game_number");
    $stmt->execute([$phase]);
    $group_games[$phase] = $stmt->fetchAll();

    foreach ($group_games[$phase] as $idx => $game) {
        $round   = intdiv($idx, 4);
        $slot    = $idx % 4;
        $starts  = new DateTime($base_date[$phase] . 'T' . $time_slots[$slot] . '+00:00');
        $starts->modify('+' . ($round * 2) . ' days');

        [$s1, $s2] = calc_score($game['team1'], $game['team2'], $ratings);
        $results[$game['id']] = [$s1, $s2];

        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?, score1=?, score2=?, status='finished' WHERE id=?")
            ->execute([$starts->format('Y-m-d H:i:sP'), $s1, $s2, $game['id']]);
    }
}

// ── 2. Tabuľka skupín → top 4 ───────────────────────────────────────────────
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
        if ($s1 > $s2) $stats[$game['team1']]['pts'] += 2;
        else           $stats[$game['team2']]['pts'] += 2;
    }
    uasort($stats, fn($a, $b) =>
        ($b['pts'] - $a['pts']) ?:
        (($b['gf'] - $b['ga']) - ($a['gf'] - $a['ga'])) ?:
        ($b['gf'] - $a['gf'])
    );
    $top4[$phase] = array_slice(array_keys($stats), 0, 4);
}

// ── 3. Playoff ──────────────────────────────────────────────────────────────
// QF: A1-B4, B1-A4, A2-B3, B2-A3
$qf_matchups = [
    [$top4['A'][0], $top4['B'][3]],
    [$top4['B'][0], $top4['A'][3]],
    [$top4['A'][1], $top4['B'][2]],
    [$top4['B'][1], $top4['A'][2]],
];
$qf_dates = [
    '2026-05-05T16:15:00+00:00',
    '2026-05-05T20:15:00+00:00',
    '2026-05-06T16:15:00+00:00',
    '2026-05-06T20:15:00+00:00',
];

$qf_games = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='QF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
$qf_winners = []; $qf_losers = [];

foreach ($qf_games as $i => $gid) {
    [$t1, $t2] = $qf_matchups[$i];
    [$s1, $s2] = calc_score($t1, $t2, $ratings);
    $results[$gid] = [$s1, $s2];
    $qf_winners[] = $ratings[$t1] < $ratings[$t2] ? $t1 : $t2;
    $qf_losers[]  = $ratings[$t1] < $ratings[$t2] ? $t2 : $t1;
    $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,score1=?,score2=?,status='finished' WHERE id=?")
        ->execute([$qf_dates[$i], $t1, $t2, $s1, $s2, $gid]);
}

// SF: QF1w-QF2w, QF3w-QF4w
$sf_matchups = [[$qf_winners[0], $qf_winners[1]], [$qf_winners[2], $qf_winners[3]]];
$sf_dates    = ['2026-05-07T16:15:00+00:00', '2026-05-07T20:15:00+00:00'];
$sf_games    = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='SF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
$sf_winners = []; $sf_losers = [];

foreach ($sf_games as $i => $gid) {
    [$t1, $t2] = $sf_matchups[$i];
    [$s1, $s2] = calc_score($t1, $t2, $ratings);
    $results[$gid] = [$s1, $s2];
    $sf_winners[] = $ratings[$t1] < $ratings[$t2] ? $t1 : $t2;
    $sf_losers[]  = $ratings[$t1] < $ratings[$t2] ? $t2 : $t1;
    $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,score1=?,score2=?,status='finished' WHERE id=?")
        ->execute([$sf_dates[$i], $t1, $t2, $s1, $s2, $gid]);
}

// Bronze + Gold
$bronze_id = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='BRONZE'")->fetchColumn();
$gold_id   = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='GOLD'")->fetchColumn();

[$bt1,$bt2] = [$sf_losers[0], $sf_losers[1]];
[$bs1,$bs2] = calc_score($bt1,$bt2,$ratings);
$results[$bronze_id] = [$bs1,$bs2];
$pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,score1=?,score2=?,status='finished' WHERE id=?")
    ->execute(['2026-05-08T16:15:00+00:00',$bt1,$bt2,$bs1,$bs2,$bronze_id]);

[$gt1,$gt2] = [$sf_winners[0], $sf_winners[1]];
[$gs1,$gs2] = calc_score($gt1,$gt2,$ratings);
$results[$gold_id] = [$gs1,$gs2];
$pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,score1=?,score2=?,status='finished' WHERE id=?")
    ->execute(['2026-05-08T20:15:00+00:00',$gt1,$gt2,$gs1,$gs2,$gold_id]);

// ── 4. Tipy pre všetkých userov ─────────────────────────────────────────────
$users     = $pdo->query("SELECT id FROM admin.users WHERE is_active=TRUE")->fetchAll(PDO::FETCH_COLUMN);
$all_games = $pdo->query("SELECT id, score1, score2 FROM iihf2026.games WHERE score1 IS NOT NULL ORDER BY id")->fetchAll();

$pdo->exec("DELETE FROM iihf2026.tips");
$ins = $pdo->prepare("INSERT INTO iihf2026.tips (user_id, game_id, tip1, tip2, updated_at) VALUES (?,?,?,?,NOW())");

foreach ($users as $uid) {
    foreach ($all_games as $game) {
        [$t1, $t2] = gen_tip((int)$uid, (int)$game['id'], (int)$game['score1'], (int)$game['score2']);
        $ins->execute([$uid, $game['id'], $t1, $t2]);
    }
}

// ── 5. Prepočet bodov ────────────────────────────────────────────────────────
$sc_cfg = [];
foreach ($pdo->query("SELECT phase,pts_winner,pts_goals1,pts_goals2 FROM iihf2026.scoring_config")->fetchAll() as $r) {
    $sc_cfg[$r['phase']] = $r;
}
$upd = $pdo->prepare("UPDATE iihf2026.tips SET points=? WHERE id=?");

foreach ($pdo->query("SELECT id,phase,score1,score2 FROM iihf2026.games WHERE status='finished' AND score1 IS NOT NULL")->fetchAll() as $game) {
    $s1 = (int)$game['score1'];
    $s2 = (int)$game['score2'];
    $playoff = in_array($game['phase'], ['QF','SF','BRONZE','GOLD']);
    $sc  = $sc_cfg[$game['phase']] ?? null;
    $wp  = (int)($sc['pts_winner'] ?? ($playoff ? 3 : 1));
    $gp1 = (int)($sc['pts_goals1'] ?? 1);
    $gp2 = (int)($sc['pts_goals2'] ?? 1);
    $rw  = $s1 > $s2 ? 1 : -1;

    $tips = $pdo->prepare("SELECT id,tip1,tip2 FROM iihf2026.tips WHERE game_id=?");
    $tips->execute([$game['id']]);
    foreach ($tips->fetchAll() as $t) {
        $t1 = (int)$t['tip1']; $t2 = (int)$t['tip2'];
        $pts = 0;
        $tw  = $t1 > $t2 ? 1 : ($t1 < $t2 ? -1 : 0);
        if ($tw === $rw)   $pts += $wp;
        if ($t1 === $s1)   $pts += $gp1;
        if ($t2 === $s2)   $pts += $gp2;
        $upd->execute([$pts, $t['id']]);
    }
}

json_ok([
    'games_updated'  => count($all_games),
    'users'          => count($users),
    'tips_generated' => count($users) * count($all_games),
    'group_A_top4'   => $top4['A'],
    'group_B_top4'   => $top4['B'],
    'gold'           => "$gt1 $gs1:$gs2 $gt2",
    'bronze'         => "$bt1 $bs1:$bs2 $bt2",
]);
