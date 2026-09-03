<?php
// GET /v1/bracket?competition_id=X — pavuk vyradovacej casti
//
// Jeden endpoint pre vsetky sutaze. Rozdiely medzi schemami su v $SUTAZE:
// IIHF ma stlpce team1/score1 a fazu v `phase`, FIFA a UCL home_team_id
// a `game_type_code`. Iba UCL hra dvojzapasy (tie_id + leg), ostatne maju
// jeden zapas na dvojicu.
//
// Nahradza /v1/ucl/bracket, ktory bol napisany natvrdo na schemu lm2026-27.
require_auth();
$pdo = db();
if ($method !== 'GET') json_error('Method not allowed', 405);

$cid = (int)($_GET['competition_id'] ?? 0);
if (!$cid) json_error('Chýba competition_id', 400);

$q = $pdo->prepare('SELECT slug FROM admin.competitions WHERE id = ?');
$q->execute([$cid]);
$slug = $q->fetchColumn();
if (!$slug) json_error('Súťaž neexistuje', 404);

// Popis kazdej sutaze: schema, nazvy stlpcov a fazy v poradi stromu.
//
// `teams` je tabulka timov a stlpce, z ktorych sa berie nazov a logo/vlajka.
// `two_legs` rozlisuje dvojzapasy od jednozapasovych kol.
$SUTAZE = [
    'iihf2026' => [
        'schema' => 'iihf2026',
        'faza' => 'phase', 'id' => 'id', 'cas' => 'starts_at',
        'domaci' => 'team1', 'hostia' => 'team2',
        'skore_h' => 'score1', 'skore_a' => 'score2',
        'final_h' => 'final1', 'final_a' => 'final2',
        'schvalene' => null,          // IIHF nema schvalovanie vysledkov
        'two_legs' => false,
        'teams' => ['tabulka' => 'iihf2026.teams', 'kluc' => 'code',
                    'nazov' => 'name', 'logo' => null, 'kod' => 'code'],
        'fazy' => ['QF' => 'Štvrťfinále', 'SF' => 'Semifinále',
                   'BRONZE' => 'O 3. miesto', 'GOLD' => 'Finále'],
    ],
    'fifa2026' => [
        'schema' => 'fifa2026',
        'faza' => 'game_type_code', 'id' => 'game_id', 'cas' => 'start_time',
        'domaci' => 'home_team_id', 'hostia' => 'away_team_id',
        'skore_h' => 'home_score_regular', 'skore_a' => 'away_score_regular',
        'final_h' => 'home_score_final', 'final_a' => 'away_score_final',
        'schvalene' => 'result_approved',
        'two_legs' => false,
        'teams' => ['tabulka' => 'fifa2026.teams', 'kluc' => 'team_id',
                    'nazov' => 'team_name', 'logo' => null, 'kod' => 'team_code'],
        'fazy' => ['R32' => 'Šestnásťfinále', 'R16' => 'Osemfinále',
                   'QF' => 'Štvrťfinále', 'SF' => 'Semifinále',
                   'BM' => 'O 3. miesto', 'F' => 'Finále'],
    ],
    'ucl2026' => [
        'schema' => 'lm2026-27',
        'faza' => 'game_type_code', 'id' => 'game_id', 'cas' => 'start_time',
        'domaci' => 'home_team_id', 'hostia' => 'away_team_id',
        'skore_h' => 'home_score_regular', 'skore_a' => 'away_score_regular',
        'final_h' => 'home_score_final', 'final_a' => 'away_score_final',
        'schvalene' => 'result_approved',
        'two_legs' => true,
        'teams' => ['tabulka' => 'admin.uefa_clubs', 'kluc' => 'club_id',
                    'nazov' => 'club_name', 'logo' => 'logo_file'],
        'fazy' => ['PO' => 'Baráž o play-off', 'R16' => 'Osemfinále',
                   'QF' => 'Štvrťfinále', 'SF' => 'Semifinále', 'F' => 'Finále'],
    ],
];

if (!isset($SUTAZE[$slug])) json_ok([]);   // sutaz bez pavuka
$S = $SUTAZE[$slug];
$T = $S['teams'];

$dvojzapas = $S['two_legs'];
$schvalene = $S['schvalene'] ? "g.{$S['schvalene']}" : 'TRUE';
$tieCols   = $dvojzapas ? 'g.tie_id, g.leg,' : 'NULL AS tie_id, NULL AS leg,';

// Klub ma nazov suboru s logom priamo pri sebe. Reprezentacia nie — jej
// vlajka sa sklada z kodu timu podla konvencie (/flags/fifa_flag_mex.png),
// takze staci vratit kod a obrazok si zlozi frontend.
$logoH = $T['logo'] !== null ? "h.{$T['logo']}" : "h.{$T['kod']}";
$logoA = $T['logo'] !== null ? "a.{$T['logo']}" : "a.{$T['kod']}";

$sql = "
    SELECT g.{$S['id']} AS game_id, g.{$S['faza']} AS faza, {$tieCols}
           g.{$S['cas']} AS start_time,
           g.{$S['skore_h']} AS hs, g.{$S['skore_a']} AS ag,
           g.{$S['final_h']} AS hf, g.{$S['final_a']} AS af,
           {$schvalene} AS result_approved,
           g.{$S['domaci']} AS home_team_id, g.{$S['hostia']} AS away_team_id,
           h.{$T['nazov']} AS home_name, {$logoH} AS home_logo,
           a.{$T['nazov']} AS away_name, {$logoA} AS away_logo
      FROM \"{$S['schema']}\".games g
      LEFT JOIN {$T['tabulka']} h ON h.{$T['kluc']} = g.{$S['domaci']}
      LEFT JOIN {$T['tabulka']} a ON a.{$T['kluc']} = g.{$S['hostia']}
     WHERE g.{$S['faza']} IN (" . implode(',', array_fill(0, count($S['fazy']), '?')) . ")
     ORDER BY g.{$S['faza']}, " . ($dvojzapas ? 'g.tie_id, g.leg, ' : '') . "g.{$S['id']}";

