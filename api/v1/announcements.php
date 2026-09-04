<?php
// GET /v1/announcements — oznamy organizátora pre históriu
//
// Vracia len tie, ktoré sa majú v histórii zobraziť (`is_active`). Oznam
// s odškrtnutým políčkom sa tam neukáže — spolu s odškrtnutým `show_dashboard`
// tak zmizne úplne, čo je spôsob, ako stiahnuť chybne napísanú správu.
require_auth();
$pdo = db();

$rows = $pdo->query(
    "SELECT a.id, a.body, a.created_at, a.is_active, u.username AS created_by_username
     FROM admin.announcements a
     LEFT JOIN admin.users u ON u.id = a.created_by
     WHERE a.is_active = TRUE
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok($rows ?: []);
