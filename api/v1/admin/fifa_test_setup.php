<?php
// POST /v1/admin/fifa-test-setup  body: { action: 'load_master'|'reset'|'gen_group' }
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$pdo    = db();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $body['action'] ?? '';

// ── Rating (1 = najsilnejší). Podľa zadania. ──────────────────────────────────
$RATING = [
    'FRA'=>1,'ESP'=>2,'ARG'=>3,'ENG'=>4,'POR'=>5,'BRA'=>6,'NED'=>7,'MAR'=>8,
    'BEL'=>9,'GER'=>10,'CRO'=>11,'COL'=>13,'SEN'=>14,'MEX'=>15,'USA'=>16,'URU'=>17,
    'JPN'=>18,'SUI'=>19,'IRN'=>21,'TUR'=>22,'ECU'=>23,'AUT'=>24,'KOR'=>25,'AUS'=>27,
    'ALG'=>28,'EGY'=>29,'CAN'=>30,'NOR'=>31,'PAN'=>32,'CIV'=>33,'SWE'=>35,'PAR'=>36,
    'CZE'=>37,'SCO'=>38,'TUN'=>39,'COD'=>40,'UZB'=>41,'QAT'=>42,'IRQ'=>43,'RSA'=>44,
    'KSA'=>45,'JOR'=>46,'BIH'=>47,'CPV'=>48,'GHA'=>49,'CUW'=>50,'HAI'=>51,'NZL'=>52,
];

// Futbalový výsledok podľa ratingu (deterministický per zápas+seed)
function fifa_calc_score(string $t1, string $t2, array $r, int $gid, int $run): array {
    $d = abs(($r[$t1] ?? 30) - ($r[$t2] ?? 30));
    mt_srand($gid * 7919 + $run);
    $roll = mt_rand(0, 99);

    // Remíza: blízke ratingy častejšie
    $draw_p = $d <= 2 ? 30 : ($d <= 5 ? 24 : ($d <= 10 ? 18 : 12));
    if ($roll < $draw_p) {
        $s = [0,0,1,1,1,1,2,2,2,3][mt_rand(0,9)];
        return [$s, $s];
    }

    // Prekvapenie (slabší vyhrá)
    mt_srand($gid * 1031 + $run + 3);
    $upset_p   = $d <= 2 ? 30 : ($d <= 5 ? 22 : ($d <= 10 ? 14 : 7));
    $t1_better = ($r[$t1] ?? 30) < ($r[$t2] ?? 30);
    $t1_wins   = $t1_better xor (mt_rand(0, 99) < $upset_p);

    // Futbalové skóre — prevažne tesné
    mt_srand($gid * 3557 + $run + 7);
    $idx = mt_rand(0, 99);
    if      ($idx < 28) [$w,$l] = [1,0];
    elseif  ($idx < 50) [$w,$l] = [2,1];
    elseif  ($idx < 66) [$w,$l] = [2,0];
    elseif  ($idx < 78) [$w,$l] = [3,1];
    elseif  ($idx < 87) [$w,$l] = [3,0];
    elseif  ($idx < 93) [$w,$l] = [3,2];
    elseif  ($idx < 97) [$w,$l] = [4,1];
    else                [$w,$l] = [4,0];

    return $t1_wins ? [$w, $l] : [$l, $w];
}

// Tip hráča — niekedy presný, väčšinou blízky so správnym víťazom
function fifa_gen_tip(int $uid, int $gid, int $s1, int $s2, int $run): array {
    mt_srand($uid * 997 + $gid * 31 + $run);
    $roll = mt_rand(0, 99);
    if ($roll < 28) return [$s1, $s2];
    $win = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);
    if ($roll < 82) {
        $t1 = max(0, $s1 + mt_rand(-1, 1));
        $t2 = max(0, $s2 + mt_rand(-1, 1));
        if ($win === 1  && $t1 <= $t2) $t1 = $t2 + 1;
        if ($win === -1 && $t2 <= $t1) $t2 = $t1 + 1;
        if ($win === 0  && $t1 !== $t2) $t2 = $t1;
        return [$t1, $t2];
    }
    if ($win === 0) return mt_rand(0,1) === 0 ? [$s1+1, $s2] : [$s1, $s2+1];
    return [$s2, $s1]; // opačný tip
}

