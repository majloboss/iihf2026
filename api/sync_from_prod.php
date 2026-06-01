<?php
// Jednorazový sync dát z produkcie (DB-BET) do dev (DB-DEV-BET).
// Len dev server: https://dev_iihf2026.fellow.sk/api/sync-prod?token=...
// POZOR: Zmaže všetky dáta v dev DB a nahradí ich produkčnými.

header('Content-Type: application/json; charset=utf-8');
set_time_limit(120);

require_once __DIR__ . '/config/db.php';

// Bezpečnosť: len na dev serveri
if (!str_contains(APP_URL, 'dev_')) {
    http_response_code(403);
    echo json_encode(['error' => 'Tento script je určený len pre dev prostredie']);
    exit;
}

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Neplatný token']);
    exit;
}

$prodDsn  = 'pgsql:host=db.r5.websupport.sk;port=5432;dbname=DB-BET';
$prodUser = 'dbbet-admin';
$prodPass = 'Bet-adm1n';

try {
    $prod = new PDO($prodDsn, $prodUser, $prodPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $dev  = new PDO(
        'pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME,
        DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connect failed: ' . $e->getMessage()]);
    exit;
}

// Truncate: leaf tabuľky prvé (bez FK závislostí smerom von)
$truncateOrder = [
    'iihf2026.tips',
    'iihf2026.group_standings',
    'admin.notification_log',
    'admin.login_logs',
    'admin.mail_log',
    'admin.user_push_subscriptions',
    'admin.notification_settings',
    'admin.group_members',
    'admin.invites',
    'iihf2026.livescore_daily',
    'iihf2026.games_pdf',
    'admin.announcements',
    'iihf2026.tips',
    'iihf2026.games',
    'iihf2026.teams',
    'admin.friend_groups',
    'admin.users',
    'iihf2026.scoring_config',
];

// Insert: parent tabuľky prvé
$insertOrder = [
    'iihf2026.teams',
    'iihf2026.games',
    'iihf2026.scoring_config',
    'iihf2026.livescore_daily',
    'iihf2026.games_pdf',
    'admin.users',
    'admin.friend_groups',
    'admin.invites',
    'admin.group_members',
    'admin.notification_settings',
    'admin.login_logs',
    'admin.mail_log',
    'admin.announcements',
    'admin.user_push_subscriptions',
    'iihf2026.tips',
    'iihf2026.group_standings',
    'admin.notification_log',
];

// Načítaj boolean stĺpce pre každú tabuľku (PHP PDO vracia bool false ako "" čo PostgreSQL odmietne)
function getBoolCols(PDO $pdo, string $table): array {
    [$schema, $tbl] = explode('.', $table);
    $stmt = $pdo->prepare("
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ? AND data_type = 'boolean'
    ");
    $stmt->execute([$schema, $tbl]);
    return array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'column_name');
}

function normalizeRow(array $row, array $boolCols): array {
    foreach ($boolCols as $col) {
        if (!array_key_exists($col, $row)) continue;
        $v = $row[$col];
        if ($v === null) continue;
        // PDO/pgsql vracia bool ako "t"/"f" alebo PHP true/false alebo ""
        $row[$col] = ($v === true || $v === 't' || $v === '1' || $v === 'true') ? 'true' : 'false';
    }
    return $row;
}

$results = [];

$dev->beginTransaction();
try {
    // Jediný TRUNCATE pre všetky tabuľky naraz — PostgreSQL to vyžaduje pri FK vzťahoch
    $dev->exec("TRUNCATE TABLE " . implode(', ', array_unique($truncateOrder)));

    foreach ($insertOrder as $table) {
        $rows = $prod->query("SELECT * FROM $table")->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            $results[$table] = 0;
            continue;
        }

        $boolCols    = getBoolCols($prod, $table);
        $cols        = array_keys($rows[0]);
        $colList     = implode(', ', array_map(fn($c) => '"' . $c . '"', $cols));
        $placeholders = implode(', ', array_map(fn($c) => ':' . $c, $cols));

        $stmt = $dev->prepare("INSERT INTO $table ($colList) VALUES ($placeholders)");
        foreach ($rows as $row) {
            $stmt->execute(normalizeRow($row, $boolCols));
        }
        $results[$table] = count($rows);
    }

    $dev->commit();
} catch (Throwable $e) {
    $dev->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'results_so_far' => $results]);
    exit;
}

// Reset sequences na max(id) z prekopírovaných dát
$seqTables = [
    'admin.users',
    'admin.friend_groups',
    'admin.invites',
    'iihf2026.games',
    'iihf2026.tips',
    'admin.announcements',
    'admin.login_logs',
    'admin.mail_log',
    'admin.notification_log',
    'admin.user_push_subscriptions',
];

$seqResults = [];
foreach ($seqTables as $table) {
    try {
        $dev->exec("
            SELECT setval(
                pg_get_serial_sequence('$table', 'id'),
                COALESCE((SELECT MAX(id) FROM $table), 1)
            )
        ");
        $seqResults[] = $table;
    } catch (Throwable) {
        // Tabuľka nemá sequence na 'id' — ignoruj
    }
}

echo json_encode([
    'ok'        => true,
    'tables'    => $results,
    'sequences' => $seqResults,
]);
