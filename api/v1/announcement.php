<?php
// GET /v1/announcement — posledný oznam organizátora (pre usera)
require_auth();
$pdo = db();

$row = $pdo->query(
    "SELECT a.id, a.body, a.created_at, u.username AS created_by_username
     FROM admin.announcements a
     LEFT JOIN admin.users u ON u.id = a.created_by
     ORDER BY a.created_at DESC
     LIMIT 1"
)->fetch();

json_ok($row ?: null);
