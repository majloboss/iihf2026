<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-countries
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query('SELECT c.country_code, c.name_sk, c.name_en, c.name_original, c.flag_file, c.is_active, COUNT(t.team_id) AS team_count FROM admin.countries c LEFT JOIN "lm2026-27".teams t ON t.country_code = c.country_code GROUP BY c.country_code, c.name_sk, c.name_en, c.name_original, c.flag_file, c.is_active ORDER BY c.name_sk, c.country_code')->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$code = strtoupper(trim((string)($body['country_code'] ?? '')));
$nameSk = trim((string)($body['name_sk'] ?? ''));
$nameEn = trim((string)($body['name_en'] ?? ''));
$nameOriginal = trim((string)($body['name_original'] ?? ''));
$flagFile = trim((string)($body['flag_file'] ?? ''));
if (!preg_match('/^[A-Z]{3}$/', $code)) json_error('Kód štátu musí mať presne 3 písmená', 400);
foreach ([$nameSk, $nameEn] as $name) if ($name === '' || mb_strlen($name) > 100) json_error('Slovenský a anglický názov štátu sú povinné, najviac 100 znakov', 400);
if ($nameOriginal !== '' && mb_strlen($nameOriginal) > 100) json_error('Originálny názov môže mať najviac 100 znakov', 400);
if ($flagFile !== '' && (basename($flagFile) !== $flagFile || !preg_match('/^[A-Za-z0-9_.-]+\.png$/i', $flagFile))) json_error('Vlajka musí byť názov PNG súboru bez cesty', 400);

try {
    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT INTO admin.countries (country_code, name_sk, name_en, name_original, flag_file) VALUES (?, ?, ?, ?, ?) RETURNING country_code, name_sk, name_en, name_original, flag_file');
        $stmt->execute([$code, $nameSk, $nameEn, $nameOriginal ?: null, $flagFile ?: null]);
        json_ok($stmt->fetch(), 201);
    }

    if ($method === 'PUT') {
        $oldCode = strtoupper(trim((string)($body['old_country_code'] ?? $code)));
        $pdo->beginTransaction();
        $exists = $pdo->prepare('SELECT 1 FROM admin.countries WHERE country_code = ?');
        $exists->execute([$oldCode]);
        if (!$exists->fetch()) json_error('Štát neexistuje', 404);

        if ($oldCode !== $code) {
            $target = $pdo->prepare('SELECT 1 FROM admin.countries WHERE country_code = ?');
            $target->execute([$code]);
            if (!$target->fetch()) {
                $create = $pdo->prepare('INSERT INTO admin.countries (country_code, name_sk, name_en, name_original, flag_file) VALUES (?, ?, ?, ?, ?)');
                $create->execute([$code, $nameSk, $nameEn, $nameOriginal ?: null, $flagFile ?: null]);
            } else {
                $rename = $pdo->prepare('UPDATE admin.countries SET name_sk = ?, name_en = ?, name_original = ?, flag_file = ?, updated_at = NOW() WHERE country_code = ?');
                $rename->execute([$nameSk, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $code]);
            }
            $move = $pdo->prepare('UPDATE "lm2026-27".teams SET country_code = ?, country_name = ? WHERE country_code = ?');
            $move->execute([$code, $nameEn, $oldCode]);
            $remove = $pdo->prepare('DELETE FROM admin.countries WHERE country_code = ?');
            $remove->execute([$oldCode]);
        } else {
            $rename = $pdo->prepare('UPDATE admin.countries SET name_sk = ?, name_en = ?, name_original = ?, flag_file = ?, updated_at = NOW() WHERE country_code = ?');
            $rename->execute([$nameSk, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $code]);
        }
        $sync = $pdo->prepare('UPDATE "lm2026-27".teams SET country_name = ? WHERE country_code = ?');
        $sync->execute([$nameEn, $code]);
        $result = $pdo->prepare('SELECT country_code, name_sk, name_en, name_original, flag_file FROM admin.countries WHERE country_code = ?');
        $result->execute([$code]);
        $row = $result->fetch();
        $pdo->commit();
        json_ok($row);
    }

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM admin.countries WHERE country_code = ?');
        $stmt->execute([$code]);
        if ($stmt->rowCount() === 0) json_error('Štát neexistuje', 404);
        json_ok(['country_code' => $code]);
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($e->getCode() === '23505') json_error('Kód štátu už existuje', 409);
    if ($e->getCode() === '23503') json_error('Štát sa nedá zmazať, používajú ho kluby', 409);
    throw $e;
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}

json_error('Method not allowed', 405);
