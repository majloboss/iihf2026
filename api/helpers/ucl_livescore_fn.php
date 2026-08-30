<?php
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
         WHERE g.start_time::date = (NOW() AT TIME ZONE \'UTC\')::date
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

    $model = defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'minimax/minimax-m3:free';
    $res = livescore_bulk_check(array_keys($watch), $model);
    if (!$res['ok']) return ['error' => $res['error'] ?? 'neznáma chyba'];

    // Polcasove skore sa prepise len ked ho livescore pozna — inak zostane povodne.
    $upd = $pdo->prepare('
        UPDATE "lm2026-27".games
           SET ls_home = ?, ls_away = ?, ls_status = ?, ls_updated_at = NOW(),
               home_score_halftime = COALESCE(?, home_score_halftime),
               away_score_halftime = COALESCE(?, away_score_halftime),
               tips_open = CASE WHEN ? THEN FALSE ELSE tips_open END,
               updated_at = NOW()
         WHERE game_id = ?');

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
        $started = !empty($d['started']);

        $htHome = is_numeric($d['home_score_halftime'] ?? null) ? (int)$d['home_score_halftime'] : null;
        $htAway = is_numeric($d['away_score_halftime'] ?? null) ? (int)$d['away_score_halftime'] : null;

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
