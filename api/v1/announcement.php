<?php
// GET /v1/announcement — oznamy organizátora zobrazené na Prehľade
//
// Vracia sa pole, nie jediný oznam: na Prehľade ich môže byť viac naraz.
//
// Zobrazenie na Prehľade a v histórii sú dve nezávislé veci — oznam môže byť
// na Prehľade a v histórii nie, alebo naopak. Keď sú odškrtnuté obe, nie je
// vidieť nikde; tak sa stiahne chybne napísaná správa.
require_auth();
$pdo = db();

// Stlpec pridava migracia 077 — kym nebezi, riadi zobrazenie `is_active`
// ako predtym, takze appka funguje pred aj po nej.
$maStlpec = stlpec_existuje($pdo, 'admin', 'announcements', 'show_dashboard');
$podmienka = $maStlpec ? 'a.show_dashboard = TRUE' : 'a.is_active = TRUE';

$rows = $pdo->query(
    "SELECT a.id, a.body, a.created_at, u.username AS created_by_username
     FROM admin.announcements a
     LEFT JOIN admin.users u ON u.id = a.created_by
     WHERE {$podmienka}
     ORDER BY a.created_at DESC"
)->fetchAll();

json_ok($rows);
