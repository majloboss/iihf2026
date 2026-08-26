<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-countries
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query('SELECT c.source_id, c.country_code, c.country_code2, c.sport_code_fifa, c.sport_code_iihf, c.sport_code_uefa, c.name_sk, c.name_sk_long, c.name_en, c.name_original, c.flag_file, c.flag_file_big, c.flag_check, c.is_active, COUNT(t.team_id) AS team_count FROM admin.countries c LEFT JOIN "lm2026-27".teams t ON t.country_code = c.country_code GROUP BY c.source_id, c.country_code, c.country_code2, c.sport_code_fifa, c.sport_code_iihf, c.sport_code_uefa, c.name_sk, c.name_sk_long, c.name_en, c.name_original, c.flag_file, c.flag_file_big, c.flag_check, c.is_active ORDER BY c.name_sk, c.country_code')->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$code = strtoupper(trim((string)($body['country_code'] ?? '')));
$nameSk = trim((string)($body['name_sk'] ?? ''));
$nameEn = trim((string)($body['name_en'] ?? ''));
$nameOriginal = trim((string)($body['name_original'] ?? ''));
$flagFile = trim((string)($body['flag_file'] ?? ''));
$code2 = strtoupper(trim((string)($body['country_code2'] ?? '')));
$nameSkLong = trim((string)($body['name_sk_long'] ?? ''));
$flagFileBig = trim((string)($body['flag_file_big'] ?? ''));
$sportFifa = strtoupper(trim((string)($body['sport_code_fifa'] ?? '')));
$sportIihf = strtoupper(trim((string)($body['sport_code_iihf'] ?? '')));
$sportUefa = strtoupper(trim((string)($body['sport_code_uefa'] ?? '')));
$hasSourceId = array_key_exists('source_id', $body);
$hasFlagCheck = array_key_exists('flag_check', $body);
$sourceId = trim((string)($body['source_id'] ?? ''));
$flagCheck = trim((string)($body['flag_check'] ?? ''));
$isActive = !isset($body['is_active']) || filter_var($body['is_active'], FILTER_VALIDATE_BOOLEAN);
if (!preg_match('/^[A-Z]{2,3}(-[A-Z]{2,3})?$/', $code)) json_error('Kód štátu musí byť napr. SVK alebo GB-ENG', 400);
foreach ([$nameSk, $nameEn] as $name) if ($name === '' || mb_strlen($name) > 100) json_error('Slovenský a anglický názov štátu sú povinné, najviac 100 znakov', 400);
if ($nameOriginal !== '' && mb_strlen($nameOriginal) > 100) json_error('Originálny názov môže mať najviac 100 znakov', 400);
if ($code2 !== '' && !preg_match('/^[A-Z]{2,3}(-[A-Z]{2,3})?$/', $code2)) json_error('Krátky kód štátu má neplatný formát', 400);
foreach (['FIFA' => $sportFifa, 'IIHF' => $sportIihf, 'UEFA' => $sportUefa] as $sport => $sportCode) {
    if ($sportCode !== '' && !preg_match('/^[A-Z]{2,3}$/', $sportCode)) json_error("Športový kód $sport musí mať 2 alebo 3 písmená", 400);
}
if ($sourceId !== '' && !ctype_digit($sourceId)) json_error('Zdrojové ID musí byť číslo', 400);
if ($flagCheck !== '' && mb_strlen($flagCheck) > 50) json_error('Kontrola vlajky môže mať najviac 50 znakov', 400);
if ($nameSkLong !== '' && mb_strlen($nameSkLong) > 150) json_error('Dlhý slovenský názov môže mať najviac 150 znakov', 400);
foreach ([$flagFile, $flagFileBig] as $flag) {
    if ($flag !== '' && (basename($flag) !== $flag || !preg_match('/^[A-Za-z0-9_.-]+\.png$/i', $flag))) json_error('Vlajka musí byť názov PNG súboru bez cesty', 400);
}

