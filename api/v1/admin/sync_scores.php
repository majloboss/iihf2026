<?php
// POST /v1/admin/sync-scores  — stiahne výsledky z API-Sports a aktualizuje DB
require_auth(true);
if ($method !== 'POST') json_error('Method not allowed', 405);

require_once __DIR__ . '/../../config/api_sports.php';
$pdo = db();

// Mapovanie názvov tímov z API → naše kódy
$TEAM_MAP = [
    'Finland'        => 'FIN', 'Germany'       => 'GER', 'USA'         => 'USA',
    'United States'  => 'USA', 'Switzerland'   => 'SUI', 'Canada'      => 'CAN',
    'Sweden'         => 'SWE', 'Czech Republic'=> 'CZE', 'Czechia'     => 'CZE',
    'Denmark'        => 'DEN', 'Slovakia'      => 'SVK', 'Norway'      => 'NOR',
    'Great Britain'  => 'GBR', 'Austria'       => 'AUT', 'Hungary'     => 'HUN',
    'Latvia'         => 'LAT', 'Italy'         => 'ITA', 'Slovenia'    => 'SLO',
];

// Načítaj dnešné hry z API
$date = date('Y-m-d');
$url  = API_SPORTS_HOST . '/games?league=' . API_SPORTS_LEAGUE . '&season=' . API_SPORTS_SEASON . '&date=' . $date;

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['x-apisports-key: ' . API_SPORTS_KEY],
    CURLOPT_TIMEOUT        => 10,
]);
$raw = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

if ($err) json_error('API chyba: ' . $err, 502);

$data = json_decode($raw, true);

if (!empty($data['errors'])) {
    $errMsg = is_array($data['errors']) ? implode('; ', $data['errors']) : json_encode($data['errors']);
    json_error('API: ' . $errMsg, 502);
}

$games   = $data['response'] ?? [];
$updated = 0;
$skipped = 0;
$log     = [];

foreach ($games as $g) {
    $homeApi = $g['teams']['home']['name'] ?? '';
    $awayApi = $g['teams']['away']['name'] ?? '';
    $home = $TEAM_MAP[$homeApi] ?? null;
    $away = $TEAM_MAP[$awayApi] ?? null;

    if (!$home || !$away) {
        $skipped++;
        $log[] = "Neznámy tím: $homeApi / $awayApi";
        continue;
    }

    $statusApi = $g['status']['short'] ?? '';
    // FT=finished, 1P/2P/3P/OT/SO=live, NS=not started
    $status = match(true) {
        in_array($statusApi, ['FT', 'AOT', 'AP'])   => 'finished',
        in_array($statusApi, ['1P','2P','3P','OT','SO','BRK']) => 'live',
        default                                       => null,
    };

    if ($status === null) { $skipped++; continue; }

    $score1 = (int)($g['scores']['home']['total'] ?? 0);
    $score2 = (int)($g['scores']['away']['total'] ?? 0);

    // Nájdi zápas v DB podľa tímov a dátumu
    $stmt = $pdo->prepare("
        UPDATE iihf2026.games
        SET score1=:s1, score2=:s2, status=:st
        WHERE team1=:t1 AND team2=:t2
          AND DATE(starts_at AT TIME ZONE 'UTC') = :dt
          AND status != 'finished'
        RETURNING id
    ");
    $stmt->execute([
        ':s1' => $score1, ':s2' => $score2, ':st' => $status,
        ':t1' => $home,   ':t2' => $away,   ':dt' => $date,
    ]);
    $row = $stmt->fetch();

    if ($row) {
        $updated++;
        $log[] = "✓ $home $score1:$score2 $away ($status)";

        // Ak sa hra práve ukončila, prepočítaj body
        if ($status === 'finished') {
            $recalc = $pdo->prepare("
                UPDATE iihf2026.tips t
                SET points = (
                    SELECT
                        CASE WHEN (:s1>:s2 AND t2.tip1>t2.tip2) OR (:s2>:s1 AND t2.tip2>t2.tip1) OR (:s1=:s2 AND t2.tip1=t2.tip2)
                             THEN sc.pts_winner ELSE 0 END
                        + CASE WHEN t2.tip1=:s1 THEN 1 ELSE 0 END
                        + CASE WHEN t2.tip2=:s2 THEN 1 ELSE 0 END
                    FROM iihf2026.tips t2
                    JOIN iihf2026.scoring_config sc ON sc.phase = (SELECT phase FROM iihf2026.games WHERE id=:gid)
                    WHERE t2.id = t.id
                )
                WHERE t.game_id = :gid AND t.points IS NULL
            ");
            $recalc->execute([':s1'=>$score1,':s2'=>$score2,':gid'=>$row['id']]);
        }
    } else {
        $skipped++;
        $log[] = "— $home vs $away (nenašlo sa alebo už finished)";
    }
}

json_ok([
    'date'    => $date,
    'fetched' => count($games),
    'updated' => $updated,
    'skipped' => $skipped,
    'log'     => $log,
]);
