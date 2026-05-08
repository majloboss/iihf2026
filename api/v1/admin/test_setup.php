<?php
// POST /v1/admin/test-setup   body: { "action": "group" | "qf" | "sf" | "final" }
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$pdo    = db();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? 'group';

// ── Helpers ──────────────────────────────────────────────────────────────────
$ratings = [
    'CAN'=>1,'USA'=>2,'FIN'=>3,'SWE'=>4,'CZE'=>5,'SUI'=>6,'SVK'=>7,'GER'=>8,
    'LAT'=>9,'DEN'=>10,'AUT'=>11,'NOR'=>12,'ITA'=>13,'SLO'=>14,'HUN'=>15,'GBR'=>16,
];

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

function recalc_tips(PDO $pdo, int $game_id, int $s1, int $s2, string $phase, array $sc_cfg): void {
    $sc  = $sc_cfg[$phase] ?? $sc_cfg['A'];
    $wp  = (int)$sc['pts_winner']; $gp1 = (int)$sc['pts_goals1']; $gp2 = (int)$sc['pts_goals2'];
    $rw  = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);
    $upd = $pdo->prepare("UPDATE iihf2026.tips SET points=? WHERE id=?");
    $stmt = $pdo->prepare("SELECT id,tip1,tip2 FROM iihf2026.tips WHERE game_id=?");
    $stmt->execute([$game_id]);
    foreach ($stmt->fetchAll() as $t) {
        $t1 = (int)$t['tip1']; $t2 = (int)$t['tip2'];
        $pts = 0; $tw = $t1 > $t2 ? 1 : ($t1 < $t2 ? -1 : 0);
        if ($tw === $rw) $pts += $wp;
        if ($t1 === $s1) $pts += $gp1;
        if ($t2 === $s2) $pts += $gp2;
        $upd->execute([$pts, $t['id']]);
    }
}

function compute_standings(PDO $pdo, string $phase): array {
    $games = $pdo->prepare("SELECT team1,team2,score1,score2 FROM iihf2026.games WHERE phase=? AND status='finished' AND score1 IS NOT NULL");
    $games->execute([$phase]);
    $stats = [];
    foreach ($games->fetchAll() as $g) {
        foreach ([$g['team1'], $g['team2']] as $t) $stats[$t] ??= ['pts'=>0,'gf'=>0,'ga'=>0];
        $s1 = (int)$g['score1']; $s2 = (int)$g['score2'];
        $stats[$g['team1']]['gf'] += $s1; $stats[$g['team1']]['ga'] += $s2;
        $stats[$g['team2']]['gf'] += $s2; $stats[$g['team2']]['ga'] += $s1;
        if ($s1 > $s2) $stats[$g['team1']]['pts'] += 2;
        elseif ($s2 > $s1) $stats[$g['team2']]['pts'] += 2;
        else { $stats[$g['team1']]['pts']++; $stats[$g['team2']]['pts']++; }
    }
    uasort($stats, fn($a,$b) => ($b['pts']-$a['pts']) ?: (($b['gf']-$b['ga'])-($a['gf']-$a['ga'])) ?: ($b['gf']-$a['gf']));
    return array_keys($stats);
}

// Start time: max(nasledujúci deň po poslednom zápase, teraz + 2h)
function playoff_start(?string $last_game_date): DateTime {
    $now2 = (new DateTime('now UTC'))->modify('+2 hours');
    if ($last_game_date) {
        $next = (new DateTime($last_game_date . 'T00:00:00+00:00'))->modify('+1 day');
        return $next > $now2 ? $next : $now2;
    }
    return $now2;
}

