<?php
// POST /v1/admin/run-migration — run pending DB migrations
require_auth(true);
$pdo = db();

$migrations = ['003_group_standings.sql', '004_invites_sent_to.sql'];
$ran = [];
foreach ($migrations as $file) {
    $sql = file_get_contents(__DIR__ . '/../../migrations/' . $file);
    $pdo->exec($sql);
    $ran[] = $file;
}

json_ok(['migrations' => $ran, 'done' => true]);
