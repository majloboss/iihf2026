<?php
// GET  /v1/admin/ucl-generate-results — kolko zapasov je uz dohranych
// POST /v1/admin/ucl-generate-results — vygeneruje vysledky dohranych zapasov
//
// Testovaci nastroj: naplni vysledky, aby sa dala overit ligova tabulka,
// bodovanie tipov a postupove pasma.
//
// Vysledok dostane iba zapas, ktory je uz dohrany — teda taky, ktoremu od
// vykopu ubehli aspon tri hodiny — a este nema zadane skore. Vdaka tomu sa
// da pocas testovania posuvat datumami a casmi zapasov a nastroj vzdy doplni
// presne to, co uz malo byt odohrane.
//
// Realny vysledok sa zadava cez /v1/admin/ucl-game-update, ktore navyse riesi
// dvojice a predlzenie; tu sa zapisuje priamo, lebo ide o hromadne naplnenie.
//
// Vysledok dostane kazdy zapas s urcenymi timami — ligova faza aj playoff,
// ktoremu uz boli zostavene dvojice.
//
// V ligovej faze je remiza platny vysledok. V odvete a vo finale by vsak
// nechala dvojicu nerozhodnutu a dalsia faza by sa nedala zostavit, preto sa
// tam dorieši predlzenim.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

// Rozlozenie golov zodpovedajuce realnym zapasom Ligy majstrov.
const GOAL_WEIGHTS = [0 => 24, 1 => 31, 2 => 23, 3 => 13, 4 => 6, 5 => 2, 6 => 1];

function ucl_random_goals(): int {
    $total = array_sum(GOAL_WEIGHTS);
    $roll  = random_int(1, $total);
    foreach (GOAL_WEIGHTS as $goals => $weight) {
        $roll -= $weight;
        if ($roll <= 0) return $goals;
    }
    return 1;
}

// Zapas sa povazuje za dohrany tri hodiny po vykope — 90 minut hry, polcas
// a rezerva na nadstaveny cas. start_time je naive UTC, preto sa porovnava
// s UTC casom, nie s NOW() v zone servera.
const UCL_MATCH_HOURS = 3;

// Vysledok dostane kazdy zapas s urcenymi timami — ligova faza aj tie fazy
// playoff, ktorym uz boli zostavene dvojice.
$leagueSql = 'FROM ' . UCL_SCHEMA . '.games
               WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL';
$finishedSql = " AND start_time + INTERVAL '" . UCL_MATCH_HOURS . " hours'
                       <= (NOW() AT TIME ZONE 'UTC')";

if ($method === 'GET') {
    $one = fn(string $sql) => (int)$pdo->query('SELECT COUNT(*) ' . $sql)->fetchColumn();
    json_ok([
        'league_games' => $one($leagueSql),
        'finished'     => $one($leagueSql . $finishedSql),
        'pending'      => $one($leagueSql . $finishedSql . ' AND home_score_regular IS NULL'),
        'with_result'  => $one($leagueSql . ' AND home_score_regular IS NOT NULL'),
        'approved'     => $one($leagueSql . ' AND result_approved'),
        'match_hours'  => UCL_MATCH_HOURS,
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
// Prepisat existujuce zoberie aj dohrane zapasy, ktore uz vysledok maju.
$replace = !empty($body['replace']);

$sel = 'SELECT game_id, game_type_code, tie_id, leg ' . $leagueSql . $finishedSql
     . ($replace ? '' : ' AND home_score_regular IS NULL')
     . ' ORDER BY start_time, game_id';

$games = $pdo->query($sel)->fetchAll();
if (!$games) {
    $finished = (int)$pdo->query('SELECT COUNT(*) ' . $leagueSql . $finishedSql)->fetchColumn();
    json_error($finished === 0
        ? 'Zatiaľ nie je dohraný ani jeden zápas — posuň termíny do minulosti.'
        : 'Všetky dohrané zápasy už majú výsledok. Na prepísanie zapni Prepísať existujúce.', 400);
}

try {
    $pdo->beginTransaction();

    // Vysledok sa rovno schvali, aby sa prepocitala tabulka aj body za tipy.
    $upd = $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                             SET home_score_regular = ?, away_score_regular = ?,
                                 home_score_final = NULL, away_score_final = NULL,
                                 result_approved = TRUE, tips_open = FALSE,
                                 updated_at = NOW()
                           WHERE game_id = ?');

    // Odveta a finale nesmu skoncit remizou na sucet — dvojica by zostala
    // nerozhodnuta a dalsia faza by sa nedala zostavit. Preto sa pri nich
    // pripadna remiza dorieši predlzenim.
    $updET = $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                               SET home_score_regular = ?, away_score_regular = ?,
                                   home_score_final = ?, away_score_final = ?,
                                   result_approved = TRUE, tips_open = FALSE,
                                   updated_at = NOW()
                             WHERE game_id = ?');

    $suctyDvojice = $pdo->prepare('SELECT home_team_id, away_team_id,
                                          home_score_regular AS hs, away_score_regular AS ag
                                     FROM ' . UCL_SCHEMA . '.games
                                    WHERE tie_id = ? AND leg = 1');

    foreach ($games as $g) {
        $gameId = (int)$g['game_id'];
        $h = ucl_random_goals();
        $a = ucl_random_goals();

        // Ci moze zapas skoncit predlzenim: finale alebo odveta dvojice.
        $mozeET = $g['game_type_code'] === 'F'
               || ((int)$g['leg'] === 2 && $g['tie_id'] !== null);

        if (!$mozeET) {
            $upd->execute([$h, $a, $gameId]);
            continue;
        }

        // Sucet za dvojicu: domaci odvety bol v prvom zapase hostom.
        $remiza = $h === $a;
        if ($g['game_type_code'] !== 'F' && $g['tie_id'] !== null) {
            $suctyDvojice->execute([$g['tie_id']]);
            $prvy = $suctyDvojice->fetch();
            if ($prvy && $prvy['hs'] !== null) {
                $remiza = ((int)$prvy['ag'] + $h) === ((int)$prvy['hs'] + $a);
            }
        }

        if (!$remiza) {
            $upd->execute([$h, $a, $gameId]);
            continue;
        }

        // Pri remize rozhodne predlzenie — vitaza urci nahoda.
        $hf = $h;
        $af = $a;
        if (random_int(0, 1) === 0) $hf++; else $af++;
        $updET->execute([$h, $a, $hf, $af, $gameId]);
    }

    // Rovnaky prepocet, aky robi zadanie vysledku adminom.
    require_once __DIR__ . '/../../helpers/ucl_standings_fn.php';
    require_once __DIR__ . '/../../helpers/ucl_recalc_fn.php';
    $teams  = ucl_recalc_standings($pdo);
    $points = ucl_recalc_points($pdo);

    $pdo->commit();
    json_ok(['updated' => count($games), 'standings_rows' => $teams, 'tips_scored' => $points]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Generovanie výsledkov zlyhalo: ' . $e->getMessage(), 500);
}
