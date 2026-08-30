<?php
// PUT /v1/admin/ucl-standings — rucna uprava poradia v ligovej tabulke
//
// Pri rovnosti bodov a skore rozhoduju dalsie kriteria UEFA, ktore aplikacia
// nepozna (vzajomne zapasy, disciplinarne body, koeficient). Admin preto musi
// vediet poradie prestavit rucne.
//
// Body: { order: [club_id, ...] }  — cele poradie v jednom volani, 1. az N.
//
// Poradie sa uklada aj s priznakom finalized, aby ho prepocet uz neprepisal.
require_auth(true);
$pdo = db();

if ($method !== 'PUT') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$order = $body['order'] ?? null;
if (!is_array($order) || !$order) json_error('Chýba poradie klubov', 400);

// Prestavuje sa iba poradie, ostatne cisla zostavaju — preto sa meni len rank.
$existujuce = $pdo->query('SELECT team_id FROM "lm2026-27".group_standings
                            WHERE phase = \'LEAGUE\'')->fetchAll(PDO::FETCH_COLUMN);
$existujuce = array_map('intval', $existujuce);

$poradie = array_map('intval', $order);
if (count($poradie) !== count($existujuce)) {
    json_error('Poradie musí obsahovať všetky kluby tabuľky', 400);
}
if (array_diff($poradie, $existujuce) || array_diff($existujuce, $poradie)) {
    json_error('Poradie obsahuje klub, ktorý v tabuľke nie je', 400);
}

try {
    $pdo->beginTransaction();
    $upd = $pdo->prepare('UPDATE "lm2026-27".group_standings
                             SET rank = ?, finalized = TRUE, updated_at = NOW()
                           WHERE phase = \'LEAGUE\' AND team_id = ?');
    foreach ($poradie as $i => $clubId) {
        $upd->execute([$i + 1, $clubId]);
    }
    $pdo->commit();
    json_ok(['updated' => count($poradie)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Uloženie poradia zlyhalo: ' . $e->getMessage(), 500);
}
