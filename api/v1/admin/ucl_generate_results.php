<?php
// GET  /v1/admin/ucl-generate-results — kolko zapasov ligovej fazy je uz dohranych
// POST /v1/admin/ucl-generate-results — vygeneruje vysledky dohranych zapasov ligovej fazy
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
// Predlzenie sa v ligovej faze nehra, remiza je platny vysledok, takze
// home_score_final zostava prazdne.
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

$leagueSql = 'FROM ' . UCL_SCHEMA . '.games
               WHERE game_type_code = \'LEAGUE\'
                 AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL';
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

$sel = 'SELECT game_id ' . $leagueSql . $finishedSql
     . ($replace ? '' : ' AND home_score_regular IS NULL')
     . ' ORDER BY start_time, game_id';

$games = $pdo->query($sel)->fetchAll(PDO::FETCH_COLUMN);
if (!$games) {
    $finished = (int)$pdo->query('SELECT COUNT(*) ' . $leagueSql . $finishedSql)->fetchColumn();
    json_error($finished === 0
        ? 'Zatiaľ nie je dohraný ani jeden zápas ligovej fázy — posuň termíny do minulosti.'
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

    foreach ($games as $gameId) {
        $upd->execute([ucl_random_goals(), ucl_random_goals(), (int)$gameId]);
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
