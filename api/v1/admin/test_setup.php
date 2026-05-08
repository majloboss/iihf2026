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

    // Reset playoff — scheduled, no teams/scores (placeholder dates)
    $qf_base  = (clone $today)->modify('+1 day');
    $sf_base  = (clone $today)->modify('+2 days');
    $fin_base = (clone $today)->modify('+3 days');
    $pld = ['QF'=>[], 'SF'=>[], 'BRONZE'=>[], 'GOLD'=>[]];
    for ($i=0;$i<4;$i++) $pld['QF'][]   = $qf_base->format('Y-m-d') . ($i % 2 === 0 ? 'T16:15:00+00:00' : 'T20:15:00+00:00');
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

// Start time: max(nasledujúci deň po poslednom zápase, teraz + 2h)
function playoff_start(?string $last_game_date): DateTime {
    $now2 = (new DateTime('now UTC'))->modify('+2 hours');
    if ($last_game_date) {
        $next = (new DateTime($last_game_date . 'T00:00:00+00:00'))->modify('+1 day');
        return $next > $now2 ? $next : $now2;
    }
    return $now2;
}

// ── Playoff helper: nastav dátumy + generuj tipy pre hry kde admin nastavil tímy ──
function gen_tips_for_phase(PDO $pdo, string $phase, array $users, array $sc_cfg): array {
    $games = $pdo->prepare("SELECT id,team1,team2,score1,score2 FROM iihf2026.games WHERE phase=? AND team1 IS NOT NULL AND team2 IS NOT NULL ORDER BY game_number");
    $games->execute([$phase]);
    $games = $games->fetchAll();
    if (empty($games)) json_error("Žiadne hry s nastavenými tímami pre fázu $phase. Najprv nastav tímy cez Správu zápasov.", 400);

    $ins = $pdo->prepare("INSERT INTO iihf2026.tips (user_id,game_id,tip1,tip2,updated_at) VALUES (?,?,?,?,NOW())
        ON CONFLICT (user_id,game_id) DO UPDATE SET tip1=EXCLUDED.tip1,tip2=EXCLUDED.tip2,points=NULL,updated_at=NOW()");

    foreach ($users as $uid) {
        foreach ($games as $g) {
            $s1 = $g['score1'] !== null ? (int)$g['score1'] : mt_rand(0,3);
            $s2 = $g['score2'] !== null ? (int)$g['score2'] : mt_rand(0,3);
            [$t1,$t2] = gen_tip((int)$uid,(int)$g['id'],$s1,$s2);
            $ins->execute([$uid,$g['id'],$t1,$t2]);
        }
    }

    // Prepočet bodov len pre odohraté hry
    foreach ($games as $g) {
        if ($g['score1'] !== null) {
            recalc_tips($pdo,(int)$g['id'],(int)$g['score1'],(int)$g['score2'],$phase,$sc_cfg);
        }
    }

    return array_map(fn($g) => $g['team1'] . ' vs ' . $g['team2'] . ($g['score1'] !== null ? ' (' . $g['score1'] . ':' . $g['score2'] . ')' : ' — bez výsledku'), $games);
}

// ── ACTION: qf ───────────────────────────────────────────────────────────────
if ($action === 'qf') {
    // Dnes, ~1 hod po aktuálnom čase, 2h rozostupy
    $start  = (new DateTime('now UTC'))->modify('+1 hour');
    $qf_ids = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='QF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($qf_ids as $i => $gid) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=? WHERE id=?")->execute([$dt->format('Y-m-d H:i:sP'), $gid]);
    }
    $info = gen_tips_for_phase($pdo,'QF',$users,$sc_cfg);
    json_ok(['action'=>'qf','games'=>$info,'users'=>count($users)]);
}

// ── ACTION: sf ───────────────────────────────────────────────────────────────
if ($action === 'sf') {
    // Nasledujúci deň, rovnaký čas ako now+1h, 2h rozostupy
    $base  = (new DateTime('now UTC'))->modify('+1 hour');
    $start = (new DateTime('today UTC'))->modify('+1 day');
    $start->setTime((int)$base->format('H'), (int)$base->format('i'));
    $sf_ids = $pdo->query("SELECT id FROM iihf2026.games WHERE phase='SF' ORDER BY game_number")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($sf_ids as $i => $gid) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=? WHERE id=?")->execute([$dt->format('Y-m-d H:i:sP'), $gid]);
    }
    $info = gen_tips_for_phase($pdo,'SF',$users,$sc_cfg);
    json_ok(['action'=>'sf','games'=>$info,'users'=>count($users)]);
}

