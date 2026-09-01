<?php
// POST /v1/admin/ucl-game-live — rucne nastavenie priebezneho skore
//
// Body: { game_id, ls_home, ls_away }  — nastavi zive skore
//       { game_id, clear: true }       — zmaze ho
//
// Livescore sa bezne tiahne z Flashscore cronom, ale admin ho musi vediet
// opravit aj rucne — feed moze vypadnut alebo hlasit nezmysel. Zapisuju sa
// iba ls_* stlpce; do vysledku sa hodnota dostane az cez "Prevziat livescore"
// na obrazovke Vysledky, kde ju admin potvrdi.
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$gid  = (int)($body['game_id'] ?? 0);
if (!$gid) json_error('Chýba game_id', 400);

$chk = $pdo->prepare('SELECT result_approved FROM "lm2026-27".games WHERE game_id = ?');
$chk->execute([$gid]);
$row = $chk->fetch();
if (!$row) json_error('Zápas neexistuje', 404);

if (!empty($body['clear'])) {
    $pdo->prepare('UPDATE "lm2026-27".games
                      SET ls_home = NULL, ls_away = NULL, ls_status = NULL,
                          ls_updated_at = NULL, updated_at = NOW()
                    WHERE game_id = ?')->execute([$gid]);
    json_ok(['game_id' => $gid, 'cleared' => true]);
}

// Schvaleny zapas uz ma platny vysledok, zive skore by pri nom mylilo.
if ($row['result_approved']) json_error('Zápas je už schválený, živé skóre sa nemení', 409);

$h = $body['ls_home'] ?? null;
$a = $body['ls_away'] ?? null;
if (!is_numeric($h) || !is_numeric($a) || $h < 0 || $a < 0 || $h > 99 || $a > 99) {
    json_error('Neplatné skóre', 400);
}

// Rucny zapis sa oznaci, aby bolo v prehlade vidiet, ze nejde z feedu.
$pdo->prepare('UPDATE "lm2026-27".games
                  SET ls_home = ?, ls_away = ?, ls_status = \'ručne\',
                      ls_updated_at = NOW(), updated_at = NOW()
                WHERE game_id = ?')->execute([(int)$h, (int)$a, $gid]);

json_ok(['game_id' => $gid, 'ls_home' => (int)$h, 'ls_away' => (int)$a]);
