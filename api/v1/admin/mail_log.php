<?php
// GET /v1/admin/mail-log
require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo    = db();
$limit  = min((int)($_GET['limit'] ?? 100), 500);
$offset = (int)($_GET['offset'] ?? 0);

$rows = $pdo->prepare("
    SELECT id, to_email, subject, body, status, error_msg, sent_at
    FROM admin.mail_log
    ORDER BY sent_at DESC
    LIMIT :lim OFFSET :off
");
$rows->bindValue(':lim', $limit, PDO::PARAM_INT);
$rows->bindValue(':off', $offset, PDO::PARAM_INT);
$rows->execute();

$total = (int)$pdo->query("SELECT COUNT(*) FROM admin.mail_log")->fetchColumn();
json_ok(['total' => $total, 'rows' => $rows->fetchAll()]);