// ── ACTION: final ─────────────────────────────────────────────────────────────
if ($action === 'final') {
    // Pozajtra, rovnaký čas ako now+1h, 2h rozostupy
    $base  = (new DateTime('now UTC'))->modify('+1 hour');
    $start = (new DateTime('today UTC'))->modify('+2 days');
    $start->setTime((int)$base->format('H'), (int)$base->format('i'));
    $fin_ids = $pdo->query("SELECT id,phase FROM iihf2026.games WHERE phase IN ('BRONZE','GOLD') ORDER BY game_number")->fetchAll();
    foreach ($fin_ids as $i => $g) {
        $dt = (clone $start)->modify('+' . ($i * 2) . ' hours');
        $pdo->prepare("UPDATE iihf2026.games SET starts_at=? WHERE id=?")->execute([$dt->format('Y-m-d H:i:sP'), $g['id']]);
    }
    $bronze = gen_tips_for_phase($pdo,'BRONZE',$users,$sc_cfg);
    $gold   = gen_tips_for_phase($pdo,'GOLD',  $users,$sc_cfg);
    json_ok(['action'=>'final','games'=>array_merge($bronze,$gold),'users'=>count($users)]);
}

// ── ACTION: init — vymaže testovacie dáta, zápasy zostanú ────────────────────
if ($action === 'init') {
    $pdo->exec("DELETE FROM iihf2026.tips");
    $pdo->exec("DELETE FROM iihf2026.group_standings");
    $pdo->exec("DELETE FROM admin.group_members");
    $pdo->exec("DELETE FROM admin.friend_groups");
    $users_deleted = $pdo->exec("DELETE FROM admin.users WHERE role='user'");
    $links_deleted = $pdo->exec("DELETE FROM admin.invites");
    json_ok([
        'action'        => 'init',
        'users_deleted' => (int)$users_deleted,
        'links_deleted' => (int)$links_deleted,
    ]);
}

