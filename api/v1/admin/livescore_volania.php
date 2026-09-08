<?php
// GET /v1/admin/livescore-volania
//
// Jednotlive volania pod riadkom v prehlade nakladov. Riadok zdruzuje zapas
// a model, takze za nim moze stat aj niekolko desiatok volani — tu su
// rozpisane po jednom, aby sa dalo vidiet, kedy ktore bezalo a co vratilo.
//
// Filtre (rovnaky kluc ako riadok v prehlade):
//   kluc    game_id alebo url; 'null' = volania bez zapasu (hromadne)
//   model   model
//   od, do  hraci den (YYYY-MM-DD)

require_auth(true);
if ($method !== 'GET') json_error('Method not allowed', 405);

$pdo = db();

$kde = [];
$par = [];

// Riadok v prehlade je zapas. Volanie ho obsluzilo, ked je v jeho live_ids —
// game_id samotne je pri hromadnom volani NULL a nedalo by sa podla neho hladat.
$gameId = $_GET['game_id'] ?? '';
$url    = $_GET['url'] ?? '';

if ($gameId !== '') {
    $kde[] = '? = ANY(l.live_ids)';
    $par[] = (int)$gameId;
} elseif ($url !== '') {
    $kde[] = 'l.url = ?';
    $par[] = $url;
} else {
    // Volania bez zapasu — starsie zaznamy spred zavedenia live_ids.
    $kde[] = 'l.live_ids IS NULL AND l.url IS NULL';
}

if (!empty($_GET['model'])) {
    $kde[] = 'l.model = ?';
    $par[] = trim((string)$_GET['model']);
}
if (!empty($_GET['od'])) {
    $kde[] = 'l.checked_at >= ?::date';
    $par[] = $_GET['od'];
}
if (!empty($_GET['do'])) {
    $kde[] = 'l.checked_at < (?::date + 1)';
    $par[] = $_GET['do'];
}

$where = 'WHERE ' . implode(' AND ', $kde);

$st = $pdo->prepare(
    "SELECT l.id, l.checked_at, l.model, l.success, l.call_type,
            l.home_team, l.away_team, l.home_score, l.away_score,
            l.status, l.minute, l.period_number,
            l.prompt_tokens, l.completion_tokens, l.tokens,
            l.cost_usd, l.took_ms, l.http_status, l.error, l.notes,
            l.game_ids, l.live_ids,
            -- Nazvy zapasov, ktore volanie prave sledovalo. Bez nich je v
            -- detaile len cislo a neda sa povedat, za co sa platilo.
            (SELECT string_agg(hc.club_name || ' — ' || ac.club_name, ', '
                               ORDER BY g.start_time, g.game_id)
               FROM \"lm2026-27\".games g
               LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
               LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
              WHERE g.game_id = ANY(COALESCE(l.live_ids, l.game_ids))) AS zapasy_nazvy
       FROM admin.livescore_log l
       $where
      ORDER BY l.checked_at DESC
      LIMIT 200");
$st->execute($par);

$volania = [];
foreach ($st->fetchAll() as $r) {
    // Skore ma zmysel len ked model vratil obe cisla — polovicny udaj by
    // v prehlade vyzeral ako platny vysledok.
    $skore = ($r['home_score'] !== null && $r['away_score'] !== null)
        ? (int)$r['home_score'] . ':' . (int)$r['away_score'] : null;

    $volania[] = [
        'id'         => (int)$r['id'],
        'cas'        => $r['checked_at'],
        'model'      => $r['model'],
        'ok'         => in_array($r['success'], [true, 't', '1', 1], true),
        'typ'        => $r['call_type'],
        'timy'       => $r['home_team']
                        ? $r['home_team'] . ' — ' . ($r['away_team'] ?? '?') : null,
        'skore'      => $skore,
        'stav'       => $r['status'],
        'minuta'     => $r['minute'] !== null ? (int)$r['minute'] : null,
        'vstup'      => (int)$r['prompt_tokens'],
        'vystup'     => (int)$r['completion_tokens'],
        'tokenov'    => (int)$r['tokens'],
        'cena'       => round((float)$r['cost_usd'], 6),
        'trvanie_ms' => $r['took_ms'] !== null ? (int)$r['took_ms'] : null,
        'http'       => $r['http_status'] !== null ? (int)$r['http_status'] : null,
        'chyba'      => $r['error'],
        'poznamka'   => $r['notes'],
        'zapasy'     => $r['zapasy_nazvy'],
        // Podiel volania na jeden beziaci zapas — takto sa cena zapasu
        // necha zratat naprieč volaniami.
        'zapasov'    => $r['live_ids'] !== null
                        ? substr_count($r['live_ids'], ',') + 1 : null,
    ];
}

json_ok(['volania' => $volania]);
