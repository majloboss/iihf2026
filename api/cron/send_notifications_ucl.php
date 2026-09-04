<?php
// UCL notifikácie — analógia k send_notifications_fifa.php.
//
// Zdieľané nastavenia (notification_settings: game_start/untipped_game/
// pre_game_reminder/result_entered), oddelený dedup cez 'ucl_'-prefixed
// notif_type v notification_log.
//
// Oproti FIFA sú tri rozdiely:
//   - súperi sú kluby z admin.uefa_clubs, nie reprezentácie z vlastnej tabuľky
//   - v play-off sa hrá na dva zápasy, preto sa v texte uvádza fáza a poradie
//   - schéma má pomlčku v názve, takže sa musí písať v úvodzovkách
//
// start_time je naive UTC → porovnávaj cez (start_time AT TIME ZONE 'UTC').
// Spúšťa sa z run.php po FIFA crone.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/webpush.php';

$pdo   = db();
$vapid = wp_load_vapid();

// Na deve sa testuje, takze spravy odtial musia byt na prvy pohlad odlisitelne.
$UCL_TEST_ENV = defined('DB_NAME') && stripos(DB_NAME, 'DEV') !== false ? ' [TEST]' : '';

// Id sutaze sa medzi prostrediami lisi (dev 3, produkcia 5), preto sa cita
// z databazy podla slugu — natvrdo zapisane cislo by zaznamy priradilo inej
// sutazi.
$UCL_COMPETITION_ID = (int)$pdo->query(
    "SELECT id FROM admin.competitions WHERE slug = 'ucl2026'")->fetchColumn();

function ucl_log_notif(PDO $pdo, int $uid, string $type, ?int $game_id): void {
    global $UCL_COMPETITION_ID;
    $pdo->prepare('INSERT INTO admin.notification_log (user_id, notif_type, game_id, competition_id)
                   VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING')
        ->execute([$uid, $type, $game_id, $UCL_COMPETITION_ID]);
}

function ucl_pts_label(int $pts): string {
    if ($pts === 1) return '1 bod';
    if ($pts >= 2 && $pts <= 4) return "$pts body";
    return "$pts bodov";
}

// Krátke označenie fázy, rovnaké ako v aplikácii.
//
// Berie sa z číselníka. Predtým sa číslo kola vyťahovalo z názvu regulárnym
// výrazom a ostatné fázy mala funkcia vymenované — pri zmene názvu alebo
// pridaní kola sa to muselo dopisovať.
function ucl_faza(array $g): string {
    return (string)($g['match_stat_desc'] ?? $g['game_type_code'] ?? '');
}

// ── game_start + untipped_game + pre_game_reminder ───────────────────────────
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
        if ($has_email && $u['gs_email']) ucl_send_game_mail($pdo, $uid, $u['email'], $u['username'], $min, 'game_start', false);
        if ($has_push  && $u['gs_push'])  ucl_send_game_push($pdo, $uid, $min, 'game_start', false, $vapid);
    }
    if ($u['ut_enabled']) {
        $min = (int)($u['ut_min'] ?? 30);
        if ($has_email && $u['ut_email']) ucl_send_game_mail($pdo, $uid, $u['email'], $u['username'], $min, 'untipped_game', true);
        if ($has_push  && $u['ut_push'])  ucl_send_game_push($pdo, $uid, $min, 'untipped_game', true, $vapid);
    }
    if ($u['pgr_enabled']) {
        $min = (int)($u['pgr_min'] ?? 30);
        if ($has_push && $u['pgr_push']) ucl_send_pre_game_reminder_push($pdo, $uid, $min, $vapid);
    }
}

