<?php
// POST /v1/admin/recalc-points  — prepočíta body pre všetky finished zápasy
require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$pdo = db();

$cfg = [];
$rows = $pdo->query("SELECT key, value FROM iihf2026.scoring_config")->fetchAll();
foreach ($rows as $r) $cfg[$r['key']] = (int)$r['value'];
$winner_group   = $cfg['correct_winner_group']   ?? 1;
$winner_playoff = $cfg['correct_winner_playoff']  ?? 3;
$goals_pts      = $cfg['correct_goals_per_team']  ?? 1;

$games = $pdo->query("
    SELECT id, phase, score1, score2
    FROM iihf2026.games
    WHERE status = 'finished' AND score1 IS NOT NULL AND score2 IS NOT NULL
")->fetchAll();

$updated_tips = 0;

$upd = $pdo->prepare("UPDATE iihf2026.tips SET points = ? WHERE id = ?");

foreach ($games as $game) {
    $s1 = (int)$game['score1'];
    $s2 = (int)$game['score2'];
    $is_playoff  = in_array($game['phase'], ['QF', 'SF', 'BRONZE', 'GOLD']);
    $winner_pts  = $is_playoff ? $winner_playoff : $winner_group;
    $real_winner = $s1 > $s2 ? 1 : ($s1 < $s2 ? -1 : 0);

    $tips = $pdo->prepare("SELECT id, tip1, tip2 FROM iihf2026.tips WHERE game_id = ?");
    $tips->execute([$game['id']]);

    foreach ($tips->fetchAll() as $t) {
        $t1 = (int)$t['tip1'];
        $t2 = (int)$t['tip2'];
        $pts = 0;
        $tip_winner = $t1 > $t2 ? 1 : ($t1 < $t2 ? -1 : 0);
        if ($tip_winner === $real_winner) $pts += $winner_pts;
        if ($t1 === $s1) $pts += $goals_pts;
        if ($t2 === $s2) $pts += $goals_pts;
        $upd->execute([$pts, $t['id']]);
        $updated_tips++;
    }
}

json_ok(['games_processed' => count($games), 'tips_updated' => $updated_tips]);