try {
    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT INTO admin.countries (source_id, country_code, country_code2, sport_code_fifa, sport_code_iihf, sport_code_uefa, name_sk, name_sk_long, name_en, name_original, flag_file, flag_file_big, flag_check, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING source_id, country_code, country_code2, sport_code_fifa, sport_code_iihf, sport_code_uefa, name_sk, name_sk_long, name_en, name_original, flag_file, flag_file_big, flag_check, is_active');
        $stmt->execute([$sourceId !== '' ? (int)$sourceId : null, $code, $code2 ?: null, $sportFifa ?: null, $sportIihf ?: null, $sportUefa ?: null, $nameSk, $nameSkLong ?: null, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $flagFileBig ?: null, $flagCheck ?: null, $isActive]);
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
                $create = $pdo->prepare('INSERT INTO admin.countries (source_id, country_code, country_code2, sport_code_fifa, sport_code_iihf, sport_code_uefa, name_sk, name_sk_long, name_en, name_original, flag_file, flag_file_big, flag_check, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $create->execute([$sourceId !== '' ? (int)$sourceId : null, $code, $code2 ?: null, $sportFifa ?: null, $sportIihf ?: null, $sportUefa ?: null, $nameSk, $nameSkLong ?: null, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $flagFileBig ?: null, $flagCheck ?: null, $isActive]);
            } else {
                $rename = $pdo->prepare('UPDATE admin.countries SET source_id = COALESCE(?, source_id), country_code2 = ?, sport_code_fifa = ?, sport_code_iihf = ?, sport_code_uefa = ?, name_sk = ?, name_sk_long = ?, name_en = ?, name_original = ?, flag_file = ?, flag_file_big = ?, flag_check = COALESCE(?, flag_check), is_active = ?, updated_at = NOW() WHERE country_code = ?');
                $rename->execute([$hasSourceId && $sourceId !== '' ? (int)$sourceId : null, $code2 ?: null, $sportFifa ?: null, $sportIihf ?: null, $sportUefa ?: null, $nameSk, $nameSkLong ?: null, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $flagFileBig ?: null, $hasFlagCheck && $flagCheck !== '' ? $flagCheck : null, $isActive, $code]);
            }
            $move = $pdo->prepare('UPDATE "lm2026-27".teams SET country_code = ?, country_name = ? WHERE country_code = ?');
            $move->execute([$code, $nameSk, $oldCode]);
            $remove = $pdo->prepare('DELETE FROM admin.countries WHERE country_code = ?');
            $remove->execute([$oldCode]);
        } else {
            $rename = $pdo->prepare('UPDATE admin.countries SET source_id = ?, country_code2 = ?, sport_code_fifa = ?, sport_code_iihf = ?, sport_code_uefa = ?, name_sk = ?, name_sk_long = ?, name_en = ?, name_original = ?, flag_file = ?, flag_file_big = ?, flag_check = ?, is_active = ?, updated_at = NOW() WHERE country_code = ?');
            $rename->execute([$hasSourceId && $sourceId !== '' ? (int)$sourceId : null, $code2 ?: null, $sportFifa ?: null, $sportIihf ?: null, $sportUefa ?: null, $nameSk, $nameSkLong ?: null, $nameEn, $nameOriginal ?: null, $flagFile ?: null, $flagFileBig ?: null, $hasFlagCheck && $flagCheck !== '' ? $flagCheck : null, $isActive, $code]);
        }
        // country_name v teams je pozostatok; ciselnik je zdroj pravdy, drzime ho zosynchronizovany.
        $sync = $pdo->prepare('UPDATE "lm2026-27".teams SET country_name = ? WHERE country_code = ?');
        $sync->execute([$nameSk, $code]);
        $result = $pdo->prepare('SELECT source_id, country_code, country_code2, sport_code_fifa, sport_code_iihf, sport_code_uefa, name_sk, name_sk_long, name_en, name_original, flag_file, flag_file_big, flag_check, is_active FROM admin.countries WHERE country_code = ?');
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
