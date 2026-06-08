<?php
// GET /v1/fifa/teams  — zoznam 48 FIFA tímov
require_auth();
$stmt = db()->query("
    SELECT team_id, team_code, team_name, group_name
    FROM fifa2026.teams
    ORDER BY team_name
");
json_ok($stmt->fetchAll());
