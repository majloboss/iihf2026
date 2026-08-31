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

    // Cely prepocet robi jeden dopyt. Po zapasoch a tipoch sa kedysi chodilo
    // v cykle, co pri tisickach tipov znamenalo tisicky dopytov cez siet a
    // poziadavka padala na timeout.
    //
    // Hodnoty bodovania sa vkladaju priamo do dopytu, nie ako parametre:
    // PDO ich posiela ako text a Postgres potom hlasi
    // "CASE types integer and text cannot be matched". Su to cisla z vlastnej
    // konfiguracie pretypovane na int, takze o vsuvku nejde.
    $ptsLeague  = (int)$ptsLeague;
    $ptsPlayoff = (int)$ptsPlayoff;
    $ptsGoals   = (int)$ptsGoals;

    // sign(a - b) vracia -1/0/1, takze zhoda znamienok je zhoda vysledku
    // (vitaz domacich, hosti alebo remiza).
    $sql = '
        UPDATE "lm2026-27".tips t
           SET points_earned =
                 CASE WHEN sign(g.home_score_regular - g.away_score_regular)
                         = sign(t.home_score_tip - t.away_score_tip)
                      THEN CASE WHEN g.game_type_code = \'LEAGUE\'
                                THEN ' . $ptsLeague . ' ELSE ' . $ptsPlayoff . ' END
                      ELSE 0 END
               + CASE WHEN t.home_score_tip = g.home_score_regular THEN ' . $ptsGoals . ' ELSE 0 END
               + CASE WHEN t.away_score_tip = g.away_score_regular THEN ' . $ptsGoals . ' ELSE 0 END,
               updated_at = NOW()
          FROM "lm2026-27".games g
         WHERE g.game_id = t.game_id
           AND g.result_approved
           AND g.home_score_regular IS NOT NULL
           AND g.away_score_regular IS NOT NULL';

    return $pdo->exec($sql);
}
