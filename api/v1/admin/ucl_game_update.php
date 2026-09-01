<?php
// POST /v1/admin/ucl-game-update - zapis vysledku a schvalenie
require_auth(true);
$pdo = db();
if ($method !== 'POST') json_error('Method not allowed', 405);
require_once __DIR__ . '/../../helpers/ucl_standings_fn.php';
require_once __DIR__ . '/../../helpers/ucl_recalc_fn.php';

$body   = json_decode(file_get_contents('php://input'), true) ?: [];
$gameId = (int)($body['game_id'] ?? 0);
if (!$gameId) json_error('Chýba game_id', 400);

$num = function ($v) { return ($v === null || $v === '') ? null : (int)$v; };
$hr = $num($body['home_score_regular'] ?? null);
$ar = $num($body['away_score_regular'] ?? null);
$hf = $num($body['home_score_final'] ?? null);
$af = $num($body['away_score_final'] ?? null);
$approved = !empty($body['result_approved']);

foreach ([$hr, $ar, $hf, $af] as $v) {
    if ($v !== null && ($v < 0 || $v > 99)) json_error('Skóre musí byť medzi 0 a 99', 400);
}
if ($approved && ($hr === null || $ar === null)) {
    json_error('Na schválenie výsledku treba vyplniť skóre po 90 minútach', 400);
}

$gs = $pdo->prepare('SELECT start_time, game_type_code, tie_id, leg FROM "lm2026-27".games WHERE game_id = ?');
$gs->execute([$gameId]);
$game = $gs->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

// Vysledok sa neda zadat skor, nez sa zapas zacne hrat.
if ($hr !== null || $ar !== null) {
    $start = new DateTime($game['start_time'], new DateTimeZone('UTC'));
    if (new DateTime('now', new DateTimeZone('UTC')) < $start) {
        json_error('Zápas sa ešte nezačal, výsledok sa nedá zadať', 400);
    }
}

// Kedy sa hra predlzenie:
//   ligova faza  — nikdy, remiza je platny vysledok
//   1. zapas     — nikdy, remiza je platna, rozhodne az sucet po odvete
//   odveta       — len ked je SUCET golov z oboch zapasov rovnaky
//   finale       — pri remize po 90 minutach (hra sa na jeden zapas)
$hasFinal = $hf !== null && $af !== null;
$needsFinal = false;
$jeFinale = $game['game_type_code'] === 'F';
// Goly prveho zapasu z pohladu tymov odvety; vo finale ziadne nie su.
$prevHome = 0;
$prevAway = 0;

if ($jeFinale) {
    $needsFinal = $hr !== null && $ar !== null && $hr === $ar;
} elseif ((int)$game['leg'] === 2 && $game['tie_id'] !== null && $hr !== null && $ar !== null) {
    // Sucet za dvojicu: domaci tejto odvety bol v prvom zapase hostom.
    $first = $pdo->prepare('SELECT home_score_regular, away_score_regular, home_team_id
                              FROM "lm2026-27".games
                             WHERE tie_id = ? AND leg = 1');
    $first->execute([$game['tie_id']]);
    $prev = $first->fetch();

    if ($approved && (!$prev || $prev['home_score_regular'] === null || $prev['away_score_regular'] === null)) {
        json_error('Najprv zadaj výsledok prvého zápasu tejto dvojice', 400);
    }
    if ($prev && $prev['home_score_regular'] !== null && $prev['away_score_regular'] !== null) {
        // Domaci odvety = hostia prveho zapasu, preto sa skore prehadzuje.
        $prevHome = (int)$prev['away_score_regular'];
        $prevAway = (int)$prev['home_score_regular'];
        $sumHome = $hr + $prevHome;
        $sumAway = $ar + $prevAway;
        $needsFinal = $sumHome === $sumAway;
    }
}

if ($needsFinal && $approved) {
    if (!$hasFinal) json_error('Rovnaký súčet gólov — zadaj konečný výsledok po predĺžení alebo penaltách', 400);
    if ($hf < $hr || $af < $ar) json_error('Konečný výsledok nemôže byť nižší ako po 90 minútach', 400);

    // O postupe rozhoduje sucet za dvojicu, nie vysledok jedneho zapasu.
    // Odveta moze skoncit remizou a dvojica byt aj tak rozhodnuta: pri
    // sucte 2:2 po 90 minutach da hostujuci tim v predlzeni dva goly,
    // odveta konci 2:2 a za dvojicu je to 4:2 — postupujuci je jasny.
    //
    // Vo finale sa nic nepripocitava, tam plati vysledok samotneho zapasu.
    $finalHome = $jeFinale ? $hf : $hf + $prevHome;
    $finalAway = $jeFinale ? $af : $af + $prevAway;

    // Penalty sa rataju ako jeden gol pre vitaza, takze nerozhodne
    // skoncit nemoze — vzdy je niekto o gol vpredu.
    if ($finalHome === $finalAway) {
        json_error('Po predĺžení musí byť rozhodnuté — penalty sa rátajú ako jeden gól', 400);
    }
} elseif ($hasFinal && !$needsFinal) {
    json_error('Predĺženie sa hrá len vo finále pri remíze alebo v odvete pri rovnakom súčte gólov', 400);
}

try {
    $pdo->beginTransaction();
    $approvedSql = $approved ? 'TRUE' : 'FALSE';
    $tipsOpenSql = $approved ? 'FALSE' : 'tips_open';
    $stmt = $pdo->prepare('
        UPDATE "lm2026-27".games
           SET home_score_regular = ?, away_score_regular = ?,
               home_score_final = ?, away_score_final = ?,
               result_approved = ' . $approvedSql . ', tips_open = ' . $tipsOpenSql . ',
               updated_at = NOW()
         WHERE game_id = ?
        RETURNING game_id, home_score_regular, away_score_regular,
                  home_score_final, away_score_final, result_approved, tips_open');
    $stmt->execute([$hr, $ar, $hf, $af, $gameId]);
    $row = $stmt->fetch();
    if (!$row) json_error('Zápas neexistuje', 404);

    // Vysledok meni tabulku aj body hracov.
    $teams  = ucl_recalc_standings($pdo);
    $points = ucl_recalc_points($pdo);

    $pdo->commit();
    json_ok(['game' => $row, 'standings_rows' => $teams, 'tips_updated' => $points]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
