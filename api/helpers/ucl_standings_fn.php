<?php
// Prepocet ligovej tabulky LM 2026/27.
//
// Na rozdiel od FIFA nejde o skupiny, ale o JEDNU spolocnu tabulku 36 klubov.
// Poradie: body, rozdiel skore, strelene goly, nazov klubu.
// Hodnoti sa vysledok po 90 minutach (home_score_regular), nie po predlzeni.

function ucl_recalc_standings(PDO $pdo): int {
    // Tabulka sa vedie podla club_id: kod klubu je iba informativny udaj,
    // ktory admin meni, a identita na nom stat nemoze.
    $rows = $pdo->query('
        SELECT g.home_team_id AS home, g.away_team_id AS away,
               g.home_score_regular AS hs, g.away_score_regular AS ascore
          FROM "lm2026-27".games g
         WHERE g.game_type_code = \'LEAGUE\'
           AND g.result_approved
           AND g.home_score_regular IS NOT NULL
           AND g.away_score_regular IS NOT NULL')->fetchAll();

    // Vsetky kluby ligovej fazy, aj tie bez odohraneho zapasu.
    // Nazov sluzi na rozhodnutie rovnosti bodov aj skore.
    $clubs = $pdo->query('
        SELECT DISTINCT c.club_id, c.club_name
          FROM admin.uefa_clubs c
          JOIN "lm2026-27".games g
            ON (g.home_team_id = c.club_id OR g.away_team_id = c.club_id)
         WHERE g.game_type_code = \'LEAGUE\'')->fetchAll();

    $tab = [];
    $names = [];
    foreach ($clubs as $c) {
        $id = (int)$c['club_id'];
        $names[$id] = $c['club_name'];
        $tab[$id] = ['gp' => 0, 'w' => 0, 'd' => 0, 'l' => 0, 'gf' => 0, 'ga' => 0, 'pts' => 0];
    }

    foreach ($rows as $r) {
        $h = (int)$r['home']; $a = (int)$r['away'];
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
    uksort($tab, function ($x, $y) use ($tab, $names) {
        $a = $tab[$x]; $b = $tab[$y];
        return [$b['pts'], $b['gf'] - $b['ga'], $b['gf']] <=> [$a['pts'], $a['gf'] - $a['ga'], $a['gf']]
            ?: strcmp($names[$x] ?? '', $names[$y] ?? '');
    });

    // Admin mohol poradie prestavit rucne — pri rovnosti bodov rozhoduju
    // kriteria UEFA, ktore aplikacia nepozna. Take poradie sa zachova,
    // prepocitaju sa iba cisla zapasov a golov.
    $rucne = [];
    foreach ($pdo->query('SELECT team_id, rank FROM "lm2026-27".group_standings
                           WHERE phase = \'LEAGUE\' AND finalized')->fetchAll() as $r) {
        $rucne[(int)$r['team_id']] = (int)$r['rank'];
    }
    $vsetkyRucne = $rucne && count($rucne) === count($tab);

    $pdo->exec('DELETE FROM "lm2026-27".group_standings WHERE phase = \'LEAGUE\'');
    // PDO posiela PHP false ako prazdny retazec, ktory Postgres pre boolean
    // neprijme — priznak sa preto sklada priamo do dopytu.
    $finalizedSql = $vsetkyRucne ? 'TRUE' : 'FALSE';
    $ins = $pdo->prepare('
        INSERT INTO "lm2026-27".group_standings
            (phase, team_id, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
        VALUES (\'LEAGUE\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ' . $finalizedSql . ', NOW())');

    $rank = 0;
    foreach ($tab as $clubId => $t) {
        $vypocitane = ++$rank;
        $poradie = $vsetkyRucne ? ($rucne[$clubId] ?? $vypocitane) : $vypocitane;
        $ins->execute([$clubId, $poradie, $t['gp'], $t['w'], $t['d'], $t['l'],
                       $t['gf'], $t['ga'], $t['pts']]);
    }
    return $rank;
}

// Postupove pasmo podla umiestnenia v ligovej faze.
function ucl_zone(int $rank): string {
    if ($rank <= 8)  return 'R16';   // priamy postup do osemfinale
    if ($rank <= 24) return 'PO';    // play-off o osemfinale
    return 'OUT';                    // vyradenie
}
