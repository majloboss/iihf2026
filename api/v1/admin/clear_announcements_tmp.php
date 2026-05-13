<?php
require_admin();
$pdo = db();
$n = $pdo->exec("DELETE FROM admin.announcements");
json_ok(['deleted' => $n]);
