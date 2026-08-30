<?php
// GET  /v1/admin/ucl-load-pdf — prehlad, co je v games_pdf a co v games
// POST /v1/admin/ucl-load-pdf — nahra zapasy z games_pdf do games
//
// "lm2026-27".games_pdf je referencna kopia rozpisu zo zdrojoveho PDF. Pocas
// testovania sa z nej zapasy opakovane nahravaju do games, aby sa dalo kedykolvek
// vratit k cistemu stavu. Preto sa games pred naplnenim vyprazdni.
//
// Na zapasoch mozu visiet tipy — tie by sa stratili, preto import bez priznaku
// confirm skonci chybou 409 a admin musi mazanie potvrdit.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

// game_type_name musi sediet s tym, co cakaju UclGames a v1/ucl/games.php:
// kolo sa z neho vytahuje regularnym vyrazom '([0-9]+)\. kolo'.
$phaseName = [
    'PO'  => 'Baráž o postup do play-off',
    'R16' => 'Osemfinále',
    'QF'  => 'Štvrťfinále',
    'SF'  => 'Semifinále',
    'F'   => 'Finále',
];

// Tabulka nemusi existovat, ak sa este nespustila migracia 062.
$hasPdf = (bool)$pdo->query(
    "SELECT to_regclass('\"lm2026-27\".games_pdf') IS NOT NULL")->fetchColumn();

if ($method === 'GET') {
    if (!$hasPdf) {
        json_ok(['has_pdf_table' => false, 'phases' => [], 'total_pdf' => 0,
                 'total_games' => 0, 'tips' => 0]);
    }
    $phases = $pdo->query('SELECT phase, COUNT(*) AS games,
                                  COUNT(home_team_id) AS with_teams,
                                  MIN(starts_at) AS first_game,
                                  MAX(starts_at) AS last_game
                             FROM ' . UCL_SCHEMA . '.games_pdf
                            GROUP BY phase ORDER BY MIN(starts_at)')->fetchAll();
    json_ok([
        'has_pdf_table' => true,
        'phases'        => $phases,
        'total_pdf'     => (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games_pdf')->fetchColumn(),
        'total_games'   => (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games')->fetchColumn(),
        'tips'          => (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.tips')->fetchColumn(),
    ]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);
if (!$hasPdf) json_error('Tabuľka games_pdf neexistuje — najprv spusti migráciu 062', 400);

$body    = json_decode(file_get_contents('php://input'), true) ?: [];
$confirm = !empty($body['confirm']);

$tips = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.tips')->fetchColumn();
if ($tips > 0 && !$confirm) {
    json_error("Na zápasoch visí $tips tipov. Načítanie ich zmaže — potvrď voľbu Zmazať aj tipy.", 409);
}

$pdfGames = $pdo->query('SELECT * FROM ' . UCL_SCHEMA . '.games_pdf ORDER BY game_number')->fetchAll();
if (!$pdfGames) json_error('Tabuľka games_pdf je prázdna', 400);

try {
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM ' . UCL_SCHEMA . '.tips');
    $pdo->exec('DELETE FROM ' . UCL_SCHEMA . '.games');

    $ins = $pdo->prepare('INSERT INTO ' . UCL_SCHEMA . '.games
        (game_id, home_team_id, away_team_id, start_time, venue,
         game_type_code, game_type_name, tie_id, leg, flashscore_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

    $created = [];
    foreach ($pdfGames as $g) {
        $phase = $g['phase'];
        if ($phase === 'LEAGUE') {
            $name = 'Ligová fáza — ' . (int)$g['round_no'] . '. kolo';
        } else {
            $name = $phaseName[$phase] ?? $phase;
            if ($g['leg'] !== null) {
                $name .= (int)$g['leg'] === 1 ? ' — 1. zápas' : ' — odveta';
            }
        }
        $ins->execute([
            (int)$g['game_number'],
            $g['home_team_id'] !== null ? (int)$g['home_team_id'] : null,
            $g['away_team_id'] !== null ? (int)$g['away_team_id'] : null,
            $g['starts_at'],
            $g['venue'] ?? '',
            $phase, $name, $g['tie_id'], $g['leg'], $g['flashscore_url'],
        ]);
        $created[$phase] = ($created[$phase] ?? 0) + 1;
    }

    // Zapasy sa nahrali nanovo, stara tabulka a body uz neplatia.
    $pdo->exec('DELETE FROM ' . UCL_SCHEMA . '.group_standings');

    $pdo->commit();
    json_ok(['created' => $created, 'total' => count($pdfGames), 'tips_deleted' => $tips]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Načítanie zlyhalo: ' . $e->getMessage(), 500);
}
