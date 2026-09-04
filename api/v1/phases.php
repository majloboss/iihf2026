<?php
// GET /v1/phases?competition_id=X
// Fázy a kolá súťaže pre filtre nad zápasmi.
//
// Číselník nahrádza zoznamy, ktoré mala každá obrazovka natvrdo v kóde —
// skratky sa odvodzovali z názvu regulárnymi výrazmi zvlášť pre každú súťaž.
//
// Vracia sa celý číselník vrátane fáz bez odohraných zápasov: filter má
// ukazovať aj kolá, ktoré ešte len prídu. Neaktívne fázy sa vynechávajú.

$auth = require_auth();
$pdo  = db();

$cid = (int)($_GET['competition_id'] ?? 0);
if (!$cid) json_error('Chýba competition_id', 400);

$q = $pdo->prepare('
    SELECT id, phase_code, phase_name, match_stat_code, match_stat_desc,
           color_code, group_code, sort_order
      FROM admin.competition_phases
     WHERE competition_id = ? AND is_active
     ORDER BY sort_order, match_stat_code');
$q->execute([$cid]);

json_ok(array_map(fn($r) => [
    'id'         => (int)$r['id'],
    'phase_code' => $r['phase_code'],
    'phase_name' => $r['phase_name'],
    'code'       => $r['match_stat_code'],
    'label'      => $r['match_stat_code'],
    'title'      => $r['match_stat_desc'],
    'color'      => $r['color_code'],
    'group'      => $r['group_code'],
], $q->fetchAll()));
