<?php
// ONE-TIME setup script — DELETE after running!
require __DIR__ . '/config/db.php';
require __DIR__ . '/helpers/db.php';

$pdo  = db();
$hash = password_hash('admin', PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    INSERT INTO admin.users (username, password, role, is_active, username_changed, created_at)
    VALUES ('admin', :hash, 'admin', TRUE, FALSE, NOW())
    ON CONFLICT (username) DO UPDATE SET password = :hash, role = 'admin', is_active = TRUE
");
$stmt->execute([':hash' => $hash]);

echo 'Admin user created/updated. DELETE this file now!';
