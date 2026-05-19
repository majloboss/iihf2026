<?php
// Livescore polling — api-sports.io
// Cron beží každú minútu; script sám rozhoduje kedy zavolať API (dynamický interval)
// Aktualizuje iba ls_* stĺpce — potvrdené výsledky zadáva admin ručne

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../config/api_sports.php';

$pdo = db();
$now = time();

// Dnešný dátum v UTC — IIHF zápasy sú 12:00–19:00 UTC = rovnaký dátum ako CEST
$today = gmdate('Y-m-d');

// 1. Dnešné zápasy (oba tímy vyplnené)
$gStmt = $pdo->prepare("
    SELECT id, team1, team2, starts_at, ls_status
    FROM iihf2026.games
    WHERE DATE(starts_at) = ?
      AND team1 IS NOT NULL AND team2 IS NOT NULL
    ORDER BY starts_at
");
$gStmt->execute([$today]);
$todayGames = $gStmt->fetchAll();

if (empty($todayGames)) {
    echo "No games today ($today).\n";
    exit(0);
}

// 2. Aspoň jeden zápas aktívny? (začal + 5 min, ešte nie FT)
$anyActive = false;
foreach ($todayGames as $g) {
    $startTs = strtotime($g['starts_at'] . (str_contains($g['starts_at'], '+') ? '' : ' UTC'));
    if ($startTs + 5 * 60 <= $now && $g['ls_status'] !== 'FT') {
        $anyActive = true;
        break;
    }
}

if (!$anyActive) {
    echo "No active games.\n";
    exit(0);
}

// 3. Načítaj/vytvor denný záznam — získaj api_calls + next_poll_at
$pdo->prepare("INSERT INTO iihf2026.livescore_daily (date, api_calls) VALUES (?, 0) ON CONFLICT DO NOTHING")
    ->execute([$today]);

$dayStmt = $pdo->prepare("SELECT api_calls, next_poll_at FROM iihf2026.livescore_daily WHERE date = ?");
$dayStmt->execute([$today]);
$dayRow    = $dayStmt->fetch();
$usedToday = (int)$dayRow['api_calls'];
$nextPoll  = $dayRow['next_poll_at'];

// 4. Je čas na ďalší poll?
if ($nextPoll !== null && strtotime($nextPoll . ' UTC') > $now) {
    $inSec = strtotime($nextPoll . ' UTC') - $now;
    echo "Not yet — next poll in {$inSec}s ($nextPoll UTC).\n";
    exit(0);
}

// 5. Denný budget (rezerva 5 pre admin sync)
if ($usedToday >= 95) {
    echo "Daily API limit reached ($usedToday/95 calls).\n";
    exit(0);
}

// 6. Mapovanie api_name -> code
$teamMap = $pdo->query("SELECT api_name, code FROM iihf2026.teams WHERE api_name IS NOT NULL")
    ->fetchAll(PDO::FETCH_KEY_PAIR);

// 7. API volanie
$url = API_SPORTS_HOST . '/games?league=' . API_SPORTS_LEAGUE
    . '&season=' . API_SPORTS_SEASON . '&date=' . $today;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['x-apisports-key: ' . API_SPORTS_KEY],
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_SSL_VERIFYPEER => true,
]);
$resp     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Vždy inkrementuj counter
$pdo->prepare("UPDATE iihf2026.livescore_daily SET api_calls = api_calls + 1 WHERE date = ?")
    ->execute([$today]);
$usedAfter = $usedToday + 1;

if ($httpCode !== 200 || !$resp) {
    echo "API error: HTTP $httpCode\n";
    exit(1);
}

$body = json_decode($resp, true);
if (!isset($body['response']) || !is_array($body['response'])) {
    echo "Invalid API response structure\n";
    exit(1);
}

// 8. Index API výsledkov: "TEAM1_TEAM2" -> game data
$apiIdx = [];
foreach ($body['response'] as $ag) {
    $homeName = $ag['teams']['home']['name'] ?? null;
    $awayName = $ag['teams']['away']['name'] ?? null;
    $homeCode = $homeName ? ($teamMap[$homeName] ?? null) : null;
    $awayCode = $awayName ? ($teamMap[$awayName] ?? null) : null;
    if ($homeCode && $awayCode) {
        $apiIdx[$homeCode . '_' . $awayCode] = $ag;
    }
}

