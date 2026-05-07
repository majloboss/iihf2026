<?php
// POST /v1/admin/run-migration — run pending DB migrations (one-time use)
require_auth(true);
$pdo = db();

$sql = file_get_contents(__DIR__ . '/../../migrations/003_group_standings.sql');
$pdo->exec($sql);

json_ok(['migration' => '003_group_standings', 'done' => true]);
