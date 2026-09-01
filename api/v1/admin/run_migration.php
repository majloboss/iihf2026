<?php
// GET  /v1/admin/run-migration — zoznam migracii a ich stav
// POST /v1/admin/run-migration — spusti nespustene migracie
// Telo POST: {"version": 53} spusti iba jednu, {"dry_run": true} iba vypise plan.
//
// POZOR: migracie 002-011, 020 a 036 sa do admin.schema_versions nikdy nezapisuju,
// takze podla tabulky vyzeraju ako nespustene. Preto sa predvolene spustaju iba
// migracie novsie ako najvyssia zaznamenana verzia. Starsiu treba spustit adresne
// cez {"version": N}.
require_auth(true);
$pdo = db();

$dir = __DIR__ . '/../../migrations/';

// Zo suborov <cislo>_<nazov>.sql zosta zoznam [verzia => subor], zoradeny podla verzie.
$files = [];
foreach (scandir($dir) ?: [] as $file) {
    if (!preg_match('/^(\d+)_.+\.sql$/', $file, $m)) continue;
    $files[(int)$m[1]] = $file;
}
ksort($files);

$applied = $pdo->query('SELECT version FROM admin.schema_versions')->fetchAll(PDO::FETCH_COLUMN);
$applied = array_map('intval', $applied);

$maxApplied = $applied ? max($applied) : 0;

$pending = [];
foreach ($files as $version => $file) {
    if (in_array($version, $applied, true)) continue;
    if ($version <= $maxApplied) continue; // stara migracia bez zaznamu, nespustat automaticky
    $pending[$version] = $file;
}

if ($method === 'GET') {
    $list = [];
    foreach ($files as $version => $file) {
        $isApplied = in_array($version, $applied, true);
        $list[] = [
            'version' => $version,
            'file' => $file,
            'applied' => $isApplied,
            'untracked' => !$isApplied && $version <= $maxApplied,
        ];
    }
    json_ok(['migrations' => $list, 'max_applied' => $maxApplied, 'pending' => array_values($pending)]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];

if (isset($body['version'])) {
    $only = (int)$body['version'];
    if (!isset($files[$only])) json_error("Migrácia $only neexistuje", 404);
    $pending = [$only => $files[$only]];
}

if (!empty($body['dry_run'])) json_ok(['would_run' => array_values($pending), 'done' => false]);

// Kazda migracia bezi vo vlastnej transakcii, aby chyba nezrusila uz spustene.
$ran = [];
foreach ($pending as $version => $file) {
    $sql = file_get_contents($dir . $file);
    if ($sql === false) json_error("Migráciu $file sa nepodarilo načítať", 500);
    try {
        $pdo->beginTransaction();
        $pdo->exec($sql);
        $pdo->commit();
        $ran[] = $file;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_error("Migrácia $file zlyhala: " . $e->getMessage() . ' | Úspešne spustené: ' . (implode(', ', $ran) ?: 'žiadne'), 500);
    }
}

json_ok(['migrations' => $ran, 'max_applied' => $maxApplied, 'done' => true]);
