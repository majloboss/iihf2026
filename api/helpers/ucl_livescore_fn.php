<?php
require_once __DIR__ . '/ai_models_fn.php';

// Id sutaze v admin.competitions. Sluzi na dohladanie modelu pre livescore,
// ktory sa nastavuje per sutaz a den.
const UCL_COMPETITION_ID = 5;
// Stiahnutie priebezneho stavu zapasov LM z Flashscore.
//
// Rovnaku pracu potrebuje admin tlacidlom aj cron, preto zije mimo endpointu.
// Zapisuju sa iba ls_* stlpce a polcasove skore — konecny vysledok schvaluje
// admin rucne, aby sa body nepocitali z neoverenych udajov.

require_once __DIR__ . '/livescore_bulk_fn.php';

/**
 * Zapasy dna, ktore ma zmysel sledovat.
 * Bez adresy Flashscore sa zapas dohladat neda, so schvalenym vysledkom netreba.
 */
function ucl_livescore_games(PDO $pdo): array {
    // start_time je naive UTC, preto sa aj den urcuje v UTC.
    return $pdo->query('
        SELECT g.game_id, g.start_time, g.flashscore_url, g.tips_open, g.result_approved,
               g.ls_home, g.ls_away, g.ls_status, g.ls_updated_at,
               g.home_score_halftime, g.away_score_halftime,
               g.home_score_regular, g.away_score_regular,
               hc.club_name AS home_name, ac.club_name AS away_name
          FROM "lm2026-27".games g
          LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.start_time BETWEEN (NOW() AT TIME ZONE \'UTC\') - INTERVAL \'8 hours\'
                                AND (NOW() AT TIME ZONE \'UTC\') + INTERVAL \'12 hours\'
         ORDER BY g.start_time, g.game_id')->fetchAll();
}

/**
 * Stiahne stav sledovanych zapasov a zapise ho.
 * Vracia pole s poctom aktualizovanych zapasov a zaznamom pre zobrazenie,
 * alebo ['error' => ...] ked sa stav nepodarilo ziskat.
 */
function ucl_livescore_refresh(PDO $pdo, array $games): array {
    $watch = [];
    foreach ($games as $g) {
        if (empty($g['flashscore_url']) || $g['result_approved']) continue;
        $id = livescore_match_id($g['flashscore_url']);
        if ($id !== null) $watch[$id] = $g['game_id'];
    }

    if (!$watch) {
        return ['updated' => 0, 'watched' => 0, 'games' => [],
                'note' => 'Dnes nie je čo sledovať — žiadny zápas s adresou Flashscore.'];
    }

    // Model sa berie z ciselnika, nie z konfiguraku: da sa tak menit za behu
    // cez Sprava/Livescore bez zasahu do suborov na serveri. Konstanta
    // OPENROUTER_MODEL zostava ako zaloha, kym sa model v DB nenastavi.
    [$model, $modelRow, $dovod] = ai_model_pre_livescore(UCL_COMPETITION_ID);

    if ($model === null) {
        return ['updated' => 0, 'watched' => count($watch), 'games' => [],
                'note' => $dovod];
    }

    $res = livescore_bulk_check(array_keys($watch), $model);

    // Naklady sa zapisu vzdy, aj ked volanie zlyhalo — tokeny sa mohli minut.
    // Jedno volanie obsluzi viac zapasov, preto je to jeden riadok za volanie
    // a game_id zostava NULL; konkretne zapasy su v poznamke.
    ucl_zapis_naklady($model, $modelRow, $res, count($watch));

    // Zlyhanie sa zapocita — po troch za sebou livescore prejde na dalsi
    // model v poradi, aby pri tom nemusel sediet admin.
    $prepnutie = ai_po_volani(UCL_COMPETITION_ID, !empty($res['ok']),
                              $res['error'] ?? null);

    // Po zapise sa skontroluje denny strop: pri 80 % sa prepne na lacnejsi
    // model, pri 150 % sa livescore pre dany den zastavi.
    $zasahy = ai_straz_rozpocet(UCL_COMPETITION_ID);
    if ($prepnutie !== null) $zasahy[] = ['typ' => 'prepnute_po_zlyhani',
                                          'popis' => $prepnutie];

    if (!$res['ok']) return ['error' => $res['error'] ?? 'neznáma chyba',
                             'rozpocet' => $zasahy];

    // Polcasove skore sa prepise len ked ho livescore pozna — inak zostane povodne.
    $upd = $pdo->prepare('
        UPDATE "lm2026-27".games
           SET ls_home = ?, ls_away = ?, ls_status = ?, ls_updated_at = NOW(),
               home_score_halftime = COALESCE(?, home_score_halftime),
               away_score_halftime = COALESCE(?, away_score_halftime),
               tips_open = CASE WHEN ? THEN FALSE ELSE tips_open END,
               updated_at = NOW()
         WHERE game_id = ?');

    // Odlozi doterajsie priebezne skore ako vysledok po 90 minutach.
    // Beh pred prepisom ls_*, takze zachyti este stav pred predlzenim.
    $zmraz = $pdo->prepare('
        UPDATE "lm2026-27".games
           SET home_score_regular = ls_home, away_score_regular = ls_away,
               updated_at = NOW()
         WHERE game_id = ?
           AND home_score_regular IS NULL
           AND ls_home IS NOT NULL AND ls_away IS NOT NULL');

    $updated = 0;
    $log = [];
    foreach ($res['games'] as $id => $d) {
        if (!isset($watch[$id]) || !is_array($d)) continue;
        $gameId = $watch[$id];

        $home = is_numeric($d['home_score'] ?? null) ? (int)$d['home_score'] : null;
        $away = is_numeric($d['away_score'] ?? null) ? (int)$d['away_score'] : null;

        // Stav zlozime tak, aby sa dal zobrazit priamo: "2. polčas 67'" alebo "Polčas".
        $status = trim((string)($d['status'] ?? ''));
        if (!empty($d['minute']) && is_numeric($d['minute'])) {
            $status .= ' ' . (int)$d['minute'] . "'";
        }
        if (!empty($d['minute_note'])) $status .= ' (' . $d['minute_note'] . ')';
        $status = mb_substr(trim($status), 0, 30);

        // Ked livescore potvrdi, ze zapas zacal, tipovanie sa uzavrie.
        // 't'/'f' namiesto PHP boolean: PDO posiela false ako prazdny retazec
        // a Postgres ho v 'CASE WHEN ?' odmietne s chybou o neplatnom booleane.
        $started = !empty($d['started']) ? 't' : 'f';

        $htHome = is_numeric($d['home_score_halftime'] ?? null) ? (int)$d['home_score_halftime'] : null;
        $htAway = is_numeric($d['away_score_halftime'] ?? null) ? (int)$d['away_score_halftime'] : null;

        // Livescore posiela jedine skore. Ked zapas prejde do predlzenia,
        // zacne v nom hlasit stav PO predlzeni a 90-minutovy vysledok by sa
        // stratil — pritom prave z neho sa pocitaju body.
        //
        // Pri prvom hlaseni predlzenia sa preto doterajsie skore odlozi do
        // home_score_regular. Zapisuje sa iba raz (WHERE ... IS NULL), aby
        // dalsi beh cronu neprepisal to, co uz je ulozene alebo co zadal admin.
        // Vysledok sa tym neschvaluje, len uchova.
        $vPredlzeni = $status !== '' && (
               mb_stripos($status, 'predĺžen') !== false
            || mb_stripos($status, 'penalt') !== false);

        if ($vPredlzeni) {
            $zmraz->execute([$gameId]);
        }

        $upd->execute([$home, $away, $status ?: null, $htHome, $htAway, $started, $gameId]);
        $updated++;
        $log[] = [
            'game_id'  => $gameId,
            'teams'    => ($d['home_team'] ?? '?') . ' — ' . ($d['away_team'] ?? '?'),
            'score'    => $home === null ? null : "$home:$away",
            'status'   => $status,
            'halftime' => $htHome === null ? null : "$htHome:$htAway",
            'finished' => !empty($d['finished']),
        ];
    }

    return [
        'updated'    => $updated,
        'watched'    => count($watch),
        'missing'    => $res['missing'] ?? [],
        'total_feed' => $res['total_feed'] ?? null,
        'usage'      => $res['usage'] ?? null,
        'games'      => $log,
    ];
}

/**
 * Ma teraz zmysel volat livescore?
 * Model aj feed nieco staja, preto sa sahaju iba zapasy, ktore mozu prave bezat:
 * od vykopu do troch hodin po nom.
 */
function ucl_livescore_due(array $games): bool {
    $teraz = time();
    foreach ($games as $g) {
        if (empty($g['flashscore_url']) || $g['result_approved']) continue;
        $start = strtotime($g['start_time'] . ' UTC');
        if ($start === false) continue;
        if ($teraz >= $start - 300 && $teraz <= $start + 3 * 3600) return true;
    }
    return false;
}

// ------------------------------------------------------------
// Zapise naklady ostreho volania livescore do admin.livescore_log.
//
// Jedno volanie modelu obsluzi vsetky sledovane zapasy naraz, preto vznika
// jeden riadok s call_type='live' a game_id NULL. Bez tohto zapisu by
// obrazovka Naklady nemala z coho pocitat.
// ------------------------------------------------------------
function ucl_zapis_naklady(string $model, ?array $modelRow, array $res, int $zapasov): void {
    try {
        $u = $res['usage'] ?? [];
        $vstup  = $u['prompt_tokens']     ?? null;
        $vystup = $u['completion_tokens'] ?? null;
        $spolu  = $u['total_tokens']      ?? null;

        $cena = $modelRow ? ai_cena_volania($modelRow, $vstup, $vystup) : 0.0;

        db()->prepare(
            "INSERT INTO admin.livescore_log
                (call_type, provider, competition_id, model,
                 prompt_tokens, completion_tokens, tokens, cost_usd,
                 success, error, notes)
             VALUES ('live', 'openrouter', ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([
                UCL_COMPETITION_ID,
                mb_substr($model, 0, 100),
                $vstup, $vystup, $spolu, round($cena, 6),
                !empty($res['ok']) ? 't' : 'f',
                isset($res['error']) ? mb_substr((string)$res['error'], 0, 1000) : null,
                "Sledovaných zápasov: $zapasov",
            ]);
    } catch (Throwable $e) {
        // Zlyhany zapis nakladov nesmie zhodit livescore.
        error_log('ucl_zapis_naklady: ' . $e->getMessage());
    }
}
