<?php
// Cron: spúšťaj každých 5 minút
// napr.: */5 * * * * php /home/.../api/cron/send_notifications.php >> /tmp/notif.log 2>&1

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/webpush.php';

$pdo   = db();
$vapid = wp_load_vapid(); // null ak VAPID nie je nakonfigurované

// ── game_start + untipped_game ────────────────────────────────────────────────

$users = $pdo->query("
    SELECT u.id, u.email, u.username,
           ns_start.enabled        AS gs_enabled,
           ns_start.email_enabled  AS gs_email,
           ns_start.push_enabled   AS gs_push,
           ns_start.minutes_before AS gs_min,
           ns_ut.enabled           AS ut_enabled,
           ns_ut.email_enabled     AS ut_email,
           ns_ut.push_enabled      AS ut_push,
           ns_ut.minutes_before    AS ut_min,
           ns_pgr.enabled          AS pgr_enabled,
           ns_pgr.push_enabled     AS pgr_push,
           ns_pgr.minutes_before   AS pgr_min,
           (SELECT COUNT(*) FROM admin.user_push_subscriptions WHERE user_id = u.id) AS push_count
    FROM admin.users u
    LEFT JOIN admin.notification_settings ns_start
        ON ns_start.user_id = u.id AND ns_start.notif_type = 'game_start'
    LEFT JOIN admin.notification_settings ns_ut
        ON ns_ut.user_id = u.id AND ns_ut.notif_type = 'untipped_game'
    LEFT JOIN admin.notification_settings ns_pgr
        ON ns_pgr.user_id = u.id AND ns_pgr.notif_type = 'pre_game_reminder'
    WHERE u.is_active = TRUE
      AND (
          (u.email IS NOT NULL AND u.email <> '')
          OR EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id)
      )
")->fetchAll();

foreach ($users as $u) {
    $uid       = (int)$u['id'];
    $has_email = !empty($u['email']);
    $has_push  = $vapid && (int)$u['push_count'] > 0;

    // game_start
    if ($u['gs_enabled']) {
        $min = (int)($u['gs_min'] ?? 30);
        if ($has_email && $u['gs_email']) {
            send_game_notifications($pdo, $uid, $u['email'], $u['username'], $min, 'game_start', false);
        }
        if ($has_push && $u['gs_push']) {
            send_game_push($pdo, $uid, $u['username'], $min, 'game_start', false, $vapid);
        }
    }

    // untipped_game
    if ($u['ut_enabled']) {
        $min = (int)($u['ut_min'] ?? 30);
        if ($has_email && $u['ut_email']) {
            send_game_notifications($pdo, $uid, $u['email'], $u['username'], $min, 'untipped_game', true);
        }
        if ($has_push && $u['ut_push']) {
            send_game_push($pdo, $uid, $u['username'], $min, 'untipped_game', true, $vapid);
        }
    }

    // pre_game_reminder — 30 min pred zápasom, rozlíši či má tip alebo nie
    if ($u['pgr_enabled']) {
        $min = (int)($u['pgr_min'] ?? 30);
        if ($has_push && $u['pgr_push']) {
            send_pre_game_reminder_push($pdo, $uid, $min, $vapid);
        }
    }
}

// ── result_entered ────────────────────────────────────────────────────────────

