<?php
// GET /v1/admin/login-logs  — posledné prihlásenia
require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();
$limit  = min((int)($_GET['limit']  ?? 100), 500);
$offset = (int)($_GET['offset'] ?? 0);

$rows = $pdo->prepare("
    SELECT ll.id, ll.username, ll.ip_address, ll.user_agent, ll.logged_at,
           u.role, u.is_active
    FROM admin.login_logs ll
    LEFT JOIN admin.users u ON u.id = ll.user_id
    ORDER BY ll.logged_at DESC
    LIMIT :lim OFFSET :off
");
$rows->bindValue(':lim', $limit, PDO::PARAM_INT);
$rows->bindValue(':off', $offset, PDO::PARAM_INT);
$rows->execute();

$total = (int)$pdo->query("SELECT COUNT(*) FROM admin.login_logs")->fetchColumn();

json_ok(['total' => $total, 'rows' => $rows->fetchAll()]);
