<?php
// GET/POST/PUT/DELETE /v1/admin/ucl-countries
require_auth(true);
$pdo = db();

if ($method === 'GET') {
    $rows = $pdo->query('SELECT country_code, country_name FROM "lm2026-27".countries ORDER BY country_name, country_code')->fetchAll();
    json_ok($rows);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$code = strtoupper(trim((string)($body['country_code'] ?? '')));
$name = trim((string)($body['country_name'] ?? ''));
if (!preg_match('/^[A-Z]{3}$/', $code)) json_error('Kód štátu musí mať presne 3 písmená', 400);
if ($name === '' || mb_strlen($name) > 100) json_error('Názov štátu je povinný a môže mať najviac 100 znakov', 400);

try {
    if ($method === 'POST') {
        $stmt = $pdo->prepare('INSERT INTO "lm2026-27".countries (country_code, country_name) VALUES (?, ?) RETURNING country_code, country_name');
        $stmt->execute([$code, $name]);
        json_ok($stmt->fetch(), 201);
    }

    if ($method === 'PUT') {
        $oldCode = strtoupper(trim((string)($body['old_country_code'] ?? $code)));
        $pdo->beginTransaction();
        $exists = $pdo->prepare('SELECT 1 FROM "lm2026-27".countries WHERE country_code = ?');
        $exists->execute([$oldCode]);
        if (!$exists->fetch()) json_error('Štát neexistuje', 404);

        if ($oldCode !== $code) {
            $target = $pdo->prepare('SELECT 1 FROM "lm2026-27".countries WHERE country_code = ?');
            $target->execute([$code]);
            if (!$target->fetch()) {
                $create = $pdo->prepare('INSERT INTO "lm2026-27".countries (country_code, country_name) VALUES (?, ?)');
                $create->execute([$code, $name]);
            } else {
                $rename = $pdo->prepare('UPDATE "lm2026-27".countries SET country_name = ? WHERE country_code = ?');
                $rename->execute([$name, $code]);
            }
            $move = $pdo->prepare('UPDATE "lm2026-27".teams SET country_code = ?, country_name = ? WHERE country_code = ?');
            $move->execute([$code, $name, $oldCode]);
            $remove = $pdo->prepare('DELETE FROM "lm2026-27".countries WHERE country_code = ?');
            $remove->execute([$oldCode]);
        } else {
            $rename = $pdo->prepare('UPDATE "lm2026-27".countries SET country_name = ? WHERE country_code = ?');
            $rename->execute([$name, $code]);
        }
        $sync = $pdo->prepare('UPDATE "lm2026-27".teams SET country_name = ? WHERE country_code = ?');
        $sync->execute([$name, $code]);
        $result = $pdo->prepare('SELECT country_code, country_name FROM "lm2026-27".countries WHERE country_code = ?');
        $result->execute([$code]);
        $row = $result->fetch();
        $pdo->commit();
        json_ok($row);
    }

    if ($method === 'DELETE') {
        $stmt = $pdo->prepare('DELETE FROM "lm2026-27".countries WHERE country_code = ?');
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
