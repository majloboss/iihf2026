<?php
// GET  /v1/admin/ucl-build-bracket — co sa da zostavit
// POST /v1/admin/ucl-build-bracket — zostavi dvojice jednej fazy
//
// Body: { phase: 'PO' | 'R16' | 'QF' | 'SF' | 'F' }
//
// Dvojice sa daju zostavit az ked su znami vsetci ucastnici fazy:
//   PO  — miesta 9-24 ligovej tabulky (9. vs 24., 10. vs 23., ...)
//   R16 — miesta 1-8 + vitazi baraze (1. vs najhorsie umiestneny vitaz, ...)
//   QF, SF, F — vitazi predchadzajucej fazy
//
// Lepsie umiestneny tim hra odvetu doma, preto je v prvom zapase hostom.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

$FAZY = ['PO' => 'Baráž o play-off', 'R16' => 'Osemfinále',
         'QF' => 'Štvrťfinále', 'SF' => 'Semifinále', 'F' => 'Finále'];

/** Poradie klubov v ligovej tabulke: [rank => club_id]. */
function ucl_tabulka(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query('SELECT rank, team_id FROM ' . UCL_SCHEMA . '.group_standings
                           WHERE phase = \'LEAGUE\' ORDER BY rank')->fetchAll() as $r) {
        $out[(int)$r['rank']] = (int)$r['team_id'];
    }
    return $out;
}

/**
 * Vitazi dvojic danej fazy, zoradeni podla cisla dvojice.
 * Vracia [tie_id => club_id]; dvojica bez rozhodnuteho vitaza chyba.
 */
