<?php
// Dočasný debug — zobrazí surový API response pre dnešné zápasy
// Zmazať po overení!
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/api_sports.php';

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403); exit('Forbidden');
}

header('Content-Type: text/plain; charset=utf-8');

$today = gmdate('Y-m-d');
$url   = API_SPORTS_HOST . '/games?league=' . API_SPORTS_LEAGUE
       . '&season=' . API_SPORTS_SEASON . '&date=' . $today;

echo "Date: $today\n";
echo "URL: $url\n\n";

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['x-apisports-key: ' . API_SPORTS_KEY],
    CURLOPT_TIMEOUT        => 15,
]);
$resp     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP: $httpCode\n\n";

$body = json_decode($resp, true);
if (!$body) {
    echo "Invalid response:\n$resp\n";
    exit;
}

echo "Results: " . ($body['results'] ?? '?') . "\n";
echo "Errors: "  . json_encode($body['errors'] ?? []) . "\n";
echo "Paging: "  . json_encode($body['paging']  ?? []) . "\n\n";

if (empty($body['response'])) {
    echo "--- No games in response ---\n";
    exit;
}

foreach ($body['response'] as $ag) {
    echo "--- " . ($ag['teams']['home']['name'] ?? '?') . " vs " . ($ag['teams']['away']['name'] ?? '?') . " ---\n";
    echo "Status: " . json_encode($ag['status']) . "\n";
    echo "Scores: " . json_encode($ag['scores']) . "\n\n";
}