function gen_playoff(PDO $pdo, array $games, array $ratings, array $users, array $sc_cfg): array {
    $ins = $pdo->prepare("INSERT INTO iihf2026.tips (user_id,game_id,tip1,tip2,updated_at) VALUES (?,?,?,?,NOW())
        ON CONFLICT (user_id,game_id) DO UPDATE SET tip1=EXCLUDED.tip1,tip2=EXCLUDED.tip2,points=NULL,updated_at=NOW()");
    $out = [];
    foreach ($games as $g) {
        [$s1,$s2] = calc_score($g['team1'], $g['team2'], $ratings);  // gid=0 → no draws
        $pdo->prepare("UPDATE iihf2026.games SET score1=?,score2=?,status='finished' WHERE id=?")
            ->execute([$s1,$s2,$g['id']]);
        foreach ($users as $uid) {
            [$t1,$t2] = gen_tip((int)$uid,(int)$g['id'],$s1,$s2);
            $ins->execute([$uid,$g['id'],$t1,$t2]);
        }
        recalc_tips($pdo,(int)$g['id'],$s1,$s2,$g['phase'],$sc_cfg);
        $out[] = "{$g['team1']} {$s1}:{$s2} {$g['team2']}";
    }
    return $out;
}

$sc_cfg = [];
foreach ($pdo->query("SELECT phase,pts_winner,pts_goals1,pts_goals2 FROM iihf2026.scoring_config")->fetchAll() as $r) {
    $sc_cfg[$r['phase']] = $r;
}
$users = $pdo->query("SELECT id FROM admin.users WHERE is_active=TRUE AND role='user'")->fetchAll(PDO::FETCH_COLUMN);

// ── ACTION: group ─────────────────────────────────────────────────────────────
if ($action === 'group') {
    $today  = new DateTime('today UTC');
    $base_date  = [
        'A' => (clone $today)->modify('-14 days')->format('Y-m-d'),
        'B' => (clone $today)->modify('-13 days')->format('Y-m-d'),
    ];
    $time_slots = ['10:20:00','12:40:00','15:00:00','17:20:00'];

    foreach (['A','B'] as $phase) {
        $stmt = $pdo->prepare("SELECT id,game_number,team1,team2 FROM iihf2026.games WHERE phase=? ORDER BY game_number");
        $stmt->execute([$phase]);
        foreach ($stmt->fetchAll() as $idx => $game) {
            $round  = intdiv($idx, 4);
            $slot   = $idx % 4;
            $starts = new DateTime($base_date[$phase] . 'T' . $time_slots[$slot] . '+00:00');
            $starts->modify('+' . ($round * 2) . ' days');
            [$s1,$s2] = calc_score($game['team1'],$game['team2'],$ratings,$game['id']);
            $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,score1=?,score2=?,status='finished' WHERE id=?")
                ->execute([$starts->format('Y-m-d H:i:sP'),$s1,$s2,$game['id']]);
        }
    }

    // Reset playoff — scheduled, no teams/scores
    $qf_base  = (clone $today)->modify('+1 day');
    $sf_base  = (clone $today)->modify('+3 days');
    $fin_base = (clone $today)->modify('+5 days');
    $pld = ['QF'=>[], 'SF'=>[], 'BRONZE'=>[], 'GOLD'=>[]];
    for ($i=0;$i<4;$i++) $pld['QF'][]   = (clone $qf_base)->modify('+' . ($i < 2 ? 0 : 1) . ' days')->format('Y-m-d') . ($i % 2 === 0 ? 'T16:15:00+00:00' : 'T20:15:00+00:00');
    for ($i=0;$i<2;$i++) $pld['SF'][]   = $sf_base->format('Y-m-d') . ($i === 0 ? 'T16:15:00+00:00' : 'T20:15:00+00:00');
    $pld['BRONZE'][] = $fin_base->format('Y-m-d') . 'T16:15:00+00:00';
    $pld['GOLD'][]   = $fin_base->format('Y-m-d') . 'T20:15:00+00:00';

    foreach ($pld as $phase => $dates) {
        $ids = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='$phase' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($ids as $i => $gid) {
            $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,status='scheduled',team1=NULL,team2=NULL,score1=NULL,score2=NULL WHERE id=?")
                ->execute([$dates[$i] ?? end($dates), $gid]);
        }
    }

    // Tips
    $group_games = $pdo->query("SELECT id,score1,score2 FROM iihf2026.games WHERE phase IN ('A','B') ORDER BY id")->fetchAll();
    $pdo->exec("DELETE FROM iihf2026.tips");
    $ins = $pdo->prepare("INSERT INTO iihf2026.tips (user_id,game_id,tip1,tip2,updated_at) VALUES (?,?,?,?,NOW())");
    foreach ($users as $uid) {
        foreach ($group_games as $g) {
            [$t1,$t2] = gen_tip((int)$uid,(int)$g['id'],(int)$g['score1'],(int)$g['score2']);
            $ins->execute([$uid,$g['id'],$t1,$t2]);
        }
    }
    foreach ($group_games as $g) recalc_tips($pdo,(int)$g['id'],(int)$g['score1'],(int)$g['score2'],'A',$sc_cfg);

    json_ok(['action'=>'group','games'=>count($group_games),'users'=>count($users),'tips'=>count($users)*count($group_games)]);
}

// ── ACTION: qf ───────────────────────────────────────────────────────────────
if ($action === 'qf') {
    $a = compute_standings($pdo,'A');
    $b = compute_standings($pdo,'B');
    if (count($a) < 4 || count($b) < 4) json_error('Skupina A alebo B nemá dosť odohraných zápasov', 400);

    // Seeding: A1 vs B4, B1 vs A4, A2 vs B3, B2 vs A3
    $matchups = [[$a[0],$b[3]],[$b[0],$a[3]],[$a[1],$b[2]],[$b[1],$a[2]]];

    $start   = (new DateTime('now UTC'))->modify('+2 hours');
    $qf_ids  = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='QF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
    $games   = [];
    foreach ($qf_ids as $i => $gid) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        [$t1,$t2] = $matchups[$i];
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,status='scheduled',score1=NULL,score2=NULL WHERE id=?")
            ->execute([$dt->format('Y-m-d H:i:sP'),$t1,$t2,$gid]);
        $games[] = ['id'=>$gid,'team1'=>$t1,'team2'=>$t2,'phase'=>'QF'];
    }

    $results = gen_playoff($pdo,$games,$ratings,$users,$sc_cfg);
    json_ok(['action'=>'qf','results'=>$results]);
}

