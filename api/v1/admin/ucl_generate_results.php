<?php
// GET  /v1/admin/ucl-generate-results — kolko zapasov ligovej fazy uz ma vysledok
// POST /v1/admin/ucl-generate-results — vygeneruje vysledky vsetkych zapasov ligovej fazy
//
// Testovaci nastroj: naplni vysledky, aby sa dala overit ligova tabulka,
// bodovanie tipov a postupove pasma. Realny vysledok sa zadava cez
// /v1/admin/ucl-game-update, ktore odmietne zapas pred vykopom — tu sa zapisuje
// priamo, lebo testovacie zapasy este len pridu.
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

$countSql = 'SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games WHERE game_type_code = \'LEAGUE\'';

if ($method === 'GET') {
    json_ok([
        'league_games' => (int)$pdo->query($countSql)->fetchColumn(),
        'with_result'  => (int)$pdo->query($countSql . ' AND home_score_regular IS NOT NULL')->fetchColumn(),
        'approved'     => (int)$pdo->query($countSql . ' AND result_approved')->fetchColumn(),
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
// Bez replace sa doplnia len zapasy bez vysledku, uz zadane zostanu.
$replace = !empty($body['replace']);

$sql = $countSql;
$sel = 'SELECT game_id FROM ' . UCL_SCHEMA . '.games
         WHERE game_type_code = \'LEAGUE\'
           AND home_team_id IS NOT NULL AND away_team_id IS NOT NULL'
     . ($replace ? '' : ' AND home_score_regular IS NULL')
     . ' ORDER BY game_id';

$games = $pdo->query($sel)->fetchAll(PDO::FETCH_COLUMN);
if (!$games) {
    json_error($replace
        ? 'V ligovej fáze niet zápasov s určenými tímami — najprv načítaj zápasy z PDF'
        : 'Všetky zápasy ligovej fázy už majú výsledok. Na prepísanie zapni Prepísať existujúce.', 400);
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
