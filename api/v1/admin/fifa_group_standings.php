<?php
// POST   /v1/admin/fifa-group-standings  — sync z výsledkov (90 min) do DB
// PUT    /v1/admin/fifa-group-standings  — update jedného riadku (reorder/finalize)
// DELETE /v1/admin/fifa-group-standings/{ph} — reset fázy (vynuluj)
require_auth(true);
$pdo = db();

$GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

if ($method === 'POST') {
    require __DIR__ . '/../../helpers/fifa_standings_fn.php';
    $res = fifa_recalc_standings($pdo);
    json_ok(['synced' => true] + $res);

} elseif ($method === 'PUT') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!isset($body['phase'], $body['team'])) json_error('Missing phase/team', 400);

    $pdo->prepare("
        INSERT INTO fifa2026.group_standings (phase, team, rank, gp, w, d, l, gf, ga, pts, finalized, updated_at)
        VALUES (:phase,:team,:rank,:gp,:w,:d,:l,:gf,:ga,:pts,:finalized,NOW())
        ON CONFLICT (phase, team) DO UPDATE SET
            rank=EXCLUDED.rank, gp=EXCLUDED.gp, w=EXCLUDED.w, d=EXCLUDED.d,
            l=EXCLUDED.l, gf=EXCLUDED.gf, ga=EXCLUDED.ga, pts=EXCLUDED.pts,
            finalized=EXCLUDED.finalized, updated_at=NOW()
    ")->execute([
        'phase'=>$body['phase'], 'team'=>$body['team'],
        'rank'=>(int)($body['rank'] ?? 1),
        'gp'=>(int)($body['gp'] ?? 0), 'w'=>(int)($body['w'] ?? 0),
        'd'=>(int)($body['d'] ?? 0), 'l'=>(int)($body['l'] ?? 0),
        'gf'=>(int)($body['gf'] ?? 0), 'ga'=>(int)($body['ga'] ?? 0),
        'pts'=>(int)($body['pts'] ?? 0),
        'finalized'=>(bool)($body['finalized'] ?? false),
    ]);
    json_ok(['updated' => true]);

} elseif ($method === 'DELETE') {
    $parts = explode('/', $path);
    $ph = strtoupper(end($parts));
    if ($ph === '3P' || $ph === '3RD') {
        // Tabuľka tretích — derivovaná, pri resete riadky zmaž
        $pdo->exec("DELETE FROM fifa2026.group_standings WHERE phase='3P'");
    } elseif (in_array($ph, $GROUPS)) {
        $pdo->prepare("UPDATE fifa2026.group_standings SET gp=0,w=0,d=0,l=0,gf=0,ga=0,pts=0,rank=0,finalized=FALSE,updated_at=NOW() WHERE phase=?")->execute([$ph]);
    } else {
        // Reset všetkého: vynuluj skupiny + zmaž derivované tretie miesta
        $pdo->exec("UPDATE fifa2026.group_standings SET gp=0,w=0,d=0,l=0,gf=0,ga=0,pts=0,rank=0,finalized=FALSE,updated_at=NOW() WHERE phase IN ('A','B','C','D','E','F','G','H','I','J','K','L')");
        $pdo->exec("DELETE FROM fifa2026.group_standings WHERE phase='3P'");
    }
    json_ok(['reset' => true]);

} else {
    json_error('Method not allowed', 405);
}