// 9. Update DB pre aktívne zápasy
$upStmt = $pdo->prepare("
    UPDATE iihf2026.games SET
        ls_score1            = :s1,
        ls_score2            = :s2,
        ls_final1            = :f1,
        ls_final2            = :f2,
        ls_status            = :st,
        ls_updated_at        = NOW(),
        ls_requests_actual   = ls_requests_actual + 1,
        ls_requests_expected = CASE WHEN ls_requests_expected = 0 THEN :exp ELSE ls_requests_expected END
    WHERE id = :id
");

$updated = 0;
foreach ($todayGames as $g) {
    $startTs = strtotime($g['starts_at'] . (str_contains($g['starts_at'], '+') ? '' : ' UTC'));
    if ($startTs + 5 * 60 > $now) continue;
    if ($g['ls_status'] === 'FT')  continue;

    $key = $g['team1'] . '_' . $g['team2'];
    if (!isset($apiIdx[$key])) {
        echo "  Game {$g['id']} ({$g['team1']} vs {$g['team2']}): not in API response\n";
        continue;
    }

    $ag   = $apiIdx[$key];
    $h    = $ag['scores']['home'] ?? [];
    $a    = $ag['scores']['away'] ?? [];
    $stat = $ag['status']['short'] ?? null;


    $total1 = isset($h['total']) ? (int)$h['total'] : null;
    $total2 = isset($a['total']) ? (int)$a['total'] : null;
    $ot1    = isset($h['overtime'])  && $h['overtime']  !== null ? (int)$h['overtime']  : null;
    $ot2    = isset($a['overtime'])  && $a['overtime']  !== null ? (int)$a['overtime']  : null;
    $so1    = isset($h['shootouts']) && $h['shootouts'] !== null ? (int)$h['shootouts'] : null;
    $so2    = isset($a['shootouts']) && $a['shootouts'] !== null ? (int)$a['shootouts'] : null;

    $hasExtra = ($ot1 !== null || $ot2 !== null || $so1 !== null || $so2 !== null);

    if ($hasExtra && $total1 !== null) {
        $final1 = $total1;
        $final2 = $total2;
        $score1 = $total1 - ($ot1 ?? 0) - ($so1 ?? 0);
        $score2 = $total2 - ($ot2 ?? 0) - ($so2 ?? 0);
    } else {
        $score1 = $total1;
        $score2 = $total2;
        $final1 = null;
        $final2 = null;
    }

    // Očakávaný počet requestov: vypočítame neskôr, zatiaľ 0 = bude sa updatovať
    $upStmt->execute([
        ':s1'  => $score1,
        ':s2'  => $score2,
        ':f1'  => $final1,
        ':f2'  => $final2,
        ':st'  => $stat,
        ':exp' => 0,
        ':id'  => $g['id'],
    ]);

    echo "  Game {$g['id']}: {$g['team1']} {$score1}:{$score2} {$g['team2']} [{$stat}]"
        . ($hasExtra ? ' (OT/SO)' : '') . "\n";
    $updated++;
}

// 10. Vypočítaj next_poll_at — rozpočet zostatok / zostatok minút zápasov
$remainingBudget = 95 - $usedAfter;
$lastFinish      = 0;

foreach ($todayGames as $g) {
    if ($g['ls_status'] === 'FT') continue;
    $startTs     = strtotime($g['starts_at'] . (str_contains($g['starts_at'], '+') ? '' : ' UTC'));
    $estEnd      = $startTs + 100 * 60; // odhadovaný koniec: štart + 100 min
    if ($estEnd > $lastFinish) $lastFinish = $estEnd;
}

$remainingMinutes = $lastFinish > $now ? (int)ceil(($lastFinish - $now) / 60) : 0;

if ($remainingBudget <= 0 || $remainingMinutes <= 0) {
    $intervalMin  = null;
    $nextPollSave = null;
} else {
    $intervalMin  = min(30, max(1, (int)ceil($remainingMinutes / $remainingBudget)));
    $nextPollSave = gmdate('Y-m-d H:i:s', $now + $intervalMin * 60);
}

$pdo->prepare("UPDATE iihf2026.livescore_daily SET next_poll_at = ? WHERE date = ?")
    ->execute([$nextPollSave, $today]);

// Aktualizuj ls_requests_expected pre aktívne hry
if ($intervalMin !== null) {
    $expReqs = min(30, max(1, (int)ceil($remainingMinutes / $intervalMin)));
    $pdo->prepare("
        UPDATE iihf2026.games
        SET ls_requests_expected = :exp
        WHERE DATE(starts_at) = :d
          AND team1 IS NOT NULL AND team2 IS NOT NULL
          AND ls_status IS NOT NULL AND ls_status <> 'FT'
          AND ls_requests_expected = 0
    ")->execute([':exp' => $expReqs, ':d' => $today]);
}

echo "Done. Updated $updated game(s). API calls today: {$usedAfter}/95."
    . ($intervalMin ? " Next poll in {$intervalMin} min." : " No more polls today.") . "\n";