// ── Obnova rozpisu z games_pdf ────────────────────────────────────────────────
function fifa_load_master(PDO $pdo): int {
    $stmt = $pdo->query("
        UPDATE fifa2026.games g SET
            home_team_id       = p.home_team_id,
            away_team_id       = p.away_team_id,
            start_time         = p.start_time,
            venue              = p.venue,
            flashscore_url     = p.flashscore_url,
            home_score_regular = NULL, away_score_regular = NULL,
            home_score_final   = NULL, away_score_final   = NULL,
            result_approved    = FALSE,
            tips_open          = (p.home_team_id IS NOT NULL AND p.away_team_id IS NOT NULL),
            updated_at         = NOW()
        FROM fifa2026.games_pdf p
        WHERE g.game_id = p.game_id
    ");
    return $stmt->rowCount();
}

// ════════════════════════════════════════════════════════════════════════════
if ($action === 'load_master') {
    $chk = $pdo->query("SELECT COUNT(*) FROM fifa2026.games_pdf")->fetchColumn();
    if ((int)$chk === 0) json_error('Tabuľka games_pdf je prázdna — najprv ulož master rozpis', 400);
    $n = fifa_load_master($pdo);
    json_ok(['action' => 'load_master', 'games_loaded' => $n]);
}

// ════════════════════════════════════════════════════════════════════════════
if ($action === 'reset') {
    $chk = $pdo->query("SELECT COUNT(*) FROM fifa2026.games_pdf")->fetchColumn();
    if ((int)$chk === 0) json_error('Tabuľka games_pdf je prázdna', 400);
    $n = fifa_load_master($pdo);
    $pdo->exec("DELETE FROM fifa2026.tips");
    $pdo->exec("UPDATE fifa2026.group_standings SET gp=0,w=0,d=0,l=0,gf=0,ga=0,pts=0,rank=0,finalized=FALSE,updated_at=NOW()");
    json_ok(['action' => 'reset', 'games_reset' => $n]);
}

// ════════════════════════════════════════════════════════════════════════════
if ($action === 'gen_group') {
    // 1. Posun dátumov: playoff začne dnes, skupinová fáza skončí včera
    $today  = new DateTime('today UTC');
    $pfRaw  = $pdo->query("SELECT MIN(start_time) FROM fifa2026.games WHERE game_type_code NOT LIKE 'GROUP_%'")->fetchColumn();
    if (!$pfRaw) json_error('Žiadne play-off zápasy', 400);
    $pfDate = new DateTime(substr($pfRaw, 0, 10) . ' UTC');
    $offsetDays = (int) round(($today->getTimestamp() - $pfDate->getTimestamp()) / 86400);

    $pdo->prepare("UPDATE fifa2026.games SET start_time = start_time + (? || ' days')::interval, updated_at = NOW()")
        ->execute([$offsetDays]);

    // 2. Simuluj výsledky skupinových zápasov podľa ratingu
    $run = mt_rand(1, 999983);
    $games = $pdo->query("
        SELECT g.game_id, ht.team_code AS t1, at.team_code AS t2
        FROM fifa2026.games g
        JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        WHERE g.game_type_code LIKE 'GROUP_%'
        ORDER BY g.game_id
    ")->fetchAll();

    $updG = $pdo->prepare("
        UPDATE fifa2026.games SET
            home_score_regular = ?, away_score_regular = ?,
            home_score_final = NULL, away_score_final = NULL,
            result_approved = TRUE, tips_open = FALSE, updated_at = NOW()
        WHERE game_id = ?
    ");
    foreach ($games as $g) {
        [$s1, $s2] = fifa_calc_score($g['t1'], $g['t2'], $RATING, (int)$g['game_id'], $run);
        $updG->execute([$s1, $s2, $g['game_id']]);
    }

    // 3. Vygeneruj tipy pre všetkých hráčov na skupinové zápasy
    $users = $pdo->query("SELECT id FROM admin.users WHERE is_active=TRUE AND role='user'")->fetchAll(PDO::FETCH_COLUMN);
    $pdo->exec("DELETE FROM fifa2026.tips WHERE game_id IN (SELECT game_id FROM fifa2026.games WHERE game_type_code LIKE 'GROUP_%')");

    $scored = $pdo->query("SELECT game_id, home_score_regular AS s1, away_score_regular AS s2 FROM fifa2026.games WHERE game_type_code LIKE 'GROUP_%'")->fetchAll();
    $ins = $pdo->prepare("INSERT INTO fifa2026.tips (user_id, game_id, home_score_tip, away_score_tip, updated_at) VALUES (?,?,?,?,NOW())");
    foreach ($users as $uid) {
        foreach ($scored as $g) {
            [$t1, $t2] = fifa_gen_tip((int)$uid, (int)$g['game_id'], (int)$g['s1'], (int)$g['s2'], $run);
            $ins->execute([$uid, $g['game_id'], $t1, $t2]);
        }
    }

    // 4. Prepočítaj body
    require __DIR__ . '/../../helpers/fifa_recalc_fn.php';
    $rc = fifa_recalc_game($pdo, null);

    json_ok([
        'action'      => 'gen_group',
        'games'       => count($games),
        'users'       => count($users),
        'tips'        => count($users) * count($scored),
        'offset_days' => $offsetDays,
    ]);
}

json_error('Neznáma akcia', 400);