// ── result_entered ────────────────────────────────────────────────────────────
$finished = $pdo->query('
    SELECT g.game_id, g.game_type_code, g.game_type_name, g.tie_id, g.leg,
           ph.match_stat_desc,
           hc.club_name AS team1, ac.club_name AS team2,
           g.home_score_regular AS s1, g.away_score_regular AS s2,
           g.home_score_final AS f1, g.away_score_final AS f2
      FROM "lm2026-27".games g
      LEFT JOIN admin.competition_phases ph ON ph.id = g.phase_id
      JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
      JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
     WHERE g.result_approved = TRUE AND g.home_score_regular IS NOT NULL
       AND g.updated_at >= NOW() - INTERVAL \'12 minutes\'
')->fetchAll();

foreach ($finished as $g) {
    $gid   = (int)$g['game_id'];
    $score = ucl_score_str($g);
    $faza  = ucl_faza($g);

    // Email
    $rec = $pdo->prepare('
        SELECT u.id, u.email, u.username, t.home_score_tip, t.away_score_tip, t.points_earned
          FROM admin.users u
          JOIN admin.notification_settings ns ON ns.user_id = u.id
          LEFT JOIN "lm2026-27".tips t ON t.user_id = u.id AND t.game_id = ?
         WHERE ns.notif_type = \'result_entered\' AND ns.enabled = TRUE AND ns.email_enabled = TRUE
           AND u.is_active = TRUE AND u.email IS NOT NULL AND u.email <> \'\'
           AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                           WHERE nl.user_id = u.id AND nl.notif_type = \'ucl_result_entered\' AND nl.game_id = ?)
    ');
    $rec->execute([$gid, $gid]);
    foreach ($rec->fetchAll() as $u) {
        $subject  = "Výsledok: {$g['team1']} – {$g['team2']}" . $GLOBALS['UCL_TEST_ENV'];
        $tip_line = $u['home_score_tip'] !== null
            ? "Tvoj tip: {$u['home_score_tip']}:{$u['away_score_tip']} → " . ucl_pts_label((int)($u['points_earned'] ?? 0))
            : 'Na tento zápas si nemal tip.';
        $body = "Ahoj {$u['username']},\n\nZápas ($faza): {$g['team1']} – {$g['team2']} sa skončil.\n\n"
              . "Výsledok: $score\n$tip_line\n\nBetClub · UEFA Champions League 2026/27";
        try { send_mail($u['email'], $subject, $body); ucl_log_notif($pdo, (int)$u['id'], 'ucl_result_entered', $gid); }
        catch (Throwable $e) { error_log("ucl notif result email uid={$u['id']}: " . $e->getMessage()); }
    }

    // Push
    if ($vapid) {
        $pr = $pdo->prepare('
            SELECT u.id, t.home_score_tip, t.away_score_tip, t.points_earned
              FROM admin.users u
              JOIN admin.notification_settings ns ON ns.user_id = u.id
              LEFT JOIN "lm2026-27".tips t ON t.user_id = u.id AND t.game_id = ?
             WHERE ns.notif_type = \'result_entered\' AND ns.enabled = TRUE AND ns.push_enabled = TRUE
               AND u.is_active = TRUE
               AND EXISTS (SELECT 1 FROM admin.user_push_subscriptions WHERE user_id = u.id)
               AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                               WHERE nl.user_id = u.id AND nl.notif_type = \'ucl_result_entered_push\' AND nl.game_id = ?)
        ');
        $pr->execute([$gid, $gid]);
        foreach ($pr->fetchAll() as $u) {
            $pbody = $u['home_score_tip'] !== null
                ? "$score · tip {$u['home_score_tip']}:{$u['away_score_tip']} → " . ucl_pts_label((int)($u['points_earned'] ?? 0))
                : $score;
            $payload = json_encode(['title' => "Výsledok: {$g['team1']} – {$g['team2']}", 'body' => $pbody, 'url' => '/games']);
            $r = send_push_to_user($pdo, (int)$u['id'], $payload, $vapid);
            if ($r['sent'] > 0) ucl_log_notif($pdo, (int)$u['id'], 'ucl_result_entered_push', $gid);
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Zápasy v okne okolo `$min` minút pred výkopom, ktoré používateľ ešte nedostal. */
function ucl_upcoming_games(PDO $pdo, int $uid, int $min, string $logType): array {
    // Bez klubov (nezostavená dvojica play-off) nemá notifikácia zmysel.
    $stmt = $pdo->prepare('
        SELECT g.game_id, g.game_type_code, g.game_type_name, g.start_time,
               ph.match_stat_desc,
               hc.club_name AS team1, ac.club_name AS team2
          FROM "lm2026-27".games g
          LEFT JOIN admin.competition_phases ph ON ph.id = g.phase_id
      LEFT JOIN admin.competition_phases ph ON ph.id = g.phase_id
          JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE g.result_approved = FALSE
           AND (g.start_time AT TIME ZONE \'UTC\') BETWEEN NOW() + (:min - 3) * INTERVAL \'1 minute\'
                                                      AND NOW() + (:min + 3) * INTERVAL \'1 minute\'
           AND NOT EXISTS (SELECT 1 FROM admin.notification_log nl
                           WHERE nl.user_id = :uid AND nl.notif_type = :type AND nl.game_id = g.game_id)
    ');
    $stmt->execute([':min' => $min, ':uid' => $uid, ':type' => $logType]);
    return $stmt->fetchAll();
}

function ucl_is_untipped(PDO $pdo, int $uid, int $gid): bool {
    $t = $pdo->prepare('SELECT 1 FROM "lm2026-27".tips WHERE user_id = ? AND game_id = ?');
    $t->execute([$uid, $gid]);
    return !$t->fetch();
}

function ucl_send_game_mail(PDO $pdo, int $uid, string $email, string $username, int $min, string $type, bool $checkUntipped): void {
    $logType = 'ucl_' . $type;
    foreach (ucl_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        if ($checkUntipped && !ucl_is_untipped($pdo, $uid, (int)$g['game_id'])) continue;
        $time = (new DateTime($g['start_time'], new DateTimeZone('UTC')))
                    ->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $faza = ucl_faza($g);
        $znacka  = $GLOBALS['UCL_TEST_ENV'];
        $subject = ($type === 'game_start'
            ? "Začína zápas: {$g['team1']} – {$g['team2']} o $time"
            : "Netipovaný zápas: {$g['team1']} – {$g['team2']} o $time") . $znacka;
        $body = $type === 'game_start'
            ? "Ahoj $username,\n\nO {$min} minút začína zápas ($faza): {$g['team1']} – {$g['team2']} ($time).\n\nBetClub · UEFA Champions League 2026/27"
            : "Ahoj $username,\n\nEšte nemáš tip na zápas ($faza): {$g['team1']} – {$g['team2']} ($time).\nTipovanie sa uzatvára o $time.\n\nBetClub · UEFA Champions League 2026/27";
        try { send_mail($email, $subject, $body); ucl_log_notif($pdo, $uid, $logType, (int)$g['game_id']); }
        catch (Throwable $e) { error_log("ucl notif $type email uid=$uid: " . $e->getMessage()); }
    }
}

function ucl_send_game_push(PDO $pdo, int $uid, int $min, string $type, bool $checkUntipped, array $vapid): void {
    $logType = 'ucl_' . $type . '_push';
    foreach (ucl_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        if ($checkUntipped && !ucl_is_untipped($pdo, $uid, (int)$g['game_id'])) continue;
        $time  = (new DateTime($g['start_time'], new DateTimeZone('UTC')))
                     ->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title = $type === 'game_start' ? "{$g['team1']} – {$g['team2']} o $time" : "Nezadaný tip: {$g['team1']} – {$g['team2']}";
        $body  = $type === 'game_start' ? "Začína za $min minút" : "Tipovanie sa uzatvára o $time";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/games']);
        $r = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($r['sent'] > 0) ucl_log_notif($pdo, $uid, $logType, (int)$g['game_id']);
    }
}

function ucl_send_pre_game_reminder_push(PDO $pdo, int $uid, int $min, array $vapid): void {
    $logType = 'ucl_pre_game_reminder_push';
    foreach (ucl_upcoming_games($pdo, $uid, $min, $logType) as $g) {
        $has_tip = !ucl_is_untipped($pdo, $uid, (int)$g['game_id']);
        $time    = (new DateTime($g['start_time'], new DateTimeZone('UTC')))
                       ->setTimezone(new DateTimeZone('Europe/Bratislava'))->format('H:i');
        $title   = $has_tip
            ? "{$g['team1']} – {$g['team2']} o $time"
            : "Nezatipovaný zápas! {$g['team1']} – {$g['team2']}";
        $body    = $has_tip
            ? "Začína za $min minút, ešte môžeš zmeniť tip"
            : "Tipovanie sa uzatvára o $time — {$min} minút!";
        $payload = json_encode(['title' => $title, 'body' => $body, 'url' => '/games']);
        $r = send_push_to_user($pdo, $uid, $payload, $vapid);
        if ($r['sent'] > 0) ucl_log_notif($pdo, $uid, $logType, (int)$g['game_id']);
    }
}

/** Skóre po 90 minútach, pri predĺžení aj konečný stav. */
function ucl_score_str(array $g): string {
    $s = "{$g['s1']}:{$g['s2']}";
    if ($g['f1'] !== null) $s .= " ({$g['f1']}:{$g['f2']} po predĺžení/penaltách)";
    return $s;
}
