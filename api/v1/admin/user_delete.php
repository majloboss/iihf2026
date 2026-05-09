<?php
// POST /v1/admin/user-delete
$auth = require_admin();
if ($method !== 'POST') json_error('Method not allowed', 405);

$body = json_decode(file_get_contents('php://input'), true);
$id   = (int)($body['id'] ?? 0);
if (!$id) json_error('Chýba id', 400);

if ($id === (int)$auth['user_id']) json_error('Nemôžeš zmazať sám seba', 403);

$pdo = db();
$uname = $pdo->prepare('SELECT username FROM admin.users WHERE id = ?');
$uname->execute([$id]);
if ($uname->fetchColumn() === 'admin') json_error('Exkluzívny admin nemôže byť zmazaný', 403);

// Vyčisti závislosti pred mazaním (foreign keys bez CASCADE)
$pdo->prepare('DELETE FROM admin.group_members WHERE user_id = ?')->execute([$id]);

// Skupiny vytvorené týmto userom — presun členov preč, potom zmaž skupinu
$grps = $pdo->prepare('SELECT id FROM admin.friend_groups WHERE created_by = ?');
$grps->execute([$id]);
foreach ($grps->fetchAll() as $g) {
    $pdo->prepare('DELETE FROM admin.group_members WHERE group_id = ?')->execute([$g['id']]);
}
$pdo->prepare('DELETE FROM admin.friend_groups WHERE created_by = ?')->execute([$id]);

// Pozvánky — uvoľni referencie
$pdo->prepare('UPDATE admin.invites SET user_id = NULL WHERE user_id = ?')->execute([$id]);
$pdo->prepare('UPDATE admin.invites SET created_by = NULL WHERE created_by = ?')->execute([$id]);

// scoring_config — uvoľni updated_by
$pdo->prepare('UPDATE iihf2026.scoring_config SET updated_by = NULL WHERE updated_by = ?')->execute([$id]);

// Zmaž usera (tips, notification_settings, notification_log majú ON DELETE CASCADE)
$pdo->prepare('DELETE FROM admin.users WHERE id = ?')->execute([$id]);

json_ok(['deleted' => true]);
