<?php
// GET  /v1/ucl/tips - moje tipy LM
// POST /v1/ucl/tips - zadaj/uprav tip { game_id, home_score_tip, away_score_tip }
$auth = require_auth();
$pdo  = db();

if ($method === 'GET') {
    $stmt = $pdo->prepare('
        SELECT t.id, t.game_id, t.home_score_tip, t.away_score_tip, t.points_earned,
               g.start_time, g.game_type_code, g.game_type_name,
               hc.club_code AS home_code, hc.club_name AS home_name, hc.logo_file AS home_logo,
               ac.club_code AS away_code, ac.club_name AS away_name, ac.logo_file AS away_logo
          FROM "lm2026-27".tips t
          JOIN "lm2026-27".games g ON g.game_id = t.game_id
          LEFT JOIN admin.uefa_clubs hc ON hc.club_id = g.home_team_id
          LEFT JOIN admin.uefa_clubs ac ON ac.club_id = g.away_team_id
         WHERE t.user_id = :uid
         ORDER BY g.start_time, g.game_id');
    $stmt->execute([':uid' => $auth['user_id']]);
    json_ok($stmt->fetchAll());
}

if ($method === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true);
    $game_id = (int)($body['game_id'] ?? 0);
    $home    = $body['home_score_tip'] ?? null;
    $away    = $body['away_score_tip'] ?? null;

    if (!$game_id) json_error('Chýba game_id', 400);
    if (!is_numeric($home) || !is_numeric($away) || $home < 0 || $away < 0) {
        json_error('Tip musí byť nezáporné číslo', 400);
    }
    $home = (int)$home;
    $away = (int)$away;

    $stmt = $pdo->prepare('SELECT game_id, start_time, tips_open, home_team_id, away_team_id
                             FROM "lm2026-27".games WHERE game_id = ?');
    $stmt->execute([$game_id]);
    $game = $stmt->fetch();
    if (!$game) json_error('Zápas neexistuje', 404);
    if (!$game['tips_open']) json_error('Tipovanie pre tento zápas je uzavreté', 409);
    // Zapasy playoff maju timy prazdne, kym nie su znami postupujuci.
    if ($game['home_team_id'] === null || $game['away_team_id'] === null) {
        json_error('Zápas ešte nemá určené tímy, tipovať sa nedá', 409);
    }

    // start_time je ulozeny ako naive UTC — interpretuj ho vyslovne ako UTC
    $deadline = (new DateTime($game['start_time'], new DateTimeZone('UTC')))->modify('-5 minutes');
    if (new DateTime('now', new DateTimeZone('UTC')) > $deadline) {
        $pdo->prepare('UPDATE "lm2026-27".games SET tips_open = FALSE WHERE game_id = ?')
            ->execute([$game_id]);
        json_error('Tipovanie uzavreté (menej ako 5 min do začiatku)', 409);
    }

    $stmt = $pdo->prepare('
        INSERT INTO "lm2026-27".tips (user_id, game_id, home_score_tip, away_score_tip, updated_at)
        VALUES (:uid, :gid, :h, :a, NOW())
        ON CONFLICT (user_id, game_id) DO UPDATE
        SET home_score_tip = EXCLUDED.home_score_tip,
            away_score_tip = EXCLUDED.away_score_tip,
            updated_at     = NOW()
        RETURNING id, home_score_tip, away_score_tip');
    $stmt->execute([':uid' => $auth['user_id'], ':gid' => $game_id, ':h' => $home, ':a' => $away]);
    json_ok($stmt->fetch());
}

json_error('Method not allowed', 405);
