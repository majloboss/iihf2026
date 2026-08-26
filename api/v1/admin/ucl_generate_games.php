<?php
// POST /v1/admin/ucl-generate-games — vygeneruje rozlosovanie LM 2026/27
// GET  /v1/admin/ucl-generate-games — prehlad aktualneho stavu zapasov
//
// Ligova faza: 36 klubov, 8 kol, kazdy tim 8 zapasov (4 doma, 4 vonku),
// bez odviet. Utorok + streda, kolo kazde dva tyzdne od 5.9.2026.
//
// Playoff: od 1.3.2027, utorky a stredy.
//   PO  — kluby z miest 9-24, 8 dvojic, zapas + odveta -> 8 vitazov
//   R16 — 8 vitazov + kluby z miest 1-8, zapas + odveta
//   QF, SF — zapas + odveta
//   F   — jediny zapas, o 3. miesto sa nehra
//
// Timy v playoff sa doplnia az podla vysledkov, preto zostavaju prazdne.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

if ($method === 'GET') {
    $rows = $pdo->query('SELECT game_type_code, COUNT(*) AS games,
                                COUNT(home_team_id) AS with_home,
                                MIN(start_time) AS first_game,
                                MAX(start_time) AS last_game
                           FROM ' . UCL_SCHEMA . '.games
                          GROUP BY game_type_code ORDER BY MIN(start_time)')->fetchAll();
    $total = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games')->fetchColumn();
    $clubs = (int)$pdo->query('SELECT COUNT(*) FROM admin.uefa_clubs WHERE is_active')->fetchColumn();
    json_ok(['phases' => $rows, 'total_games' => $total, 'active_clubs' => $clubs]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$leagueStart = trim((string)($body['league_start'] ?? '2026-09-05'));
$playoffStart = trim((string)($body['playoff_start'] ?? '2027-03-01'));
$seed = (int)($body['seed'] ?? 2026);
$replace = !empty($body['replace']);

foreach (['league_start' => $leagueStart, 'playoff_start' => $playoffStart] as $label => $date) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || !strtotime($date)) {
        json_error("Neplatný dátum v poli $label", 400);
    }
}
if (strtotime($playoffStart) <= strtotime($leagueStart)) {
    json_error('Playoff musí začínať neskôr ako ligová fáza', 400);
}

$existing = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games')->fetchColumn();
if ($existing > 0 && !$replace) {
    json_error("V súťaži už je $existing zápasov. Na prepísanie zapni voľbu Nahradiť existujúce.", 409);
}

// Na zapasoch visia tipy hracov. Prepisat rozlosovanie by ich zmazalo,
// preto sa generovanie odmietne — kostra sa robi pred spustenim tipovania.
$tipCount = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.tips')->fetchColumn();
if ($tipCount > 0) {
    json_error("K zápasom už existuje $tipCount tipov. Rozlosovanie sa nedá pregenerovať bez ich straty — uprav zápasy jednotlivo v správe zápasov.", 409);
}

// Prvy utorok od zadaneho datumu.
$firstTuesday = function (string $date): DateTimeImmutable {
    $d = new DateTimeImmutable($date . ' 21:00:00');
    while ((int)$d->format('N') !== 2) $d = $d->modify('+1 day');
    return $d;
};

// Deterministicke miesanie, aby sa dal zreb zopakovat rovnako.
$shuffle = function (array $items, int $seed): array {
    $s = $seed;
    for ($i = count($items) - 1; $i > 0; $i--) {
        $s = ($s * 1103515245 + 12345) & 0x7fffffff;
        $j = (int)floor(($s / 0x7fffffff) * ($i + 1));
        [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
    }
    return $items;
};

$clubs = $pdo->query('SELECT club_id FROM admin.uefa_clubs WHERE is_active ORDER BY club_id')
             ->fetchAll(PDO::FETCH_COLUMN);
if (count($clubs) < 36) {
    json_error('V číselníku je len ' . count($clubs) . ' aktívnych klubov, ligová fáza potrebuje 36', 400);
}

$teams = array_slice($shuffle($clubs, $seed), 0, 36);
$n = 36;
$rounds = 8;

try {
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM ' . UCL_SCHEMA . '.games');

    $ins = $pdo->prepare('INSERT INTO ' . UCL_SCHEMA . '.games
        (game_id, home_team_id, away_team_id, start_time, venue, game_type_code, game_type_name)
        VALUES (?, ?, ?, ?, ?, ?, ?)');

    $gameId = 0;
    $created = ['LEAGUE' => 0, 'PO' => 0, 'R16' => 0, 'QF' => 0, 'SF' => 0, 'F' => 0];

    // ---------- Ligova faza ----------
    // Kruhovy system: prvy tim stoji, ostatne rotuju. Z 35 moznych kol berieme 8,
    // cim je zarucene, ze sa ziadna dvojica nestretne dvakrat.
    $tuesday = $firstTuesday($leagueStart);
    $rot = array_slice($teams, 1);
    $homeCount = array_fill_keys($teams, 0);

    for ($r = 0; $r < $rounds; $r++) {
        $order = array_merge([$teams[0]], array_slice($rot, $r), array_slice($rot, 0, $r));
        $roundTuesday = $tuesday->modify('+' . ($r * 14) . ' days');

        for ($i = 0; $i < $n / 2; $i++) {
            $a = $order[$i];
            $b = $order[$n - 1 - $i];
            // Doma hra ten, kto ma zatial menej domacich zapasov.
            $home = $a; $away = $b;
            if ($homeCount[$a] > $homeCount[$b] || ($homeCount[$a] === $homeCount[$b] && ($r + $i) % 2 === 1)) {
                $home = $b; $away = $a;
            }
            $homeCount[$home]++;

            // Prvych 8 zapasov kola v utorok, zvysnych 8 v stredu.
            $day = $i < 8 ? $roundTuesday : $roundTuesday->modify('+1 day');
            $ins->execute([++$gameId, $home, $away, $day->format('Y-m-d H:i:s'), '', 'LEAGUE', 'Ligová fáza — ' . ($r + 1) . '. kolo']);
            $created['LEAGUE']++;
        }
    }

    // ---------- Playoff ----------
    // Timy sa doplnia az po ligovej faze, preto NULL.
    $poTuesday = $firstTuesday($playoffStart);
    $week = 0;
    $addPhase = function (string $code, string $name, int $pairs, bool $twoLegs) use (&$gameId, &$created, &$week, $ins, $poTuesday) {
        $legs = $twoLegs ? 2 : 1;
        for ($leg = 1; $leg <= $legs; $leg++) {
            $tue = $poTuesday->modify('+' . ($week * 7) . ' days');
            for ($p = 0; $p < $pairs; $p++) {
                // Polovica dvojic v utorok, polovica v stredu.
                $day = $p < ceil($pairs / 2) ? $tue : $tue->modify('+1 day');
                $label = $twoLegs ? ($name . ($leg === 1 ? ' — 1. zápas' : ' — odveta')) : $name;
                $ins->execute([++$gameId, null, null, $day->format('Y-m-d H:i:s'), '', $code, $label]);
                $created[$code]++;
            }
            $week++;
        }
    };

    $addPhase('PO',  'Play-off o osemfinále', 8, true);
    $addPhase('R16', 'Osemfinále',            8, true);
    $addPhase('QF',  'Štvrťfinále',           4, true);
    $addPhase('SF',  'Semifinále',            2, true);
    $addPhase('F',   'Finále',                1, false);

    // Kontrola: kazdy tim musi mat 8 zapasov, z toho 4 doma.
    $bad = $pdo->query('SELECT COUNT(*) FROM (
            SELECT t.club_id,
                   COUNT(*) FILTER (WHERE g.home_team_id = t.club_id OR g.away_team_id = t.club_id) AS played,
                   COUNT(*) FILTER (WHERE g.home_team_id = t.club_id) AS at_home
              FROM admin.uefa_clubs t
              JOIN ' . UCL_SCHEMA . '.games g
                ON (g.home_team_id = t.club_id OR g.away_team_id = t.club_id)
             WHERE g.game_type_code = \'LEAGUE\'
             GROUP BY t.club_id
            HAVING COUNT(*) FILTER (WHERE g.home_team_id = t.club_id OR g.away_team_id = t.club_id) <> 8
                OR COUNT(*) FILTER (WHERE g.home_team_id = t.club_id) <> 4
        ) x')->fetchColumn();
    if ((int)$bad > 0) {
        throw new RuntimeException("Rozlosovanie je nekonzistentné: $bad tímov nemá 8 zápasov alebo 4 domáce");
    }

    $pdo->commit();
    json_ok(['created' => $created, 'total' => $gameId, 'seed' => $seed,
             'league_start' => $leagueStart, 'playoff_start' => $playoffStart]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Generovanie zlyhalo: ' . $e->getMessage(), 500);
}