// ── ACTION: reset — vymaže testovacie dáta + obnoví pôvodný rozvrh z PDF ────
if ($action === 'reset') {
    $pdo->exec("DELETE FROM iihf2026.tips");
    $pdo->exec("DELETE FROM iihf2026.group_standings");
    $pdo->exec("DELETE FROM admin.group_members");
    $pdo->exec("DELETE FROM admin.friend_groups");

    // Pôvodný rozvrh z PDF (migration 002)
    $orig = [
        [1,'A','FIN','GER','2026-05-15 14:20+00','Zurich / Swiss Life Arena'],
        [2,'B','CAN','SWE','2026-05-15 14:20+00','Fribourg / BCF Arena'],
        [3,'A','USA','SUI','2026-05-15 18:20+00','Zurich / Swiss Life Arena'],
        [4,'B','CZE','DEN','2026-05-15 18:20+00','Fribourg / BCF Arena'],
        [5,'A','GBR','AUT','2026-05-16 10:20+00','Zurich / Swiss Life Arena'],
        [6,'B','SVK','NOR','2026-05-16 10:20+00','Fribourg / BCF Arena'],
        [7,'A','HUN','FIN','2026-05-16 14:20+00','Zurich / Swiss Life Arena'],
        [8,'B','ITA','CAN','2026-05-16 14:20+00','Fribourg / BCF Arena'],
        [9,'A','SUI','LAT','2026-05-16 18:20+00','Zurich / Swiss Life Arena'],
        [10,'B','SLO','CZE','2026-05-16 18:20+00','Fribourg / BCF Arena'],
        [11,'A','GBR','USA','2026-05-17 10:20+00','Zurich / Swiss Life Arena'],
        [12,'B','ITA','SVK','2026-05-17 10:20+00','Fribourg / BCF Arena'],
        [13,'A','AUT','HUN','2026-05-17 14:20+00','Zurich / Swiss Life Arena'],
        [14,'B','DEN','SWE','2026-05-17 14:20+00','Fribourg / BCF Arena'],
        [15,'A','GER','SUI','2026-05-17 18:20+00','Zurich / Swiss Life Arena'],
        [16,'B','NOR','SLO','2026-05-17 18:20+00','Fribourg / BCF Arena'],
        [17,'A','FIN','USA','2026-05-18 14:20+00','Zurich / Swiss Life Arena'],
        [18,'B','CAN','DEN','2026-05-18 14:20+00','Fribourg / BCF Arena'],
        [19,'A','LAT','GER','2026-05-18 18:20+00','Zurich / Swiss Life Arena'],
        [20,'B','SWE','CZE','2026-05-18 18:20+00','Fribourg / BCF Arena'],
        [21,'A','LAT','AUT','2026-05-19 14:20+00','Zurich / Swiss Life Arena'],
        [22,'B','ITA','NOR','2026-05-19 14:20+00','Fribourg / BCF Arena'],
        [23,'A','HUN','GBR','2026-05-19 18:20+00','Zurich / Swiss Life Arena'],
        [24,'B','SLO','SVK','2026-05-19 18:20+00','Fribourg / BCF Arena'],
        [25,'A','AUT','GER','2026-05-20 14:20+00','Zurich / Swiss Life Arena'],
        [26,'B','CZE','SVK','2026-05-20 14:20+00','Fribourg / BCF Arena'],
        [27,'A','SUI','GBR','2026-05-20 18:20+00','Zurich / Swiss Life Arena'],
        [28,'B','SWE','SLO','2026-05-20 18:20+00','Fribourg / BCF Arena'],
        [29,'A','LAT','FIN','2026-05-21 14:20+00','Zurich / Swiss Life Arena'],
        [30,'B','CAN','NOR','2026-05-21 14:20+00','Fribourg / BCF Arena'],
        [31,'A','SUI','HUN','2026-05-21 18:20+00','Zurich / Swiss Life Arena'],
        [32,'B','DEN','SLO','2026-05-21 18:20+00','Fribourg / BCF Arena'],
        [33,'A','GER','HUN','2026-05-22 14:20+00','Zurich / Swiss Life Arena'],
        [34,'B','CAN','SLO','2026-05-22 14:20+00','Fribourg / BCF Arena'],
        [35,'A','FIN','GBR','2026-05-22 18:20+00','Zurich / Swiss Life Arena'],
        [36,'B','SWE','ITA','2026-05-22 18:20+00','Fribourg / BCF Arena'],
        [37,'A','LAT','USA','2026-05-23 10:20+00','Zurich / Swiss Life Arena'],
        [38,'B','SWE','NOR','2026-05-23 10:20+00','Fribourg / BCF Arena'],
        [39,'A','SUI','AUT','2026-05-23 14:20+00','Zurich / Swiss Life Arena'],
        [40,'B','CZE','ITA','2026-05-23 14:20+00','Fribourg / BCF Arena'],
        [41,'A','GER','USA','2026-05-23 18:20+00','Zurich / Swiss Life Arena'],
        [42,'B','DEN','SVK','2026-05-23 18:20+00','Fribourg / BCF Arena'],
        [43,'A','GBR','LAT','2026-05-24 14:20+00','Zurich / Swiss Life Arena'],
        [44,'B','DEN','ITA','2026-05-24 14:20+00','Fribourg / BCF Arena'],
        [45,'A','FIN','AUT','2026-05-24 18:20+00','Zurich / Swiss Life Arena'],
        [46,'B','SVK','CAN','2026-05-24 18:20+00','Fribourg / BCF Arena'],
        [47,'A','USA','HUN','2026-05-25 14:20+00','Zurich / Swiss Life Arena'],
        [48,'B','CZE','NOR','2026-05-25 14:20+00','Fribourg / BCF Arena'],
        [49,'A','GER','GBR','2026-05-25 18:20+00','Zurich / Swiss Life Arena'],
        [50,'B','SLO','ITA','2026-05-25 18:20+00','Fribourg / BCF Arena'],
        [51,'A','HUN','LAT','2026-05-26 10:20+00','Zurich / Swiss Life Arena'],
        [52,'B','NOR','DEN','2026-05-26 10:20+00','Fribourg / BCF Arena'],
        [53,'A','USA','AUT','2026-05-26 14:20+00','Zurich / Swiss Life Arena'],
        [54,'B','SWE','SVK','2026-05-26 14:20+00','Fribourg / BCF Arena'],
        [55,'A','SUI','FIN','2026-05-26 18:20+00','Zurich / Swiss Life Arena'],
        [56,'B','CZE','CAN','2026-05-26 18:20+00','Fribourg / BCF Arena'],
        [57,'QF',null,null,'2026-05-28 14:20+00','Zurich / Swiss Life Arena'],
        [58,'QF',null,null,'2026-05-28 14:20+00','Fribourg / BCF Arena'],
        [59,'QF',null,null,'2026-05-28 18:20+00','Zurich / Swiss Life Arena'],
        [60,'QF',null,null,'2026-05-28 18:20+00','Fribourg / BCF Arena'],
        [61,'SF',null,null,'2026-05-30 13:20+00','Zurich / Swiss Life Arena'],
        [62,'SF',null,null,'2026-05-30 18:00+00','Zurich / Swiss Life Arena'],
        [63,'BRONZE',null,null,'2026-05-31 13:20+00','Zurich / Swiss Life Arena'],
        [64,'GOLD',null,null,'2026-05-31 18:20+00','Zurich / Swiss Life Arena'],
    ];

    $stmt = $pdo->prepare("UPDATE iihf2026.games SET team1=?,team2=?,starts_at=?,venue=?,score1=NULL,score2=NULL,status='scheduled' WHERE game_number=?");
    foreach ($orig as [$gn,$ph,$t1,$t2,$dt,$venue]) {
        $stmt->execute([$t1,$t2,$dt,$venue,$gn]);
    }

    json_ok([
        'action'      => 'reset',
        'games_reset' => 64,
    ]);
}

json_error('Unknown action', 400);
