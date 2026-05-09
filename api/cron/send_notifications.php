<?php
// Cron: spúšťaj každých 5 minút
// napr.: */5 * * * * php /home/.../api/cron/send_notifications.php >> /tmp/notif.log 2>&1

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';

$pdo = db();

// ── game_start + untipped_game ────────────────────────────────────────────────
// Nájdi hry kde starts_at je za [minutes_before - 3 .. minutes_before + 3] minút
// (±3 min buffer pre 5-min cron)

$users = $pdo->query("
    SELECT u.id, u.email, u.username,
           ns_start.enabled        AS gs_enabled,
           ns_start.email_enabled  AS gs_email,
           ns_start.minutes_before AS gs_min,
           ns_ut.enabled           AS ut_enabled,
           ns_ut.email_enabled     AS ut_email,
           ns_ut.minutes_before    AS ut_min
    FROM admin.users u
    LEFT JOIN admin.notification_settings ns_start
        ON ns_start.user_id = u.id AND ns_start.notif_type = 'game_start'
    LEFT JOIN admin.notification_settings ns_ut
        ON ns_ut.user_id = u.id AND ns_ut.notif_type = 'untipped_game'
    WHERE u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''
")->fetchAll();

foreach ($users as $u) {
    $uid = (int)$u['id'];

    // game_start
    if ($u['gs_enabled'] && $u['gs_email']) {
        $min = (int)($u['gs_min'] ?? 30);
        send_game_notifications($pdo, $uid, $u['email'], $u['username'], $min, 'game_start', false);
    }

    // untipped_game
    if ($u['ut_enabled'] && $u['ut_email']) {
        $min = (int)($u['ut_min'] ?? 30);
        send_game_notifications($pdo, $uid, $u['email'], $u['username'], $min, 'untipped_game', true);
    }
}

// ── result_entered ────────────────────────────────────────────────────────────
// Hry ktoré skončili za posledných 10 minút a notifikácia ešte nebola poslaná

$finished = $pdo->query("
    SELECT g.id, g.game_number, g.phase, g.team1, g.team2, g.score1, g.score2, g.final1, g.final2
    FROM iihf2026.games g
    WHERE g.status = 'finished'
      AND g.score1 IS NOT NULL
      AND g.updated_at >= NOW() - INTERVAL '10 minutes'
")->fetchAll();

foreach ($finished as $g) {
    $recips = $pdo->prepare("
        SELECT u.id, u.email, u.username
        FROM admin.users u
        JOIN admin.notification_settings ns ON ns.user_id = u.id
        WHERE ns.notif_type = 'result_entered'
          AND ns.enabled = TRUE AND ns.email_enabled = TRUE
          AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> ''
          AND NOT EXISTS (
              SELECT 1 FROM admin.notification_log nl
              WHERE nl.user_id = u.id AND nl.notif_type = 'result_entered' AND nl.game_id = ?
          )
    ");
    $recips->execute([$g['id']]);

    $score = score_str($g);
    foreach ($recips->fetchAll() as $u) {
        $subject = "Výsledok: {$g['team1']} – {$g['team2']}";
        $body    = "Ahoj {$u['username']},\n\nZápas č. {$g['game_number']} ({$g['team1']} – {$g['team2']}) sa skončil.\n\nVýsledok: $score\n\nIIHF 2026 Tipovačka";
        try {
            send_mail($u['email'], $subject, $body);
            log_notif($pdo, $u['id'], 'result_entered', $g['id']);
        } catch (Throwable $e) { error_log("notif result_entered uid={$u['id']}: " . $e->getMessage()); }
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
    $games = $stmt->fetchAll();

    foreach ($games as $g) {
        if ($check_untipped) {
            $tipped = $pdo->prepare("SELECT 1 FROM iihf2026.tips WHERE user_id=? AND game_id=?");
            $tipped->execute([$uid, $g['id']]);
            if ($tipped->fetch()) continue; // už tipoval
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
        } catch (Throwable $e) { error_log("notif $type uid=$uid: " . $e->getMessage()); }
    }
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
