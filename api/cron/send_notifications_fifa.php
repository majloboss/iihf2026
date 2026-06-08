<?php
// FIFA notifikácie — analógia k send_notifications.php (IIHF).
// Zdieľané nastavenia (notification_settings: game_start/untipped_game/result_entered),
// oddelený dedup cez 'fifa_'-prefixed notif_type v notification_log.
// start_time je naive UTC → porovnávaj cez (start_time AT TIME ZONE 'UTC').
// Spúšťa sa z run.php po IIHF crone (využíva fifa_log_notif() a fifa_pts_label() z neho).

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/webpush.php';

$pdo   = db();
$vapid = wp_load_vapid();

function fifa_log_notif(PDO $pdo, int $uid, string $type, ?int $game_id): void {
    $pdo->prepare("INSERT INTO admin.notification_log (user_id, notif_type, game_id, competition_id)
                   VALUES (?, ?, ?, 2) ON CONFLICT DO NOTHING")->execute([$uid, $type, $game_id]);
}
function fifa_pts_label(int $pts): string {
    if ($pts === 1) return '1 bod';
    if ($pts >= 2 && $pts <= 4) return "$pts body";
    return "$pts bodov";
}

// ── game_start + untipped_game ────────────────────────────────────────────────
$users = $pdo->query("
    SELECT u.id, u.email, u.username,
           ns_start.enabled AS gs_enabled, ns_start.email_enabled AS gs_email,
           ns_start.push_enabled AS gs_push, ns_start.minutes_before AS gs_min,
           ns_ut.enabled AS ut_enabled, ns_ut.email_enabled AS ut_email,
           ns_ut.push_enabled AS ut_push, ns_ut.minutes_before AS ut_min,
           ns_pgr.enabled AS pgr_enabled, ns_pgr.push_enabled AS pgr_push, ns_pgr.minutes_before AS pgr_min,
           (SELECT COUNT(*) FROM admin.user_push_subscriptions WHERE user_id = u.id) AS push_count
    FROM admin.users u
    LEFT JOIN admin.notification_settings ns_start ON ns_start.user_id = u.id AND ns_start.notif_type = 'game_start'
    LEFT JOIN admin.notification_settings ns_ut    ON ns_ut.user_id = u.id AND ns_ut.notif_type = 'untipped_game'
    LEFT JOIN admin.notification_settings ns_pgr   ON ns_pgr.user_id = u.id AND ns_pgr.notif_type = 'pre_game_reminder'
    WHERE u.is_active = TRUE
      AND ((u.email IS NOT NULL AND u.email <> '')
           OR EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id))
")->fetchAll();

foreach ($users as $u) {
    $uid       = (int)$u['id'];
    $has_email = !empty($u['email']);
    $has_push  = $vapid && (int)$u['push_count'] > 0;

    if ($u['gs_enabled']) {
        $min = (int)($u['gs_min'] ?? 30);
        if ($has_email && $u['gs_email']) fifa_send_game_mail($pdo, $uid, $u['email'], $u['username'], $min, 'game_start', false);
        if ($has_push  && $u['gs_push'])  fifa_send_game_push($pdo, $uid, $min, 'game_start', false, $vapid);
    }
    if ($u['ut_enabled']) {
        $min = (int)($u['ut_min'] ?? 30);
        if ($has_email && $u['ut_email']) fifa_send_game_mail($pdo, $uid, $u['email'], $u['username'], $min, 'untipped_game', true);
        if ($has_push  && $u['ut_push'])  fifa_send_game_push($pdo, $uid, $min, 'untipped_game', true, $vapid);
    }
    if ($u['pgr_enabled']) {
        $min = (int)($u['pgr_min'] ?? 30);
        if ($has_push && $u['pgr_push']) fifa_send_pre_game_reminder_push($pdo, $uid, $min, $vapid);
    }
}

// ── result_entered ────────────────────────────────────────────────────────────
$finished = $pdo->query("
    SELECT g.game_id,
           ht.team_code AS team1, at.team_code AS team2,
           g.home_score_regular AS s1, g.away_score_regular AS s2,
           g.home_score_final AS f1, g.away_score_final AS f2
    FROM fifa2026.games g
    JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
    JOIN fifa2026.teams at ON at.team_id = g.away_team_id
    WHERE g.result_approved = TRUE AND g.home_score_regular IS NOT NULL
      AND g.updated_at >= NOW() - INTERVAL '12 minutes'
")->fetchAll();

foreach ($finished as $g) {
    $gid   = (int)$g['game_id'];
    $score = fifa_score_str($g);

    // Email
    $rec = $pdo->prepare("
        SELECT u.id, u.email, u.username, t.home_score_tip, t.away_score_tip, t.points_earned
        FROM admin.users u
        JOIN admin.notification_settings ns ON ns.user_id = u.id
        LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.game_id = ?
        WHERE ns.notif_type = 'result_entered' AND ns.enabled = TRUE AND ns.email_enabled = TRUE
          AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''
          AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                          WHERE nl.user_id = u.id AND nl.notif_type = 'fifa_result_entered' AND nl.game_id = ?)
    ");
    $rec->execute([$gid, $gid]);
    foreach ($rec->fetchAll() as $u) {
        $subject  = "Výsledok: {$g['team1']} – {$g['team2']}";
        $tip_line = $u['home_score_tip'] !== null
            ? "Tvoj tip: {$u['home_score_tip']}:{$u['away_score_tip']} → " . fifa_pts_label((int)($u['points_earned'] ?? 0))
            : "Na tento zápas si nemal tip.";
        $body = "Ahoj {$u['username']},\n\nZápas #{$gid} ({$g['team1']} – {$g['team2']}) sa skončil.\n\nVýsledok: $score\n$tip_line\n\nBetClub · FIFA World Cup 2026";
        try { send_mail($u['email'], $subject, $body); fifa_log_notif($pdo, (int)$u['id'], 'fifa_result_entered', $gid); }
        catch (Throwable $e) { error_log("fifa notif result email uid={$u['id']}: " . $e->getMessage()); }
    }

    // Push
    if ($vapid) {
        $pr = $pdo->prepare("
            SELECT u.id, t.home_score_tip, t.away_score_tip, t.points_earned
            FROM admin.users u
            JOIN admin.notification_settings ns ON ns.user_id = u.id
            LEFT JOIN fifa2026.tips t ON t.user_id = u.id AND t.game_id = ?
            WHERE ns.notif_type = 'result_entered' AND ns.enabled = TRUE AND ns.push_enabled = TRUE
              AND u.is_active = TRUE
              AND EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id)
              AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                              WHERE nl.user_id = u.id AND nl.notif_type = 'fifa_result_entered_push' AND nl.game_id = ?)
        ");
        $pr->execute([$gid, $gid]);
        foreach ($pr->fetchAll() as $u) {
            $pbody = $u['home_score_tip'] !== null
                ? "$score · tip {$u['home_score_tip']}:{$u['away_score_tip']} → " . fifa_pts_label((int)($u['points_earned'] ?? 0))
                : $score;
            $payload = json_encode(['title' => "Výsledok: {$g['team1']} – {$g['team2']}", 'body' => $pbody, 'url' => '/games']);
            $r = send_push_to_user($pdo, (int)$u['id'], $payload, $vapid);
            if ($r['sent'] > 0) fifa_log_notif($pdo, (int)$u['id'], 'fifa_result_entered_push', $gid);
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fifa_upcoming_games(PDO $pdo, int $uid, int $min, string $logType): array {
    $stmt = $pdo->prepare("
        SELECT g.game_id, ht.team_code AS team1, at.team_code AS team2, g.start_time
        FROM fifa2026.games g
        JOIN fifa2026.teams ht ON ht.team_id = g.home_team_id
        JOIN fifa2026.teams at ON at.team_id = g.away_team_id
        WHERE g.result_approved = FALSE
          AND (g.start_time AT TIME ZONE 'UTC') BETWEEN NOW() + (:min - 3) * INTERVAL '1 minute'
                                                    AND NOW() + (:min + 3) * INTERVAL '1 minute'
          AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                          WHERE nl.user_id = :uid AND nl.notif_type = :type AND nl.game_id = g.game_id)
    ");
    $stmt->execute([':min' => $min, ':uid' => $uid, ':type' => $logType]);
    return $stmt->fetchAll();
}

function fifa_is_untipped(PDO $pdo, int $uid, int $gid): bool {
    $t = $pdo->prepare("SELECT 1 FROM fifa2026.tips WHERE user_id=? AND game_id=?");
    $t->execute([$uid, $gid]);
    return !$t->fetch();
}

function fifa_send_game_mail(PDO $pdo, int $uid, string $email, string $username, int $min, string $type, bool $checkUntipped): void {
    $logType = 'fifa_' . $type;
    foreach (fifa_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        if ($checkUntipped && !fifa_is_untipped($pdo, $uid, (int)$g['game_id'])) continue;
        $time = (new DateTime($g['start_time'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $subject = $type === 'game_start'
            ? "Začína zápas: {$g['team1']} – {$g['team2']} o $time"
            : "Netipovaný zápas: {$g['team1']} – {$g['team2']} o $time";
        $body = $type === 'game_start'
            ? "Ahoj $username,\n\nO {$min} minút začína zápas #{$g['game_id']}: {$g['team1']} – {$g['team2']} ($time).\n\nBetClub · FIFA World Cup 2026"
            : "Ahoj $username,\n\nEšte nemáš tip na zápas #{$g['game_id']}: {$g['team1']} – {$g['team2']} ($time).\nTipovanie sa uzatvára o $time.\n\nBetClub · FIFA World Cup 2026";
        try { send_mail($email, $subject, $body); fifa_log_notif($pdo, $uid, $logType, (int)$g['game_id']); }
        catch (Throwable $e) { error_log("fifa notif $type email uid=$uid: " . $e->getMessage()); }
    }
}

function fifa_send_game_push(PDO $pdo, int $uid, int $min, string $type, bool $checkUntipped, array $vapid): void {
    $logType = 'fifa_' . $type . '_push';
    foreach (fifa_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        if ($checkUntipped && !fifa_is_untipped($pdo, $uid, (int)$g['game_id'])) continue;
        $time  = (new DateTime($g['start_time'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title = $type === 'game_start' ? "{$g['team1']} – {$g['team2']} o $time" : "Nezadaný tip: {$g['team1']} – {$g['team2']}";
        $body  = $type === 'game_start' ? "Začína za $min minút" : "Tipovanie sa uzatvára o $time";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/games']);
        $r = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($r['sent'] > 0) fifa_log_notif($pdo, $uid, $logType, (int)$g['game_id']);
    }
}

function fifa_send_pre_game_reminder_push(PDO $pdo, int $uid, int $min, array $vapid): void {
    $logType = 'fifa_pre_game_reminder_push';
    foreach (fifa_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        $has_tip = !fifa_is_untipped($pdo, $uid, (int)$g['game_id']);
        $time    = (new DateTime($g['start_time'], new DateTimeZone('UTC')))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title   = $has_tip
            ? "{$g['team1']} – {$g['team2']} o $time"
            : "Nezatipovaný zápas! {$g['team1']} – {$g['team2']}";
        $body    = $has_tip
            ? "Začína za $min minút, ešte môžeš zmeniť tip"
            : "Tipovanie sa uzatvára o $time — {$min} minút!";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/games']);
        $r = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($r['sent'] > 0) fifa_log_notif($pdo, $uid, $logType, (int)$g['game_id']);
    }
}

function fifa_score_str(array $g): string {
    $s = "{$g['s1']}:{$g['s2']}";
    if ($g['f1'] !== null) $s .= " ({$g['f1']}:{$g['f2']} po predĺžení/penaltách)";
    return $s;
}
