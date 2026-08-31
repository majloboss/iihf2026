<?php
// GET  /v1/admin/ucl-generate-tips — kolko tipov uz existuje a kolko ich moze vzniknut
// POST /v1/admin/ucl-generate-tips — vygeneruje tipy vsetkych hracov na ligovu fazu
//
// Testovaci nastroj: naplni tipy, aby sa dalo overit bodovanie, poradie a
// zobrazenie tipov ostatnych. Realny pouzivatel tipuje cez /v1/ucl/tips, ktore
// kontroluje uzavierku — tu sa tipy zapisuju priamo, lebo testovacie zapasy
// mozu byt uz po termine.
//
// Tipuju sa vsetky zapasy s urcenymi timami — teda ligova faza a tie fazy
// playoff, ktorym uz boli zostavene dvojice. Zapas bez timov sa tipovat neda.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

// Tipy hracov kopiruju realne futbalove skore: najcastejsie 0-2 goly.
// Vahy zodpovedaju zhruba rozlozeniu golov v Lige majstrov.
const GOAL_WEIGHTS = [0 => 26, 1 => 33, 2 => 22, 3 => 12, 4 => 5, 5 => 2];

function ucl_random_goals(): int {
    $total = array_sum(GOAL_WEIGHTS);
    $roll  = random_int(1, $total);
    foreach (GOAL_WEIGHTS as $goals => $weight) {
        $roll -= $weight;
        if ($roll <= 0) return $goals;
    }
    return 1;
}

// Tipuju vsetci aktivni pouzivatelia vratane admina — v tipovacke tipuje kazdy.
$usersSql = 'SELECT id FROM admin.users WHERE is_active ORDER BY id';
$gamesSql = 'SELECT game_id FROM ' . UCL_SCHEMA . '.games
              WHERE home_team_id IS NOT NULL AND away_team_id IS NOT NULL
              ORDER BY game_id';

if ($method === 'GET') {
    $users = (int)$pdo->query('SELECT COUNT(*) FROM admin.users WHERE is_active')->fetchColumn();
    $games = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games
                                WHERE home_team_id IS NOT NULL
                                  AND away_team_id IS NOT NULL')->fetchColumn();
    json_ok([
        'users'         => $users,
        'league_games'  => $games,
        'possible_tips' => $users * $games,
        'existing_tips' => (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.tips')->fetchColumn(),
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body    = json_decode(file_get_contents('php://input'), true) ?: [];
// Bez replace sa doplnia len chybajuce tipy, existujuce zostanu nedotknute.
$replace = !empty($body['replace']);

$users = $pdo->query($usersSql)->fetchAll(PDO::FETCH_COLUMN);
$games = $pdo->query($gamesSql)->fetchAll(PDO::FETCH_COLUMN);
if (!$users) json_error('Niet aktívnych používateľov', 400);
if (!$games) json_error('Niet zápasov s určenými tímami — načítaj zápasy z PDF alebo zostav dvojice play-off', 400);

try {
    $pdo->beginTransaction();

    if ($replace) {
        // Zmazu sa tipy vsetkych zapasov, ktore maju urcene timy.
        $pdo->exec('DELETE FROM ' . UCL_SCHEMA . '.tips t
                     USING ' . UCL_SCHEMA . '.games g
                     WHERE g.game_id = t.game_id
                       AND g.home_team_id IS NOT NULL AND g.away_team_id IS NOT NULL');
    }

    // entered_by_admin oznacuje, ze tip nezadal sam hrac.
    $ins = $pdo->prepare('INSERT INTO ' . UCL_SCHEMA . '.tips
        (user_id, game_id, home_score_tip, away_score_tip, entered_by_admin)
        VALUES (?, ?, ?, ?, TRUE)
        ON CONFLICT (user_id, game_id) DO NOTHING');

    $created = 0;
    foreach ($games as $gameId) {
        foreach ($users as $userId) {
            $ins->execute([(int)$userId, (int)$gameId, ucl_random_goals(), ucl_random_goals()]);
            $created += $ins->rowCount();
        }
    }

    $pdo->commit();

    // Ak uz su schvalene vysledky, tipy hned dostanu body.
    require_once __DIR__ . '/../../helpers/ucl_recalc_fn.php';
    $scored = ucl_recalc_points($pdo);

    json_ok(['created' => $created, 'users' => count($users),
             'games' => count($games), 'scored' => $scored]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Generovanie tipov zlyhalo: ' . $e->getMessage(), 500);
}
