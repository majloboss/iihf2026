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

        if ($odveta) {
            if ($maVysledok($prvy) && $maVysledok($odveta)) {
                // A bol v prvom zapase hostom, v odvete domacim.
                $golyA = (int)$prvy['ag'] + (int)$odveta['hs'];
                $golyB = (int)$prvy['hs'] + (int)$odveta['ag'];

                if ($golyA !== $golyB) {
                    $vitaz = $golyA > $golyB ? $timA : $timB;
                } elseif ($odveta['hf'] !== null && $odveta['af'] !== null
                          && $odveta['hf'] !== $odveta['af']) {
                    // Predlzenie v odvete: domaci odvety je tim A.
                    $vitaz = (int)$odveta['hf'] > (int)$odveta['af'] ? $timA : $timB;
                }
            }
        } elseif ($maVysledok($prvy)) {
            $golyA = (int)$prvy['hs'];
            $golyB = (int)$prvy['ag'];
            if ($golyA !== $golyB) {
                $vitaz = $golyA > $golyB ? $timA : $timB;
            } elseif ($prvy['hf'] !== null && $prvy['af'] !== null && $prvy['hf'] !== $prvy['af']) {
                $vitaz = (int)$prvy['hf'] > (int)$prvy['af'] ? $timA : $timB;
            }
        }

        $zapasNaVystup = fn($z) => $z === null ? null : [
            'game_id'   => (int)$z['game_id'],
            'start_time'=> $z['start_time'],
            'home_name' => $z['home_name'],
            'away_name' => $z['away_name'],
            'hs'        => $z['hs'] === null ? null : (int)$z['hs'],
            'ag'        => $z['ag'] === null ? null : (int)$z['ag'],
            'hf'        => $z['hf'] === null ? null : (int)$z['hf'],
            'af'        => $z['af'] === null ? null : (int)$z['af'],
            'approved'  => (bool)$z['result_approved'],
        ];

        $zoznam[] = [
            'tie_id'     => $prvy['tie_id'] ?? null,
            'team_a'     => ['id' => $timA, 'name' => $menoA, 'logo' => $logoA],
            'team_b'     => ['id' => $timB, 'name' => $menoB, 'logo' => $logoB],
            'goals_a'    => $golyA,
            'goals_b'    => $golyB,
            'winner_id'  => $vitaz,
            'first_leg'  => $zapasNaVystup($prvy),
            'second_leg' => $zapasNaVystup($odveta),
        ];
    }

    // Poradie dvojic podla cisla v tie_id (PO-1, PO-2, ... PO-10).
    usort($zoznam, function ($x, $y) {
        $n = fn($t) => $t === null ? 0 : (int)substr(strrchr($t, '-'), 1);
        return $n($x['tie_id']) <=> $n($y['tie_id']);
    });

    $vystup[] = [
        'phase'  => $kod,
        'name'   => $nazov,
        'ties'   => $zoznam,
        // Faza bez urcenych timov sa v pavuku ukaze ako prazdna kostra.
        'ready'  => (bool)array_filter($zoznam, fn($t) => $t['team_a']['id'] !== null),
    ];
}

json_ok($vystup);
