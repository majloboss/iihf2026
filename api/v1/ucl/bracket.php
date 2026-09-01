<?php
// GET /v1/ucl/bracket — pavuk vyradovacej casti
//
// Vracia fazy s dvojicami: oba zapasy, sucet golov a vitaza. Sucet sa rata
// krizom — domaci prveho zapasu je v odvete hostom. Pri rovnakom sucte
// rozhoduje predlzenie alebo penalty v odvete (home_score_final).
//
// Finale sa hra na jeden zapas, preto nema tie_id ani odvetu.
require_auth();
$pdo = db();
if ($method !== 'GET') json_error('Method not allowed', 405);

$FAZY = ['PO' => 'Baráž o play-off', 'R16' => 'Osemfinále',
         'QF' => 'Štvrťfinále', 'SF' => 'Semifinále', 'F' => 'Finále'];

$rows = $pdo->query('
    SELECT g.game_id, g.game_type_code, g.tie_id, g.leg, g.start_time,
           g.home_score_regular AS hs, g.away_score_regular AS ag,
           g.home_score_final AS hf, g.away_score_final AS af,
           g.result_approved, g.ls_home, g.ls_away,
           g.home_team_id, g.away_team_id,
           hc.club_name AS home_name, hc.logo_file AS home_logo,
           ac.club_name AS away_name, ac.logo_file AS away_logo
      FROM "lm2026-27".games g
      LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
      LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
     WHERE g.game_type_code <> \'LEAGUE\'
     ORDER BY g.game_type_code, g.tie_id, g.leg, g.game_id')->fetchAll();

// Zoskupenie na dvojice; finale tvori vlastnu "dvojicu" s jedinym zapasom.
// Odkial sa tim vzal: miesto v ligovej tabulke alebo dvojica, z ktorej postupil.
// Kluc je rovnaky, akym sa dvojice zostavuju (ucl_build_bracket.php): do baraze
// idu miesta 9-24, do osemfinale prvych osem a vitazi baraze PO-1..PO-8, dalej
// vitazi predoslej fazy v poradi cisla dvojice.
$tabulka = [];
foreach ($pdo->query('SELECT rank, team_id FROM "lm2026-27".group_standings
                       WHERE phase = \'LEAGUE\' AND team_id IS NOT NULL
                       ORDER BY rank')->fetchAll() as $r) {
    $tabulka[(int)$r['team_id']] = (int)$r['rank'];
}

$dvojice = [];
foreach ($rows as $r) {
    $kluc = $r['tie_id'] ?? ($r['game_type_code'] . '-single');
    $dvojice[$r['game_type_code']][$kluc][] = $r;
}

$vystup = [];
foreach ($FAZY as $kod => $nazov) {
    $zoznam = [];
    foreach ($dvojice[$kod] ?? [] as $tieId => $zapasy) {
        usort($zapasy, fn($x, $y) => ((int)$x['leg']) <=> ((int)$y['leg']));
        $prvy   = $zapasy[0] ?? null;
        $odveta = $zapasy[1] ?? null;

        // Dvojica sa pomenuje podla prveho zapasu; lepsie umiestneny tim je
        // v nom hostom, preto sa v pavuku zobrazuje ako prvy.
        $timA = $prvy['away_team_id'] ?? null;
        $timB = $prvy['home_team_id'] ?? null;
        $menoA = $prvy['away_name'] ?? null;
        $menoB = $prvy['home_name'] ?? null;
        $logoA = $prvy['away_logo'] ?? null;
        $logoB = $prvy['home_logo'] ?? null;

        // Finale nema odvetu, takze poradie zostava tak, ako je zapisane.
        if (!$odveta) {
            $timA = $prvy['home_team_id'] ?? null;
            $timB = $prvy['away_team_id'] ?? null;
            $menoA = $prvy['home_name'] ?? null;
            $menoB = $prvy['away_name'] ?? null;
            $logoA = $prvy['home_logo'] ?? null;
            $logoB = $prvy['away_logo'] ?? null;
        }

        $golyA = null;
        $golyB = null;
        $vitaz = null;

        $maVysledok = fn($z) => $z && $z['hs'] !== null && $z['ag'] !== null;

        // Do suctu ide konecny vysledok zapasu: ked sa hralo predlzenie alebo
        // penalty, plati skore po nich, nie po 90 minutach. Inak by dvojica
        // rozhodnuta v predlzeni vyzerala ako nerozhodna — odveta 2:2 pri
        // prvom zapase 0:2 dava dvojicu 2:4, nie 2:2.
        $konecne = fn($z, $pole) => $z[$pole === 'h' ? 'hf' : 'af'] !== null
            ? (int)$z[$pole === 'h' ? 'hf' : 'af']
            : (int)$z[$pole === 'h' ? 'hs' : 'ag'];

        if ($odveta) {
            if ($maVysledok($prvy) && $maVysledok($odveta)) {
                // A bol v prvom zapase hostom, v odvete domacim.
                $golyA = $konecne($prvy, 'a') + $konecne($odveta, 'h');
                $golyB = $konecne($prvy, 'h') + $konecne($odveta, 'a');

                if ($golyA !== $golyB) $vitaz = $golyA > $golyB ? $timA : $timB;
            }
        } elseif ($maVysledok($prvy)) {
            $golyA = $konecne($prvy, 'h');
            $golyB = $konecne($prvy, 'a');
            if ($golyA !== $golyB) $vitaz = $golyA > $golyB ? $timA : $timB;
        }

        // Skore sa zapisuje v poradi zapasu, pavuk ho ale zobrazuje v poradi
        // dvojice — tim A je hore. V prvom zapase bol tim A hostom, takze sa
        // jeho vysledok otoci; inak by dvojica 3:2 vyzerala ako 2:3.
        $zapasNaVystup = fn($z, $otocit = false) => $z === null ? null : [
            'game_id'   => (int)$z['game_id'],
            'start_time'=> $z['start_time'],
            'home_name' => $otocit ? $z['away_name'] : $z['home_name'],
            'away_name' => $otocit ? $z['home_name'] : $z['away_name'],
            'hs'        => ($otocit ? $z['ag'] : $z['hs']) === null ? null : (int)($otocit ? $z['ag'] : $z['hs']),
            'ag'        => ($otocit ? $z['hs'] : $z['ag']) === null ? null : (int)($otocit ? $z['hs'] : $z['ag']),
            'hf'        => ($otocit ? $z['af'] : $z['hf']) === null ? null : (int)($otocit ? $z['af'] : $z['hf']),
            'af'        => ($otocit ? $z['hf'] : $z['af']) === null ? null : (int)($otocit ? $z['hf'] : $z['af']),
            'approved'  => (bool)$z['result_approved'],
        ];

        // V barazi a osemfinale sa da povod pomenovat miestom v tabulke; do
        // dalsich faz sa postupuje z dvojice, ktoru pozna uz sam pavuk.
        $povod = function ($id) use ($kod, $tabulka) {
            if ($id === null || $kod !== 'PO' && $kod !== 'R16') return null;
            return isset($tabulka[$id]) ? $tabulka[$id] . '. v tabuľke' : null;
        };

        $zoznam[] = [
            'tie_id'     => $prvy['tie_id'] ?? null,
            'team_a'     => ['id' => $timA, 'name' => $menoA, 'logo' => $logoA,
                             'origin' => $povod($timA)],
            'team_b'     => ['id' => $timB, 'name' => $menoB, 'logo' => $logoB,
                             'origin' => $povod($timB)],
            'goals_a'    => $golyA,
            'goals_b'    => $golyB,
            'winner_id'  => $vitaz,
            'first_leg'  => $zapasNaVystup($prvy, $odveta !== null),
            'second_leg' => $zapasNaVystup($odveta),
        ];
    }

    // Poradie dvojic podla cisla v tie_id (PO-1, PO-2, ... PO-10).
    usort($zoznam, function ($x, $y) {
        $n = fn($t) => $t === null ? 0 : (int)substr(strrchr($t, '-'), 1);
        return $n($x['tie_id']) <=> $n($y['tie_id']);
    });

    // Prvych osem baraz nehra, ale v strome uz svoje miesto ma: caka na vitaza
    // konkretnej dvojice. Vitaz PO-i hra v osemfinale proti nasadenemu (9-i),
    // takze nasadeny patri do riadku vedla PO-(9-i) — nie do zoznamu nad
    // barazou, kde by sa nedalo vycitat, na koho caka.
    if ($kod === 'PO') {
        $klub = $pdo->prepare('SELECT s.rank, c.club_id, c.club_name, c.logo_file
                                 FROM "lm2026-27".group_standings s
                                 JOIN admin.uefa_clubs c ON c.club_id = s.team_id
                                WHERE s.phase = \'LEAGUE\' AND s.rank BETWEEN 1 AND 8
                                ORDER BY s.rank');
        $klub->execute();
        $nasadeni = [];
        foreach ($klub->fetchAll() as $k) {
            $nasadeni[(int)$k['rank']] = ['id' => (int)$k['club_id'], 'name' => $k['club_name'],
                                          'logo' => $k['logo_file'],
                                          'origin' => (int)$k['rank'] . '. v tabuľke'];
        }

        // Nasadeny sa vlozi ako samostatny riadok pred dvojicu, z ktorej mu
        // pride super — v strome tak stoji presne tam, kde na neho caka.
        $sPriamymi = [];
        foreach ($zoznam as $t) {
            $i = (int)substr(strrchr((string)$t['tie_id'], '-'), 1);
            $rank = 9 - $i;
            if (isset($nasadeni[$rank])) {
                $sPriamymi[] = ['tie_id' => null, 'seeded' => true,
                                'team_a' => $nasadeni[$rank],
                                'team_b' => ['id' => null, 'name' => null, 'logo' => null, 'origin' => null],
                                'goals_a' => null, 'goals_b' => null, 'winner_id' => null,
                                'first_leg' => null, 'second_leg' => null];
            }
            $sPriamymi[] = $t;
        }
        $zoznam = $sPriamymi;
    }

    $vystup[] = [
        'phase'  => $kod,
        'name'   => $nazov,
        'ties'   => $zoznam,
        // Faza bez urcenych timov sa v pavuku ukaze ako prazdna kostra.
        'ready'  => (bool)array_filter($zoznam, fn($t) => $t['team_a']['id'] !== null),
    ];
}

json_ok($vystup);
