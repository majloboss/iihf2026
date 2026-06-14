<?php
// POST /v1/admin/fifa-game-update
// Zadá výsledok FIFA zápasu (90 min + finálny výsledok po ET/penalties)
// Body: { game_id, home_score_regular, away_score_regular, home_score_final?, away_score_final? }
require_auth(true);
$pdo = db();

if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$gid  = (int)($body['game_id']            ?? 0);
$h90  = $body['home_score_regular']       ?? null;
$a90  = $body['away_score_regular']       ?? null;
$hFin = $body['home_score_final']         ?? null;
$aFin = $body['away_score_final']         ?? null;
$approve = (bool)($body['result_approved'] ?? true);

if (!$gid) json_error('Chýba game_id', 400);
if (!is_numeric($h90) || !is_numeric($a90) || $h90 < 0 || $a90 < 0) {
    json_error('Neplatné skóre (90 min)', 400);
}

$stmt = $pdo->prepare("SELECT game_id, game_type_code FROM fifa2026.games WHERE game_id = ?");
$stmt->execute([$gid]);
$game = $stmt->fetch();
if (!$game) json_error('Zápas neexistuje', 404);

$isPlayoff = !str_starts_with($game['game_type_code'], 'GROUP_');
$isDraw90  = (int)$h90 === (int)$a90;

// Play-off remíza po 90 min → povinný konečný výsledok s víťazom
if ($isPlayoff && $isDraw90) {
    if (!is_numeric($hFin) || !is_numeric($aFin)) {
        json_error('Remíza v play-off — zadaj konečný výsledok (po ET/penaltách)', 400);
    }
    if ((int)$hFin < (int)$h90 || (int)$aFin < (int)$a90) {
        json_error('Konečný výsledok nemôže byť nižší ako po 90 min', 400);
    }
    if ((int)$hFin === (int)$aFin) {
        json_error('Po ET/penaltách musí byť víťaz (nie remíza)', 400);
    }
} elseif ($hFin !== null && $aFin !== null && is_numeric($hFin) && is_numeric($aFin)) {
    // Konečný výsledok zadaný mimo remízy → nepovolené
    json_error('Predĺženie je možné len pri remíze po 90 min', 400);
}

$approvedSql = $approve ? 'TRUE' : 'FALSE';
$pdo->prepare("
    UPDATE fifa2026.games SET
        home_score_regular = ?,
        away_score_regular = ?,
        home_score_final   = ?,
        away_score_final   = ?,
        result_approved    = $approvedSql,
        tips_open          = FALSE,
        updated_at         = NOW()
    WHERE game_id = ?
")->execute([(int)$h90, (int)$a90, $hFin !== null ? (int)$hFin : null,
             $aFin !== null ? (int)$aFin : null, $gid]);

// Skupinový zápas → prepočítaj tabuľky skupín automaticky (rovnako ako fifa_game_edit).
// Funkcia číta len schválené zápasy, takže funguje pri schválení aj zrušení výsledku.
if (!$isPlayoff) {
    require __DIR__ . '/../../helpers/fifa_standings_fn.php';
    fifa_recalc_standings($pdo);
}

json_ok(['game_id' => $gid, 'saved' => true]);
