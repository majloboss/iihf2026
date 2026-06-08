<?php
// Prepočet FIFA bodov pre jeden zápas (alebo všetky ak $gameId === null)
function fifa_recalc_game($pdo, $gameId = null) {
    $cfg = [];
    foreach ($pdo->query("SELECT key, value FROM fifa2026.scoring_config") as $r) {
        $cfg[$r['key']] = (int)$r['value'];
    }
    $groupPts   = $cfg['correct_result_group']   ?? 3;
    $playoffPts = $cfg['correct_result_playoff'] ?? 5;
    $goalPts    = $cfg['correct_goals_per_team'] ?? 1;

    $playoffCodes = ['R32','R16','QF','SF','BM','F'];

    $where  = $gameId ? 'AND g.game_id = ?' : '';
    $params = $gameId ? [$gameId] : [];

    $stmt = $pdo->prepare("
        SELECT g.game_id, g.game_type_code,
               g.home_score_regular AS h90, g.away_score_regular AS a90
        FROM fifa2026.games g
        WHERE g.result_approved = TRUE
          AND g.home_score_regular IS NOT NULL
          AND g.away_score_regular IS NOT NULL
          $where
    ");
    $stmt->execute($params);
    $games = $stmt->fetchAll();

    $updStmt  = $pdo->prepare("UPDATE fifa2026.tips SET points_earned = ? WHERE game_id = ? AND user_id = ?");
    $tipsStmt = $pdo->prepare("SELECT user_id, home_score_tip AS ht, away_score_tip AS at FROM fifa2026.tips WHERE game_id = ?");

    $updated = 0;
    foreach ($games as $g) {
        $h90 = (int)$g['h90'];
        $a90 = (int)$g['a90'];
        $isPlayoff = in_array($g['game_type_code'], $playoffCodes);
        $resultPts = $isPlayoff ? $playoffPts : $groupPts;
        $actualResult = $h90 > $a90 ? 1 : ($h90 < $a90 ? -1 : 0);

        $tipsStmt->execute([$g['game_id']]);
        foreach ($tipsStmt->fetchAll() as $t) {
            $ht = (int)$t['ht']; $at = (int)$t['at'];
            $tipResult = $ht > $at ? 1 : ($ht < $at ? -1 : 0);
            $pts = 0;
            if ($tipResult === $actualResult) $pts += $resultPts;
            if ($ht === $h90) $pts += $goalPts;
            if ($at === $a90) $pts += $goalPts;
            $updStmt->execute([$pts, $g['game_id'], $t['user_id']]);
            $updated++;
        }
    }
    return ['updated' => $updated, 'games' => count($games)];
}
