<?php
// GET /v1/announcements — všetky oznamy organizátora (pre históriu)
require_auth();
$pdo = db();

$rows = $pdo->query(
    "SELECT a.id, a.body, a.created_at, a.is_active, u.username AS created_by_username
     FROM admin.announcements a
     LEFT JOIN admin.users u ON u.id = a.created_by
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok($rows ?: []);
