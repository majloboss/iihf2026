<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-teams
// Trvaly ciselnik klubov UEFA (admin.uefa_clubs), nie je viazany na rocnik.
// Kluby sa nemazu, ked na nich visia zapasy — deaktivuju sa.
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query("SELECT c.club_id AS team_id, c.club_code AS team_code, c.club_name AS team_name,
               c.country_code, c.is_active, c.logo_file, c.home_venue,
               s.name_sk AS country_name,
               COALESCE(s.sport_code_uefa, s.country_code) AS country_display_code,
               (SELECT COUNT(*) FROM \"lm2026-27\".games g
                 WHERE g.home_team_id = c.club_id OR g.away_team_id = c.club_id) AS game_count
          FROM admin.uefa_clubs c
          LEFT JOIN admin.countries s ON s.country_code = c.country_code
         ORDER BY c.club_name, c.club_id")->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$clean = function (array $data, bool $requireCode = true) {
    $teamCode = strtoupper(trim((string)($data['team_code'] ?? '')));
    $teamName = trim((string)($data['team_name'] ?? ''));
    $countryCode = strtoupper(trim((string)($data['country_code'] ?? '')));
    $logoFile = trim((string)($data['logo_file'] ?? ''));
    $homeVenue = trim((string)($data['home_venue'] ?? ''));
    $isActive = !isset($data['is_active']) || filter_var($data['is_active'], FILTER_VALIDATE_BOOLEAN);

    if ($requireCode && ($teamCode === '' || !preg_match('/^[A-Z0-9_-]{2,20}$/', $teamCode))) {
        json_error('Kód klubu musí mať 2 až 20 znakov: A-Z, 0-9, _ alebo -', 400);
    }
    if ($teamName === '' || mb_strlen($teamName) > 100) json_error('Názov klubu je povinný a môže mať najviac 100 znakov', 400);
    // Ciselnik pouziva ISO 3166, pri britskych krajinach ISO 3166-2 (GB-ENG).
    if ($countryCode !== '' && !preg_match('/^[A-Z]{2,3}(-[A-Z]{2,3})?$/', $countryCode)) json_error('Kód štátu má neplatný formát', 400);
    if (mb_strlen($homeVenue) > 200) json_error('Štadión môže mať najviac 200 znakov', 400);
    if ($logoFile !== '' && (basename($logoFile) !== $logoFile || !preg_match('/^[A-Za-z0-9_.-]+\.png$/i', $logoFile))) {
        json_error('Logo musí byť názov PNG súboru bez cesty', 400);
    }

    return [$teamCode, $teamName, $countryCode ?: null, $logoFile ?: null, $homeVenue ?: null, $isActive];
};

$countryExists = function (?string $countryCode) use ($pdo) {
    if ($countryCode === null) return;
    $stmt = $pdo->prepare('SELECT 1 FROM admin.countries WHERE country_code = ?');
    $stmt->execute([$countryCode]);
    if (!$stmt->fetch()) json_error('Vybraný štát neexistuje v číselníku', 400);
};

$returning = 'club_id AS team_id, club_code AS team_code, club_name AS team_name, country_code, logo_file, home_venue, is_active';

if ($method === 'POST') {
    [$teamCode, $teamName, $countryCode, $logoFile, $homeVenue, $isActive] = $clean($body);
    $countryExists($countryCode);
    // PDO posiela PHP false ako prazdny retazec, Postgres ho pre boolean neprijme.
    $isActiveSql = $isActive ? 'TRUE' : 'FALSE';
    try {
        $stmt = $pdo->prepare("INSERT INTO admin.uefa_clubs (club_code, club_name, country_code, logo_file, home_venue, is_active)
                               VALUES (?, ?, ?, ?, ?, $isActiveSql) RETURNING $returning");
        $stmt->execute([$teamCode, $teamName, $countryCode, $logoFile, $homeVenue ?: null]);
        json_ok($stmt->fetch(), 201);
    } catch (PDOException $e) {
        if ($e->getCode() === '23505') json_error('Kód klubu už existuje', 409);
        throw $e;
    }
}

if ($method === 'PUT') {
    $teamId = (int)($body['team_id'] ?? 0);
    if (!$teamId) json_error('Chýba team_id', 400);
    [$teamCode, $teamName, $countryCode, $logoFile, $homeVenue, $isActive] = $clean($body);
    $countryExists($countryCode);
    $isActiveSql = $isActive ? 'TRUE' : 'FALSE';
    try {
        $stmt = $pdo->prepare("UPDATE admin.uefa_clubs
                                  SET club_code = ?, club_name = ?, country_code = ?, logo_file = ?,
                                      home_venue = ?, is_active = $isActiveSql, updated_at = NOW()
                                WHERE club_id = ? RETURNING $returning");
        $stmt->execute([$teamCode, $teamName, $countryCode, $logoFile, $homeVenue ?: null, $teamId]);
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

    // Klub so zapasmi je sucastou historie, nesmie zmiznut — deaktivuje sa.
    $used = $pdo->prepare('SELECT COUNT(*) FROM "lm2026-27".games WHERE home_team_id = ? OR away_team_id = ?');
    $used->execute([$teamId, $teamId]);
    if ((int)$used->fetchColumn() > 0) {
        $stmt = $pdo->prepare("UPDATE admin.uefa_clubs SET is_active = FALSE, updated_at = NOW()
                                WHERE club_id = ? RETURNING $returning");
        $stmt->execute([$teamId]);
        $row = $stmt->fetch();
        if (!$row) json_error('Klub neexistuje', 404);
        json_ok(['deactivated' => true, 'team' => $row]);
    }

    $stmt = $pdo->prepare('DELETE FROM admin.uefa_clubs WHERE club_id = ?');
    $stmt->execute([$teamId]);
    if ($stmt->rowCount() === 0) json_error('Klub neexistuje', 404);
    json_ok(['team_id' => $teamId, 'deleted' => true]);
}

json_error('Method not allowed', 405);
