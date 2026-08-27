<?php
// GET    /v1/admin/livescore-log — zaznamy odpovedi livescore modelu
//        ?match_id=X  len jeden zapas
//        ?limit=N     pocet zaznamov (predvolene 200)
// DELETE /v1/admin/livescore-log — vymaze zaznamnik
//
// Docasny nastroj: sluzi na rozhodnutie, ktore udaje z Flashscore ukladat natrvalo.
require_auth(true);
$pdo = db();

if ($method === 'DELETE') {
    $pdo->exec('TRUNCATE admin.livescore_log RESTART IDENTITY');
    json_ok(['cleared' => true]);
}

if ($method !== 'GET') json_error('Method not allowed', 405);

$matchId = trim((string)($_GET['match_id'] ?? ''));
$limit   = min(max((int)($_GET['limit'] ?? 200), 1), 1000);

$where  = $matchId !== '' ? 'WHERE match_id = :mid' : '';
$stmt = $pdo->prepare("SELECT * FROM admin.livescore_log $where ORDER BY checked_at DESC, id DESC LIMIT $limit");
if ($matchId !== '') $stmt->bindValue(':mid', $matchId);
$stmt->execute();
$rows = $stmt->fetchAll();

$ints  = ['id','minute','home_score','away_score','home_score_halftime','away_score_halftime',
          'home_yellow_cards','away_yellow_cards','home_red_cards','away_red_cards','tokens','took_ms'];
$bools = ['started','finished'];
foreach ($rows as &$r) {
    foreach ($ints  as $c) $r[$c] = $r[$c] === null ? null : (int)$r[$c];
    foreach ($bools as $c) $r[$c] = $r[$c] === null ? null
        : ($r[$c] === true || $r[$c] === 't' || $r[$c] === '1' || $r[$c] === 1);
    if (isset($r['raw']) && is_string($r['raw'])) $r['raw'] = json_decode($r['raw'], true);
}
unset($r);

// Kolko percent zaznamov ma dane pole vyplnene — z toho vidno, co ma zmysel ukladat.
$fields = ['home_team','away_team','competition','started','finished','minute','minute_note',
           'period','status','home_score','away_score','home_score_halftime','away_score_halftime',
           'home_yellow_cards','away_yellow_cards','home_red_cards','away_red_cards',
           'start_time_text','notes'];
$fill = [];
$total = count($rows);
foreach ($fields as $f) {
    $n = 0;
    foreach ($rows as $r) if ($r[$f] !== null && $r[$f] !== '') $n++;
    $fill[$f] = ['count' => $n, 'pct' => $total ? (int)round($n * 100 / $total) : 0];
}

$stats = $pdo->query('SELECT COUNT(*) AS total, COUNT(DISTINCT match_id) AS matches,
                             MIN(checked_at) AS first_at, MAX(checked_at) AS last_at,
                             AVG(tokens)::int AS avg_tokens, AVG(took_ms)::int AS avg_ms
                        FROM admin.livescore_log')->fetch();

json_ok(['rows' => $rows, 'fill' => $fill, 'shown' => $total, 'stats' => $stats]);