function ucl_vitazi(PDO $pdo, string $phase): array {
    $rows = $pdo->prepare('SELECT tie_id, leg, home_team_id, away_team_id,
                                  home_score_regular AS hs, away_score_regular AS ascore,
                                  home_score_final AS hf, away_score_final AS af,
                                  result_approved
                             FROM ' . UCL_SCHEMA . '.games
                            WHERE game_type_code = ? AND tie_id IS NOT NULL
                            ORDER BY tie_id, leg');
    $rows->execute([$phase]);

    $dvojice = [];
    foreach ($rows->fetchAll() as $g) {
        $dvojice[$g['tie_id']][(int)$g['leg']] = $g;
    }

    $vitazi = [];
    foreach ($dvojice as $tieId => $zapasy) {
        $prvy = $zapasy[1] ?? null;
        $odveta = $zapasy[2] ?? null;
        if (!$prvy || !$odveta) continue;
        if (!$prvy['result_approved'] || !$odveta['result_approved']) continue;
        if ($prvy['hs'] === null || $odveta['hs'] === null) continue;

        // Domaci prveho zapasu je v odvete hostom, preto sa goly scitavaju krizom.
        // Do suctu ide konecny vysledok: ked sa hralo predlzenie alebo penalty,
        // plati skore po nich. Odveta moze skoncit remizou a dvojica byt
        // rozhodnuta — pri sucte 2:2 dostane hostujuci tim dva goly v predlzeni
        // a za dvojicu je to 4:2.
        $kon = fn($z, $pole) => $z[$pole === 'h' ? 'hf' : 'af'] !== null
            ? (int)$z[$pole === 'h' ? 'hf' : 'af']
            : (int)$z[$pole === 'h' ? 'hs' : 'ascore'];

        $timA = (int)$prvy['home_team_id'];
        $timB = (int)$prvy['away_team_id'];
        $golyA = $kon($prvy, 'h') + $kon($odveta, 'a');
        $golyB = $kon($prvy, 'a') + $kon($odveta, 'h');

        if ($golyA !== $golyB) $vitazi[$tieId] = $golyA > $golyB ? $timA : $timB;
        // Inak vitaz zatial nie je znamy.
    }
    ksort($vitazi, SORT_NATURAL);
    return $vitazi;
}

/** Kluby, ktore do fazy postupuju, v poradi nasadenia (najlepsi prvy). */
function ucl_ucastnici(PDO $pdo, string $phase): array {
    if ($phase === 'PO') {
        $tab = ucl_tabulka($pdo);
        $out = [];
        for ($r = 9; $r <= 24; $r++) {
            if (!isset($tab[$r])) return [];
            $out[] = $tab[$r];
        }
        return $out;
    }

    if ($phase === 'R16') {
        $tab = ucl_tabulka($pdo);
        $priami = [];
        for ($r = 1; $r <= 8; $r++) {
            if (!isset($tab[$r])) return [];
            $priami[] = $tab[$r];
        }
        $zBaraze = array_values(ucl_vitazi($pdo, 'PO'));
        if (count($zBaraze) !== 8) return [];
        // Prvych osem je nasadenych, vitazi baraze idu za nimi.
        return array_merge($priami, $zBaraze);
    }

    $predosla = ['QF' => 'R16', 'SF' => 'QF', 'F' => 'SF'][$phase] ?? null;
    if (!$predosla) return [];
    return array_values(ucl_vitazi($pdo, $predosla));
}

if ($method === 'GET') {
    $stav = [];
    foreach ($FAZY as $kod => $nazov) {
        $ucastnici = ucl_ucastnici($pdo, $kod);
        $obsadene = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games
                                       WHERE game_type_code = ' . $pdo->quote($kod) . '
                                         AND home_team_id IS NOT NULL')->fetchColumn();
        $zapasov = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.games
                                      WHERE game_type_code = ' . $pdo->quote($kod))->fetchColumn();
        $stav[] = [
            'phase'     => $kod,
            'name'      => $nazov,
            'games'     => $zapasov,
            'with_teams'=> $obsadene,
            'ready'     => count($ucastnici) > 0,
            'teams'     => count($ucastnici),
        ];
    }
    json_ok(['phases' => $stav]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body  = json_decode(file_get_contents('php://input'), true) ?: [];
$phase = strtoupper(trim((string)($body['phase'] ?? '')));
if (!isset($FAZY[$phase])) json_error('Neznáma fáza', 400);

$ucastnici = ucl_ucastnici($pdo, $phase);
if (!$ucastnici) {
    json_error('Účastníci fázy ešte nie sú známi — chýbajú výsledky predchádzajúcich zápasov.', 409);
}

// Tipy sa viazu na konkretne dvojice; prestavat ich po tipovani by ich znehodnotilo.
$tipy = (int)$pdo->query('SELECT COUNT(*) FROM ' . UCL_SCHEMA . '.tips t
                            JOIN ' . UCL_SCHEMA . '.games g ON g.game_id = t.game_id
                           WHERE g.game_type_code = ' . $pdo->quote($phase))->fetchColumn();
if ($tipy > 0 && empty($body['replace'])) {
    json_error("Na zápasoch tejto fázy už je $tipy tipov. Na prestavenie zapni Nahradiť.", 409);
}

// Dvojice: najlepsi s najhorsim. Lepsie umiestneny hra odvetu doma, preto je
// v prvom zapase hostom.
$pary = [];
$n = count($ucastnici);

// Neparny pocet znamena, ze niektora dvojica predoslej fazy este nema vitaza
// — najcastejsie preto, ze jej vysledok neurcuje postupujuceho. Bez tejto
// poistky by cyklus sparoval prostredny tim so sebou samym.
if ($n < 2 || $n % 2 !== 0) {
    json_error("Účastníkov je $n — z predchádzajúcej fázy chýba víťaz. "
             . 'Skontroluj výsledky dvojíc: pri rovnakom súčte gólov musí byť '
             . 'zadaný výsledok po predĺžení alebo penaltách.', 409);
}

for ($i = 0; $i < $n / 2; $i++) {
    $lepsi = $ucastnici[$i];
    $horsi = $ucastnici[$n - 1 - $i];
    $pary[] = ['home' => $horsi, 'away' => $lepsi];
}

try {
    $pdo->beginTransaction();

    if ($phase === 'F') {
        // Finale je jediny zapas bez odvety.
        $upd = $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                                 SET home_team_id = ?, away_team_id = ?, tips_open = TRUE,
                                     updated_at = NOW()
                               WHERE game_type_code = \'F\'');
        $upd->execute([$pary[0]['away'], $pary[0]['home']]);   // vo finale je jedno, kto je "domaci"
        $pdo->commit();
        json_ok(['phase' => $phase, 'pairs' => 1]);
    }

    $upd = $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                             SET home_team_id = ?, away_team_id = ?, tips_open = TRUE,
                                 updated_at = NOW()
                           WHERE tie_id = ? AND leg = ?');

    foreach ($pary as $i => $par) {
        $tieId = $phase . '-' . ($i + 1);
        // Prvy zapas: horsie umiestneny doma. Odveta: obratene.
        $upd->execute([$par['home'], $par['away'], $tieId, 1]);
        $upd->execute([$par['away'], $par['home'], $tieId, 2]);
    }

    $pdo->commit();
    json_ok(['phase' => $phase, 'pairs' => count($pary)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Zostavenie dvojíc zlyhalo: ' . $e->getMessage(), 500);
}