$finished = $pdo->query("
    SELECT g.id, g.game_number, g.phase, g.team1, g.team2, g.score1, g.score2, g.final1, g.final2
    FROM iihf2026.games g
    WHERE g.status = 'finished'
      AND g.score1 IS NOT NULL
      AND g.updated_at >= NOW() - INTERVAL '10 minutes'
")->fetchAll();

foreach ($finished as $g) {
    $score = score_str($g);

    // Email príjemcovia
    $email_recips = $pdo->prepare("
        SELECT u.id, u.email, u.username,
               t.home_score_tip, t.away_score_tip, t.points_earned
        FROM admin.users u
        JOIN admin.notification_settings ns ON ns.user_id = u.id
        LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.game_id = ?
        WHERE ns.notif_type = 'result_entered'
          AND ns.enabled = TRUE AND ns.email_enabled = TRUE
          AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''
          AND NOT EXISTS (
              SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = u.id AND nl.notif_type = 'result_entered' AND nl.game_id = ?
          )
    ");
    $email_recips->execute([$g['id'], $g['id']]);
    foreach ($email_recips->fetchAll() as $u) {
        $subject  = "Výsledok: {$g['team1']} – {$g['team2']}";
        $tip_line = $u['home_score_tip'] !== null
            ? "Tvoj tip: {$u['home_score_tip']}:{$u['away_score_tip']} → " . pts_label((int)($u['points_earned'] ?? 0))
            : "Na tento zápas si nemal tip.";
        $body = "Ahoj {$u['username']},\n\nZápas č. {$g['game_number']} ({$g['team1']} – {$g['team2']}) sa skončil.\n\nVýsledok: $score\n$tip_line\n\nIIHF 2026 Tipovačka";
        try {
            send_mail($u['email'], $subject, $body);
            log_notif($pdo, $u['id'], 'result_entered', $g['id']);
        } catch (Throwable $e) { error_log("notif result_entered email uid={$u['id']}: " . $e->getMessage()); }
    }

    // Push príjemcovia
    if ($vapid) {
        $push_recips = $pdo->prepare("
            SELECT u.id, u.username,
                   t.home_score_tip, t.away_score_tip, t.points_earned
            FROM admin.users u
            JOIN admin.notification_settings ns ON ns.user_id = u.id
            LEFT JOIN iihf2026.tips t ON t.user_id = u.id AND t.game_id = ?
            WHERE ns.notif_type = 'result_entered'
              AND ns.enabled = TRUE AND ns.push_enabled = TRUE
              AND u.is_active = TRUE
              AND EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id)
              AND NOT EXISTS (
                  SELECT 1 FROM admin.notification_log nl
                  WHERE nl.user_id = u.id AND nl.notif_type = 'result_entered_push' AND nl.game_id = ?
              )
        ");
        $push_recips->execute([$g['id'], $g['id']]);
        foreach ($push_recips->fetchAll() as $u) {
            $push_body = $u['home_score_tip'] !== null
                ? "$score · tip {$u['home_score_tip']}:{$u['away_score_tip']} → " . pts_label((int)($u['points_earned'] ?? 0))
                : $score;
            $payload = json_encode([
                'title' => "Výsledok: {$g['team1']} – {$g['team2']}",
                'body'  => $push_body,
                'url'   => '/zapasy',
            ]);
            $result = send_push_to_user($pdo, $u['id'], $payload, $vapid);
            if ($result['sent'] > 0) {
                log_notif($pdo, $u['id'], 'result_entered_push', $g['id']);
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function send_game_notifications(PDO $pdo, int $uid, string $email, string $username, int $min, string $type, bool $check_untipped): void {
    $stmt = $pdo->prepare("
        SELECT g.id, g.game_number, g.phase, g.team1, g.team2, g.starts_at
        FROM iihf2026.games g
        WHERE g.status = 'scheduled'
          AND g.team1 IS NOT NULL AND g.team2 IS NOT NULL
          AND g.starts_at BETWEEN NOW() + (:min - 3) * INTERVAL '1 minute'
                               AND NOW() + (:min + 3) * INTERVAL '1 minute'
          AND NOT EXISTS (
              SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = :uid AND nl.notif_type = :type AND nl.game_id = g.id
          )
    ");
    $stmt->execute([':min' => $min, ':uid' => $uid, ':type' => $type]);

    foreach ($stmt->fetchAll() as $g) {
        if ($check_untipped) {
            $tipped = $pdo->prepare("SELECT 1 FROM iihf2026.tips WHERE user_id=? AND game_id=?");
            $tipped->execute([$uid, $g['id']]);
            if ($tipped->fetch()) continue;
        }
        $time    = (new DateTime($g['starts_at']))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $subject = $type === 'game_start'
            ? "Začína zápas: {$g['team1']} – {$g['team2']} o $time"
            : "Netipovaný zápas: {$g['team1']} – {$g['team2']} o $time";
        $body    = $type === 'game_start'
            ? "Ahoj $username,\n\nO {$min} minút začína zápas č. {$g['game_number']}: {$g['team1']} – {$g['team2']} ($time).\n\nIIHF 2026 Tipovačka"
            : "Ahoj $username,\n\nEšte nemáš tip na zápas č. {$g['game_number']}: {$g['team1']} – {$g['team2']} ($time).\nTipovanie sa uzatvára o $time.\n\nIIHF 2026 Tipovačka";
        try {
            send_mail($email, $subject, $body);
            log_notif($pdo, $uid, $type, $g['id']);
        } catch (Throwable $e) { error_log("notif $type email uid=$uid: " . $e->getMessage()); }
    }
}

function send_game_push(PDO $pdo, int $uid, string $username, int $min, string $type, bool $check_untipped, array $vapid): void {
    $push_type = $type . '_push';
    $stmt = $pdo->prepare("
        SELECT g.id, g.game_number, g.team1, g.team2, g.starts_at
        FROM iihf2026.games g
        WHERE g.status = 'scheduled'
          AND g.team1 IS NOT NULL AND g.team2 IS NOT NULL
          AND g.starts_at BETWEEN NOW() + (:min - 3) * INTERVAL '1 minute'
                               AND NOW() + (:min + 3) * INTERVAL '1 minute'
          AND NOT EXISTS (
              SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = :uid AND nl.notif_type = :type AND nl.game_id = g.id
          )
    ");
    $stmt->execute([':min' => $min, ':uid' => $uid, ':type' => $push_type]);

    foreach ($stmt->fetchAll() as $g) {
        if ($check_untipped) {
            $tipped = $pdo->prepare("SELECT 1 FROM iihf2026.tips WHERE user_id=? AND game_id=?");
            $tipped->execute([$uid, $g['id']]);
            if ($tipped->fetch()) continue;
        }
        $time    = (new DateTime($g['starts_at']))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title   = $type === 'game_start'
            ? "{$g['team1']} – {$g['team2']} o $time"
            : "Nezadaný tip: {$g['team1']} – {$g['team2']}";
        $body    = $type === 'game_start'
            ? "Začína za $min minút"
            : "Tipovanie sa uzatvára o $time";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/zapasy']);
        $result  = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($result['sent'] > 0) {
            log_notif($pdo, $uid, $push_type, $g['id']);
        }
    }
}

function send_pre_game_reminder_push(PDO $pdo, int $uid, int $min, array $vapid): void {
    $type = 'pre_game_reminder_push';
    $stmt = $pdo->prepare("
        SELECT g.id, g.game_number, g.team1, g.team2, g.starts_at
        FROM iihf2026.games g
        WHERE g.status = 'scheduled'
          AND g.team1 IS NOT NULL AND g.team2 IS NOT NULL
          AND g.starts_at BETWEEN NOW() + (:min - 3) * INTERVAL '1 minute'
                               AND NOW() + (:min + 3) * INTERVAL '1 minute'
          AND NOT EXISTS (
              SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = :uid AND nl.notif_type = :type AND nl.game_id = g.id
          )
    ");
    $stmt->execute([':min' => $min, ':uid' => $uid, ':type' => $type]);

    foreach ($stmt->fetchAll() as $g) {
        $tipped = $pdo->prepare("SELECT 1 FROM iihf2026.tips WHERE user_id=? AND game_id=?");
        $tipped->execute([$uid, $g['id']]);
        $has_tip = (bool)$tipped->fetch();
        $time    = (new DateTime($g['starts_at']))->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title   = $has_tip
            ? "{$g['team1']} – {$g['team2']} o $time"
            : "Nezatipovaný zápas! {$g['team1']} – {$g['team2']}";
        $body    = $has_tip
            ? "Začína za $min minút, ešte môžeš zmeniť tip"
            : "Tipovanie sa uzatvára o $time — {$min} minút!";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/zapasy']);
        $result  = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($result['sent'] > 0) log_notif($pdo, $uid, $type, $g['id']);
    }
}

function pts_label(int $pts): string {
    if ($pts === 1) return '1 bod';
    if ($pts >= 2 && $pts <= 4) return "$pts body";
    return "$pts bodov";
}

function score_str(array $g): string {
    if ($g['final1'] !== null) {
        return "{$g['final1']}:{$g['final2']} po predĺžení (regulárny čas {$g['score1']}:{$g['score2']})";
    }
    return "{$g['score1']}:{$g['score2']}";
}

function log_notif(PDO $pdo, int $uid, string $type, ?int $game_id): void {
    $pdo->prepare("
        INSERT INTO admin.notification_log (user_id, notif_type, game_id)
        VALUES (?, ?, ?)
        ON CONFLICT DO NOTHING
    ")->execute([$uid, $type, $game_id]);
}
