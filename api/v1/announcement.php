<?php
// GET /v1/announcement — oznamy organizátora zobrazené na Prehľade
//
// Vracia sa pole, nie jediný oznam: na Prehľade ich môže byť viac naraz.
// Ktoré sa tam ukážu, riadi `show_dashboard`; ostatné zostávajú v histórii.
require_auth();
$pdo = db();

// Stlpec pridava migracia 077 — kym nebezi, riadi sa zobrazenie podla
// `is_active` ako predtym, takze appka funguje pred aj po nej.
$maStlpec = stlpec_existuje($pdo, 'admin', 'announcements', 'show_dashboard');
$podmienka = $maStlpec ? 'a.show_dashboard = TRUE' : 'a.is_active = TRUE';

$rows = $pdo->query(
    "SELECT a.id, a.body, a.created_at, u.username AS created_by_username
     FROM admin.announcements a
     LEFT JOIN admin.users u ON u.id = a.created_by
     WHERE a.is_active = TRUE AND {$podmienka}
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok($rows);
