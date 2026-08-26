<?php
// Prepocet bodov za tipy LM 2026/27.
//
// Hodnoti sa vysledok po 90 minutach; predlzenie a penalty sa nezapocitavaju.
//   Spravny vysledok (vitaz/remiza): 3 body v ligovej faze, 5 v playoff
//   Spravny pocet golov domacich:    +1
//   Spravny pocet golov hosti:       +1
// Maximum je teda 5 bodov v lige a 7 v playoff.

function ucl_recalc_points(PDO $pdo): int {
    $cfg = [];
    foreach ($pdo->query('SELECT key, value FROM "lm2026-27".scoring_config')->fetchAll() as $r) {
        $cfg[$r['key']] = (int)$r['value'];
    }
    $ptsLeague  = $cfg['correct_result_group']   ?? 3;
    $ptsPlayoff = $cfg['correct_result_playoff'] ?? 5;
    $ptsGoals   = $cfg['correct_goals_per_team'] ?? 1;

    $games = $pdo->query('
        SELECT game_id, game_type_code, home_score_regular AS hs, away_score_regular AS ascore
          FROM "lm2026-27".games
         WHERE result_approved
           AND home_score_regular IS NOT NULL
           AND away_score_regular IS NOT NULL')->fetchAll();

    $upd = $pdo->prepare('UPDATE "lm2026-27".tips SET points_earned = ? WHERE game_id = ? AND user_id = ?');
    $sel = $pdo->prepare('SELECT user_id, home_score_tip, away_score_tip FROM "lm2026-27".tips WHERE game_id = ?');

    $updated = 0;
    foreach ($games as $g) {
        $hs = (int)$g['hs'];
        $as = (int)$g['ascore'];
        $base = $g['game_type_code'] === 'LEAGUE' ? $ptsLeague : $ptsPlayoff;

        $sel->execute([$g['game_id']]);
        foreach ($sel->fetchAll() as $t) {
            $th = (int)$t['home_score_tip'];
            $ta = (int)$t['away_score_tip'];

            $points = 0;
            // Spravny vysledok = zhoda v tom, kto vyhral (alebo remiza).
            if (($hs <=> $as) === ($th <=> $ta)) $points += $base;
            if ($th === $hs) $points += $ptsGoals;
            if ($ta === $as) $points += $ptsGoals;

            $upd->execute([$points, $g['game_id'], $t['user_id']]);
            $updated++;
        }
    }
    return $updated;
}
