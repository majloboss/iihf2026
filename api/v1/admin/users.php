<?php
// GET  /v1/admin/users  — zoznam userov
// (pridavanie userov je cez invites)
require_admin();

if ($method !== 'GET') json_error('Method not allowed', 405);

$rows = db()->query(
    'SELECT id, username, first_name, last_name, email, role, is_active, created_at
     FROM admin.users ORDER BY created_at DESC'
)->fetchAll();

json_ok($rows);
