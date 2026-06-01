<?php
// Jednorazové vytvorenie prvého admin účtu na novej databáze.
// Funguje IBA ak tabuľka admin.users je prázdna (žiadni používatelia).
// Prístup: https://dev_iihf2026.fellow.sk/api/setup_once.php?token=<CRON_SECRET>
//
// Po použití sa odporúča zmazať tento súbor zo servera (alebo nechať — je bezpečný).

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config/db.php';

// Autentifikácia cez CRON_SECRET token
$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || $token !== CRON_SECRET) {
    http_response_code(403);
    echo json_encode(['error' => 'Neplatný token']);
    exit;
}

$username = trim($_GET['username'] ?? 'admin');
$password = trim($_GET['password'] ?? '');

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Heslo musí mať aspoň 8 znakov']);
    exit;
}

try {
    $dsn = 'pgsql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Overenie: DB musí byť prázdna
    $count = (int)$pdo->query('SELECT COUNT(*) FROM admin.users')->fetchColumn();
    if ($count > 0) {
        http_response_code(409);
        echo json_encode(['error' => 'Databáza už obsahuje používateľov — setup_once.php je zakázaný']);
        exit;
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("
        INSERT INTO admin.users (username, password, username_changed, role, is_active)
        VALUES (:u, :p, TRUE, 'admin', TRUE)
    ");
    $stmt->execute([':u' => $username, ':p' => $hash]);

    echo json_encode([
        'ok'       => true,
        'message'  => 'Admin účet vytvorený',
        'username' => $username,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
