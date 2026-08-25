<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-teams
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query("SELECT team_id, team_code, team_name, country_code, country_name, logo_file FROM \"lm2026-27\".teams ORDER BY team_name, team_id")->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$clean = function (array $data, bool $requireCode = true) {
    $teamCode = strtoupper(trim((string)($data['team_code'] ?? '')));
    $teamName = trim((string)($data['team_name'] ?? ''));
    $countryCode = strtoupper(trim((string)($data['country_code'] ?? '')));
    $countryName = trim((string)($data['country_name'] ?? ''));
    $logoFile = trim((string)($data['logo_file'] ?? ''));

    if ($requireCode && ($teamCode === '' || !preg_match('/^[A-Z0-9_-]{2,20}$/', $teamCode))) {
        json_error('Kód klubu musí mať 2 až 20 znakov: A-Z, 0-9, _ alebo -', 400);
    }
    if ($teamName === '' || mb_strlen($teamName) > 100) json_error('Názov klubu je povinný a môže mať najviac 100 znakov', 400);
    if ($countryCode !== '' && !preg_match('/^[A-Z]{3}$/', $countryCode)) json_error('Kód štátu musí mať presne 3 písmená', 400);
    if ($countryName !== '' && mb_strlen($countryName) > 100) json_error('Názov štátu môže mať najviac 100 znakov', 400);
    if ($logoFile !== '' && (basename($logoFile) !== $logoFile || !preg_match('/^[A-Za-z0-9_.-]+\.png$/i', $logoFile))) {
        json_error('Logo musí byť názov PNG súboru bez cesty', 400);
    }

    return [$teamCode, $teamName, $countryCode ?: null, $countryName ?: null, $logoFile ?: null];
};

if ($method === 'POST') {
    [$teamCode, $teamName, $countryCode, $countryName, $logoFile] = $clean($body);
    try {
        $stmt = $pdo->prepare("INSERT INTO \"lm2026-27\".teams (team_code, team_name, country_code, country_name, logo_file) VALUES (?, ?, ?, ?, ?) RETURNING team_id, team_code, team_name, country_code, country_name, logo_file");
        $stmt->execute([$teamCode, $teamName, $countryCode, $countryName, $logoFile]);
        json_ok($stmt->fetch(), 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23505') json_error('Kód klubu už existuje', 409);
        throw $e;
    }
}

if ($method === 'PUT') {
    $teamId = (int)($body['team_id'] ?? 0);
    if (!$teamId) json_error('Chýba team_id', 400);
    [$teamCode, $teamName, $countryCode, $countryName, $logoFile] = $clean($body);
    try {
        $stmt = $pdo->prepare("UPDATE \"lm2026-27\".teams SET team_code = ?, team_name = ?, country_code = ?, country_name = ?, logo_file = ? WHERE team_id = ? RETURNING team_id, team_code, team_name, country_code, country_name, logo_file");
        $stmt->execute([$teamCode, $teamName, $countryCode, $countryName, $logoFile, $teamId]);
        $row = $stmt->fetch();
        if (!$row) json_error('Klub neexistuje', 404);
        json_ok($row);
    } catch (PDOException $e) {
        if ($e->getCode() === '23505') json_error('Kód klubu už existuje', 409);
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
