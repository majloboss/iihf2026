<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-teams
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query("SELECT t.team_id, t.team_code, t.team_name, t.country_code, c.name_sk AS country_name, COALESCE(c.sport_code_uefa, c.country_code) AS country_display_code, c.flag_file, c.flag_file_big, t.logo_file FROM \"lm2026-27\".teams t LEFT JOIN admin.countries c ON c.country_code = t.country_code ORDER BY t.team_name, t.team_id")->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$clean = function (array $data, bool $requireCode = true) {
    $teamCode = strtoupper(trim((string)($data['team_code'] ?? '')));
    $teamName = trim((string)($data['team_name'] ?? ''));
    $countryCode = strtoupper(trim((string)($data['country_code'] ?? '')));
    $logoFile = trim((string)($data['logo_file'] ?? ''));

    if ($requireCode && ($teamCode === '' || !preg_match('/^[A-Z0-9_-]{2,20}$/', $teamCode))) {
        json_error('Kód klubu musí mať 2 až 20 znakov: A-Z, 0-9, _ alebo -', 400);
    }
    if ($teamName === '' || mb_strlen($teamName) > 100) json_error('Názov klubu je povinný a môže mať najviac 100 znakov', 400);
    // Ciselnik pouziva ISO 3166, pri britskych krajinach ISO 3166-2 (GB-ENG).
    if ($countryCode !== '' && !preg_match('/^[A-Z]{2,3}(-[A-Z]{2,3})?$/', $countryCode)) json_error('Kód štátu má neplatný formát', 400);
    if ($logoFile !== '' && (basename($logoFile) !== $logoFile || !preg_match('/^[A-Za-z0-9_.-]+\.png$/i', $logoFile))) {
        json_error('Logo musí byť názov PNG súboru bez cesty', 400);
    }

    return [$teamCode, $teamName, $countryCode ?: null, $logoFile ?: null];
};

$countryExists = function (?string $countryCode) use ($pdo) {
    if ($countryCode === null) return;
    $stmt = $pdo->prepare('SELECT 1 FROM admin.countries WHERE country_code = ?');
    $stmt->execute([$countryCode]);
    if (!$stmt->fetch()) json_error('Vybraný štát neexistuje v číselníku', 400);
};

if ($method === 'POST') {
    [$teamCode, $teamName, $countryCode, $logoFile] = $clean($body);
    $countryExists($countryCode);
    try {
        $stmt = $pdo->prepare("INSERT INTO \"lm2026-27\".teams (team_code, team_name, country_code, logo_file) VALUES (?, ?, ?, ?) RETURNING team_id, team_code, team_name, country_code, logo_file");
        $stmt->execute([$teamCode, $teamName, $countryCode, $logoFile]);
        json_ok($stmt->fetch(), 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23505') json_error('Kód klubu už existuje', 409);
        throw $e;
    }
}

if ($method === 'PUT') {
    $teamId = (int)($body['team_id'] ?? 0);
    if (!$teamId) json_error('Chýba team_id', 400);
    [$teamCode, $teamName, $countryCode, $logoFile] = $clean($body);
    try {
        $oldStmt = $pdo->prepare('SELECT country_code FROM "lm2026-27".teams WHERE team_id = ?');
        $oldStmt->execute([$teamId]);
        $oldTeam = $oldStmt->fetch();
        if (!$oldTeam) json_error('Klub neexistuje', 404);

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("UPDATE \"lm2026-27\".teams SET team_code = ?, team_name = ?, country_code = ?, logo_file = ? WHERE team_id = ? RETURNING team_id, team_code, team_name, country_code, logo_file");
        $stmt->execute([$teamCode, $teamName, $countryCode, $logoFile, $teamId]);
        $row = $stmt->fetch();
        $pdo->commit();
        json_ok($row);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($e->getCode() === '23505') json_error('Kód klubu už existuje', 409);
        throw $e;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

if ($method === 'DELETE') {
    $teamId = (int)($body['team_id'] ?? 0);
    if (!$teamId) json_error('Chýba team_id', 400);
    $stmt = $pdo->prepare('DELETE FROM "lm2026-27".teams WHERE team_id = ?');
    $stmt->execute([$teamId]);
    if ($stmt->rowCount() === 0) json_error('Klub neexistuje', 404);
    json_ok(['team_id' => $teamId]);
}

json_error('Method not allowed', 405);
