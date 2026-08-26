<?php
// Prepocet ligovej tabulky LM 2026/27.
//
// Na rozdiel od FIFA nejde o skupiny, ale o JEDNU spolocnu tabulku 36 klubov.
// Poradie: body, rozdiel skore, strelene goly, nazov klubu.
// Hodnoti sa vysledok po 90 minutach (home_score_regular), nie po predlzeni.

function ucl_recalc_standings(PDO $pdo): int {
    $rows = $pdo->query('
        SELECT hc.club_code AS home, ac.club_code AS away,
               g.home_score_regular AS hs, g.away_score_regular AS ascore
          FROM "lm2026-27".games g
          JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.game_type_code = \'LEAGUE\'
           AND g.result_approved
           AND g.home_score_regular IS NOT NULL
           AND g.away_score_regular IS NOT NULL')->fetchAll();

    // Vsetky kluby ligovej fazy, aj tie bez odohraneho zapasu.
    $clubs = $pdo->query('
        SELECT DISTINCT c.club_code
          FROM admin.uefa_clubs c
          JOIN "lm2026-27".games g
            ON (g.home_team_id = c.club_id OR g.away_team_id = c.club_id)
         WHERE g.game_type_code = \'LEAGUE\'')->fetchAll(PDO::FETCH_COLUMN);

    $tab = [];
    foreach ($clubs as $code) {
        $tab[$code] = ['gp' => 0, 'w' => 0, 'd' => 0, 'l' => 0, 'gf' => 0, 'ga' => 0, 'pts' => 0];
    }

    foreach ($rows as $r) {
        $h = $r['home']; $a = $r['away'];
        $hs = (int)$r['hs']; $as = (int)$r['ascore'];
        if (!isset($tab[$h]) || !isset($tab[$a])) continue;

        $tab[$h]['gp']++; $tab[$a]['gp']++;
        $tab[$h]['gf'] += $hs; $tab[$h]['ga'] += $as;
        $tab[$a]['gf'] += $as; $tab[$a]['ga'] += $hs;

        if ($hs > $as)      { $tab[$h]['w']++; $tab[$a]['l']++; $tab[$h]['pts'] += 3; }
        elseif ($hs < $as)  { $tab[$a]['w']++; $tab[$h]['l']++; $tab[$a]['pts'] += 3; }
        else                { $tab[$h]['d']++; $tab[$a]['d']++; $tab[$h]['pts']++; $tab[$a]['pts']++; }
    }

    // Poradie: body, rozdiel skore, strelene goly, nazov.
    uksort($tab, function ($x, $y) use ($tab) {
        $a = $tab[$x]; $b = $tab[$y];
        return [$b['pts'], $b['gf'] - $b['ga'], $b['gf']] <=> [$a['pts'], $a['gf'] - $a['ga'], $a['gf']]
            ?: strcmp($x, $y);
    });

    $pdo->exec('DELETE FROM "lm2026-27".group_standings WHERE phase = \'LEAGUE\'');
    $ins = $pdo->prepare('
        INSERT INTO "lm2026-27".group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, updated_at)
        VALUES (\'LEAGUE\', ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');

    $rank = 0;
    foreach ($tab as $code => $t) {
        $ins->execute([$code, ++$rank, $t['gp'], $t['w'], $t['d'], $t['l'], $t['gf'], $t['ga'], $t['pts']]);
    }
    return $rank;
}

// Postupove pasmo podla umiestnenia v ligovej faze.
function ucl_zone(int $rank): string {
    if ($rank <= 8)  return 'R16';   // priamy postup do osemfinale
    if ($rank <= 24) return 'PO';    // play-off o osemfinale
    return 'OUT';                    // vyradenie
}