// ── ACTION: sf ───────────────────────────────────────────────────────────────
if ($action === 'sf') {
    $qf = $pdo->query("SELECT id,team1,team2,score1,score2,starts_at FROM iihf2026.games WHERE phase='QF' ORDER BY game_number")->fetchAll();
    if (count($qf) < 4 || $qf[0]['score1'] === null) json_error('QF nie sú odohraté', 400);

    $win = fn($g) => (int)$g['score1'] >= (int)$g['score2'] ? $g['team1'] : $g['team2'];
    $matchups = [[$win($qf[0]),$win($qf[1])],[$win($qf[2]),$win($qf[3])]];

    $last_day = (new DateTime(max(array_column($qf,'starts_at'))))->format('Y-m-d');
    $start    = playoff_start($last_day);

    $sf_ids = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='SF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
    $games  = [];
    foreach ($sf_ids as $i => $gid) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        [$t1,$t2] = $matchups[$i];
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,status='scheduled',score1=NULL,score2=NULL WHERE id=?")
            ->execute([$dt->format('Y-m-d H:i:sP'),$t1,$t2,$gid]);
        $games[] = ['id'=>$gid,'team1'=>$t1,'team2'=>$t2,'phase'=>'SF'];
    }

    $results = gen_playoff($pdo,$games,$ratings,$users,$sc_cfg);
    json_ok(['action'=>'sf','results'=>$results]);
}

// ── ACTION: final ─────────────────────────────────────────────────────────────
if ($action === 'final') {
    $sf = $pdo->query("SELECT id,team1,team2,score1,score2,starts_at FROM iihf2026.games WHERE phase='SF' ORDER BY game_number")->fetchAll();
    if (count($sf) < 2 || $sf[0]['score1'] === null) json_error('SF nie sú odohraté', 400);

    $win  = fn($g) => (int)$g['score1'] >= (int)$g['score2'] ? $g['team1'] : $g['team2'];
    $lose = fn($g) => (int)$g['score1'] >= (int)$g['score2'] ? $g['team2'] : $g['team1'];

    $last_day = (new DateTime(max(array_column($sf,'starts_at'))))->format('Y-m-d');
    $start    = playoff_start($last_day);

    $bronze_id = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='BRONZE' ORDER BY game_number LIMIT 1")->fetchColumn();
    $gold_id   = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='GOLD'   ORDER BY game_number LIMIT 1")->fetchColumn();

    $games = [
        ['id'=>$bronze_id,'team1'=>$lose($sf[0]),'team2'=>$lose($sf[1]),'phase'=>'BRONZE'],
        ['id'=>$gold_id,  'team1'=>$win($sf[0]), 'team2'=>$win($sf[1]), 'phase'=>'GOLD'],
    ];
    foreach ($games as $i => $g) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=?,team1=?,team2=?,status='scheduled',score1=NULL,score2=NULL WHERE id=?")
            ->execute([$dt->format('Y-m-d H:i:sP'),$g['team1'],$g['team2'],$g['id']]);
    }

    $results = gen_playoff($pdo,$games,$ratings,$users,$sc_cfg);
    json_ok(['action'=>'final','results'=>$results]);
}

json_error('Unknown action', 400);
