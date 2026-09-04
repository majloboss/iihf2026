<?php
// GET   /v1/admin/announcements  — zoznam oznamov
// POST  /v1/admin/announcements  — nový oznam
// PATCH /v1/admin/announcements  — vypni oznam (is_active = false)
$auth = require_admin();
$pdo  = db();

// Stlpec pridava migracia 077 — kym nebezi, obrazovka funguje bez neho
// a oznam sa na Prehlade riadi podla `is_active` ako predtym.
$maStlpec = stlpec_existuje($pdo, 'admin', 'announcements', 'show_dashboard');
$vyberDash = $maStlpec ? 'a.show_dashboard' : 'a.is_active AS show_dashboard';

if ($method === 'GET') {
    $rows = $pdo->query(
        "SELECT a.id, a.body, a.created_at, a.is_active, {$vyberDash},
                u.username AS created_by_username
         FROM admin.announcements a
         LEFT JOIN admin.users u ON u.id = a.created_by
         ORDER BY a.created_at DESC"
    )->fetchAll();
    json_ok($rows);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $text = trim($body['body'] ?? '');
    if ($text === '') json_err('Oznam nesmie byť prázdny', 400);

    // Novy oznam uz nevypina predosle: na Prehlade ich moze byt viac naraz
    // a co sa tam ukaze, urcuje `show_dashboard`.
    $naDash = !array_key_exists('show_dashboard', $body)
        || filter_var($body['show_dashboard'], FILTER_VALIDATE_BOOLEAN);

    if ($maStlpec) {
        $stmt = $pdo->prepare(
            "INSERT INTO admin.announcements (body, created_by, is_active, show_dashboard)
             VALUES (?, ?, TRUE, ?) RETURNING id, created_at"
        );
        $stmt->execute([$text, $auth['user_id'], $naDash ? 'true' : 'false']);
    } else {
        $stmt = $pdo->prepare(
            "INSERT INTO admin.announcements (body, created_by, is_active)
             VALUES (?, ?, TRUE) RETURNING id, created_at"
        );
        $stmt->execute([$text, $auth['user_id']]);
    }
    $row = $stmt->fetch();
    json_ok(['id' => $row['id'], 'created_at' => $row['created_at'], 'body' => $text,
             'is_active' => true, 'show_dashboard' => $naDash]);
}

if ($method === 'PATCH') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);
    if (!$id) json_err('Chýba id', 400);

    // Zobrazenie na Prehlade a v historii su nezavisle. Ked su obe odskrtnute,
    // oznam nie je vidiet nikde — tak sa stiahne chybne napisana sprava. Nic
    // sa nemaze, takze sa da kedykolvek zapnut spat.
    $sets = [];
    $params = [];

    if (array_key_exists('is_active', $body)) {
        $sets[] = 'is_active = ?';
        $params[] = filter_var($body['is_active'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
    }
    if ($maStlpec && array_key_exists('show_dashboard', $body)) {
        $sets[] = 'show_dashboard = ?';
        $params[] = filter_var($body['show_dashboard'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
    }

    // Prazdne telo znamena povodne spravanie: vypni oznam.
    if (!$sets) { $sets[] = 'is_active = FALSE'; }

    $params[] = $id;
    $pdo->prepare('UPDATE admin.announcements SET ' . implode(', ', $sets) . ' WHERE id = ?')
        ->execute($params);
    json_ok(['ok' => true]);
}

json_err('Method not allowed', 405);