$st = $pdo->prepare($sql);
$st->execute(array_keys($S['fazy']));
$rows = $st->fetchAll();

// Poradie v ligovej tabulke — len UCL, kde sa z neho odvodzuje nasadenie.
$tabulka = [];
if ($slug === 'ucl2026') {
    foreach ($pdo->query('SELECT rank, team_id FROM "lm2026-27".group_standings
                           WHERE phase = \'LEAGUE\' AND team_id IS NOT NULL
                           ORDER BY rank')->fetchAll() as $r) {
        $tabulka[(int)$r['team_id']] = (int)$r['rank'];
    }
}

// Zoskupenie na dvojice. Bez dvojzapasov je kazdy zapas vlastnou dvojicou.
$dvojice = [];
foreach ($rows as $r) {
    $kluc = $dvojzapas ? ($r['tie_id'] ?? ($r['faza'] . '-single')) : $r['game_id'];
    $dvojice[$r['faza']][$kluc][] = $r;
}

$vystup = [];
foreach ($S['fazy'] as $kod => $nazov) {
    $zoznam = [];
    foreach ($dvojice[$kod] ?? [] as $tieId => $zapasy) {
        usort($zapasy, fn($x, $y) => ((int)$x['leg']) <=> ((int)$y['leg']));
        $prvy   = $zapasy[0] ?? null;
        $odveta = $zapasy[1] ?? null;

        // Pri dvojzapase sa dvojica pomenuje podla prveho zapasu, v ktorom je
        // lepsie umiestneny tim hostom — v pavuku ma stat hore.
        $otoc = $odveta !== null;
        $timA  = $otoc ? $prvy['away_team_id'] : $prvy['home_team_id'];
        $timB  = $otoc ? $prvy['home_team_id'] : $prvy['away_team_id'];
        $menoA = $otoc ? $prvy['away_name'] : $prvy['home_name'];
        $menoB = $otoc ? $prvy['home_name'] : $prvy['away_name'];
        $logoA = $otoc ? $prvy['away_logo'] : $prvy['home_logo'];
        $logoB = $otoc ? $prvy['home_logo'] : $prvy['away_logo'];

        $golyA = null;
        $golyB = null;
        $vitaz = null;

        $maVysledok = fn($z) => $z && $z['hs'] !== null && $z['ag'] !== null;

        // Do suctu ide konecny vysledok: ked sa hralo predlzenie alebo penalty,
        // plati skore po nich. Inak by dvojica rozhodnuta v predlzeni vyzerala
        // ako nerozhodna — odveta 2:2 pri prvom zapase 0:2 dava 2:4, nie 2:2.
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

        // Skore sa zapisuje v poradi zapasu, pavuk ho zobrazuje v poradi
        // dvojice — tim A je hore. Prvy zapas dvojzapasu sa preto otoci.
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

        // V barazi a osemfinale UCL sa da povod pomenovat miestom v tabulke.
        $povod = function ($id) use ($kod, $tabulka) {
            if ($id === null || ($kod !== 'PO' && $kod !== 'R16')) return null;
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
            'first_leg'  => $zapasNaVystup($prvy, $otoc),
            'second_leg' => $zapasNaVystup($odveta),
        ];
    }

    if ($dvojzapas) {
        // Poradie dvojic podla cisla v tie_id (PO-1, PO-2, ...).
        //
        // Baraz ide OPACNE: vitaz PO-i hra proti nasadenemu (9-i), takze pri
        // rastucom poradi by prvy stlpec zacinal 8. miestom, kym osemfinale
        // zacina prvym. Stlpce by si nesedeli.
        $klesajuco = $kod === 'PO';
        usort($zoznam, function ($x, $y) use ($klesajuco) {
            $n = fn($t) => $t === null ? 0 : (int)substr(strrchr($t, '-'), 1);
            return $klesajuco ? $n($y['tie_id']) <=> $n($x['tie_id'])
                              : $n($x['tie_id']) <=> $n($y['tie_id']);
        });
    }

    // Prvych osem UCL baraz nehra, ale v strome uz svoje miesto ma: caka na
    // vitaza konkretnej dvojice, preto stoji ako samostatny riadok pred nou.
    if ($slug === 'ucl2026' && $kod === 'PO') {
        $klub = $pdo->query('SELECT s.rank, c.club_id, c.club_name, c.logo_file
                               FROM "lm2026-27".group_standings s
                               JOIN admin.uefa_clubs c ON c.club_id = s.team_id
                              WHERE s.phase = \'LEAGUE\' AND s.rank BETWEEN 1 AND 8
                              ORDER BY s.rank');
        $nasadeni = [];
        foreach ($klub->fetchAll() as $k) {
            $nasadeni[(int)$k['rank']] = ['id' => (int)$k['club_id'], 'name' => $k['club_name'],
                                          'logo' => $k['logo_file'],
                                          'origin' => (int)$k['rank'] . '. v tabuľke'];
        }

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

json_ok(['phases' => $vystup, 'logo_style' => $T['logo'] !== null ? 'club' : 'flag',
         'slug' => $slug]);
