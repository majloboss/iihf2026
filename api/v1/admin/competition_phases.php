<?php
// GET    /v1/admin/competition-phases?competition_id=X — číselník fáz súťaže
// POST   /v1/admin/competition-phases                  — pridá alebo upraví riadok
// DELETE /v1/admin/competition-phases                  — zmaže riadok
//
// Číselník drží pre každú súťaž kód a názov fázy, kód a popis konkrétneho
// zápasu pre štatistiky, farbu a poradie. Nahrádza odvodzovanie skratiek
// z názvu regulárnymi výrazmi, ktoré sa muselo písať zvlášť pre každú súťaž.

require_auth(true);
$pdo = db();

const PHASE_COLORS = ['GROUP', 'PLAYOFF', 'PLAYIN', 'BRONZE', 'GOLD', 'NEUTRAL'];

// ── Čítanie ──────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $cid = (int)($_GET['competition_id'] ?? 0);
    if (!$cid) json_error('Chýba competition_id', 400);

    $q = $pdo->prepare('
        SELECT id, phase_code, phase_name, match_stat_code, match_stat_desc,
               color_code, sort_order, is_active
          FROM admin.competition_phases
         WHERE competition_id = ?
         ORDER BY sort_order, match_stat_code');
    $q->execute([$cid]);

    json_ok([
        'colors' => PHASE_COLORS,
        'phases' => array_map(fn($r) => [
            'id'              => (int)$r['id'],
            'phase_code'      => $r['phase_code'],
            'phase_name'      => $r['phase_name'],
            'match_stat_code' => $r['match_stat_code'],
            'match_stat_desc' => $r['match_stat_desc'],
            'color_code'      => $r['color_code'],
            'sort_order'      => (int)$r['sort_order'],
            'is_active'       => (bool)$r['is_active'],
        ], $q->fetchAll()),
    ]);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

// ── Mazanie ──────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? 0);
    if (!$id) json_error('Chýba id', 400);

    // Riadok, na ktorý sa viažu zápasy, sa mazať nesmie — stratili by fázu.
    // Stĺpec `phase_id` pridáva až migrácia 073, preto sa najprv zisťuje,
    // v ktorých schémach vôbec existuje.
    $schemy = $pdo->query("
        SELECT table_schema FROM information_schema.columns
         WHERE table_name = 'games' AND column_name = 'phase_id'")->fetchAll(PDO::FETCH_COLUMN);

    $viazane = 0;
    foreach ($schemy as $sch) {
        // Názov schémy je identifikátor, nie hodnota — quote() by dal apostrofy.
        // Zoznam pochádza z information_schema, takže je bezpečný.
        $q = $pdo->prepare('SELECT COUNT(*) FROM "' . str_replace('"', '', $sch) . '".games WHERE phase_id = ?');
        $q->execute([$id]);
        $viazane += (int)$q->fetchColumn();
    }
    if ($viazane > 0) {
        json_error("Na túto fázu je naviazaných $viazane zápasov. Najprv ich prepoj inam.", 409);
    }

    $pdo->prepare('DELETE FROM admin.competition_phases WHERE id = ?')->execute([$id]);
    json_ok(['deleted' => true]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

// ── Pridanie a úprava ────────────────────────────────────────────────────────
$id    = (int)($body['id'] ?? 0);
$cid   = (int)($body['competition_id'] ?? 0);
$kod   = trim((string)($body['phase_code'] ?? ''));
$nazov = trim((string)($body['phase_name'] ?? ''));
$sKod  = trim((string)($body['match_stat_code'] ?? ''));
$sPopis= trim((string)($body['match_stat_desc'] ?? ''));
$farba = trim((string)($body['color_code'] ?? 'NEUTRAL'));
$poradie = (int)($body['sort_order'] ?? 0);
$aktivne = !empty($body['is_active']);

if (!$id && !$cid)                json_error('Chýba competition_id', 400);
if ($kod === '' || $nazov === '') json_error('Vyplň kód aj názov fázy', 400);
if ($sKod === '')                 json_error('Vyplň kód zápasu pre štatistiky', 400);
if ($sPopis === '')               $sPopis = $nazov;
if (!in_array($farba, PHASE_COLORS, true)) json_error('Neznáma farba', 400);

try {
    if ($id) {
        $pdo->prepare('
            UPDATE admin.competition_phases
               SET phase_code = ?, phase_name = ?, match_stat_code = ?,
                   match_stat_desc = ?, color_code = ?, sort_order = ?,
                   is_active = ?, updated_at = NOW()
             WHERE id = ?')
            ->execute([$kod, $nazov, $sKod, $sPopis, $farba, $poradie, $aktivne, $id]);
        json_ok(['id' => $id, 'updated' => true]);
    }

    $ins = $pdo->prepare('
        INSERT INTO admin.competition_phases
            (competition_id, phase_code, phase_name, match_stat_code,
             match_stat_desc, color_code, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id');
    $ins->execute([$cid, $kod, $nazov, $sKod, $sPopis, $farba, $poradie, $aktivne]);
    json_ok(['id' => (int)$ins->fetchColumn(), 'created' => true]);

} catch (Throwable $e) {
    // Kód zápasu je v rámci súťaže jedinečný — bez toho by filter nevedel,
    // ktoré kolo vybrať.
    if (str_contains($e->getMessage(), 'phases_stat_uniq')) {
        json_error("Kód zápasu „$sKod\" je v tejto súťaži už použitý.", 409);
    }
    json_error('Uloženie zlyhalo: ' . $e->getMessage(), 500);
}
