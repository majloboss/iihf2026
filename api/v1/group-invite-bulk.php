<?php
// POST /v1/group-invite-bulk
// Pozve všetkých akceptovaných členov zo zdrojovej skupiny do cieľovej skupiny.
// Body: { group_id: X, source_group_id: Y }
$auth = require_auth();
$pdo  = db();
require_once __DIR__ . '/../helpers/notify_group_event.php';

if ($method !== 'POST') json_error('Method not allowed', 405);

$body           = json_decode(file_get_contents('php://input'), true);
$group_id       = (int)($body['group_id']        ?? 0);
$source_group_id = (int)($body['source_group_id'] ?? 0);

if (!$group_id || !$source_group_id) json_error('Chýba group_id alebo source_group_id', 400);
if ($group_id === $source_group_id)  json_error('Zdrojová a cieľová skupina musia byť rôzne', 400);

// Overenie: user musí byť zakladateľ cieľovej skupiny
$chk = $pdo->prepare('SELECT id, name, created_by FROM admin.friend_groups WHERE id = ?');
$chk->execute([$group_id]);
$grp = $chk->fetch();
if (!$grp) json_error('Cieľová skupina neexistuje', 404);
if ((int)$grp['created_by'] !== (int)$auth['user_id']) json_error('Len zakladateľ môže posielať hromadné pozvánky', 403);
$target_group_name = $grp['name'];

$inviterRow = $pdo->prepare("SELECT username FROM admin.users WHERE id = ?");
$inviterRow->execute([$auth['user_id']]);
$inviter_username = $inviterRow->fetchColumn() ?: 'Niekto';

// Načítaj akceptovaných členov zdrojovej skupiny (okrem samotného zakladateľa cieľovej skupiny)
$stmt = $pdo->prepare("
    SELECT user_id FROM admin.group_members
    WHERE group_id = ? AND status = 'accepted' AND user_id != ?
");
$stmt->execute([$source_group_id, $auth['user_id']]);
$sourceMembers = $stmt->fetchAll(PDO::FETCH_COLUMN);

if (empty($sourceMembers)) json_ok(['invited' => 0, 'skipped' => 0]);

// Načítaj existujúcich členov cieľovej skupiny (aby sme neposielali duplicitné pozvania)
$stmt2 = $pdo->prepare("SELECT user_id FROM admin.group_members WHERE group_id = ?");
$stmt2->execute([$group_id]);
$existing = array_flip($stmt2->fetchAll(PDO::FETCH_COLUMN));

$invited = 0;
$skipped = 0;

$ins = $pdo->prepare(
    "INSERT INTO admin.group_members (group_id, user_id, status, joined_at)
     VALUES (?, ?, 'invited', NOW())
     ON CONFLICT (group_id, user_id) DO NOTHING"
);

foreach ($sourceMembers as $uid) {
    if (isset($existing[$uid])) { $skipped++; continue; }
    $ins->execute([$group_id, $uid]);
    if ($ins->rowCount() > 0) {
        $invited++;
        notify_group_event($pdo, (int)$uid, 'Pozvánka do skupiny', $inviter_username . ' Ťa pozval do skupiny "' . $target_group_name . '"');
    } else $skipped++;
}

json_ok(['invited' => $invited, 'skipped' => $skipped]);
