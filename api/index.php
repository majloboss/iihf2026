<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/helpers/response.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/db.php';

$path   = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];

// Odstran prefix ak je na serveri (napr. /api)
$path = preg_replace('#^api/?#', '', $path);

try {
    match (true) {
        $path === 'v1/auth/login'          => require __DIR__ . '/v1/auth/login.php',
        $path === 'v1/admin/users'          => require __DIR__ . '/v1/admin/users.php',
        $path === 'v1/admin/user-update'   => require __DIR__ . '/v1/admin/user_update.php',
        $path === 'v1/admin/user-edit'     => require __DIR__ . '/v1/admin/user_edit.php',
        $path === 'v1/admin/user-password' => require __DIR__ . '/v1/admin/user_password.php',
        $path === 'v1/admin/user-revoke'   => require __DIR__ . '/v1/admin/user_revoke.php',
        $path === 'v1/admin/user-delete'   => require __DIR__ . '/v1/admin/user_delete.php',
        $path === 'v1/admin/invites'       => require __DIR__ . '/v1/admin/invites.php',
        $path === 'v1/admin/invite-use'    => require __DIR__ . '/v1/auth/invite_use.php',
        $path === 'v1/auth/complete'                => require __DIR__ . '/v1/auth/complete.php',
        $path === 'v1/auth/password-reset-request'  => require __DIR__ . '/v1/auth/password_reset_request.php',
        $path === 'v1/auth/password-reset'          => require __DIR__ . '/v1/auth/password_reset.php',
        $path === 'v1/profile'             => require __DIR__ . '/v1/profile.php',
        $path === 'v1/profile-password'    => require __DIR__ . '/v1/profile-password.php',
        $path === 'v1/profile-delete'      => require __DIR__ . '/v1/profile-delete.php',
        $path === 'v1/profile-avatar'      => require __DIR__ . '/v1/profile-avatar.php',
        $path === 'v1/invites'             => require __DIR__ . '/v1/invites.php',
        $path === 'v1/groups'              => require __DIR__ . '/v1/groups.php',
        $path === 'v1/group-invite-bulk'   => require __DIR__ . '/v1/group-invite-bulk.php',
        $path === 'v1/group-join'          => require __DIR__ . '/v1/group-join.php',
        $path === 'v1/group-leave'         => require __DIR__ . '/v1/group-leave.php',
        $path === 'v1/group-members'       => require __DIR__ . '/v1/group-members.php',
        $path === 'v1/users'               => require __DIR__ . '/v1/users.php',
        $path === 'v1/admin/game-update'     => require __DIR__ . '/v1/admin/game_update.php',
        $path === 'v1/admin/game-tips'       => require __DIR__ . '/v1/admin/game_tips.php',
        $path === 'v1/admin/recalc-points'   => require __DIR__ . '/v1/admin/recalc_points.php',
        $path === 'v1/admin/test-setup'      => require __DIR__ . '/v1/admin/test_setup.php',
        $path === 'v1/game-tips'           => require __DIR__ . '/v1/game_tips.php',
        $path === 'v1/competitions'        => require __DIR__ . '/v1/competitions.php',
        $path === 'v1/competitions/active' => require __DIR__ . '/v1/competitions.php',
        $path === 'v1/admin/fifa-game-update' => require __DIR__ . '/v1/admin/fifa_game_update.php',
        $path === 'v1/admin/fifa-game-edit'   => require __DIR__ . '/v1/admin/fifa_game_edit.php',
        $path === 'v1/admin/fifa-game-tips'   => require __DIR__ . '/v1/admin/fifa_game_tips.php',
        $path === 'v1/admin/fifa-game-teams'  => require __DIR__ . '/v1/admin/fifa_game_teams.php',
        $path === 'v1/admin/fifa-recalc'      => require __DIR__ . '/v1/admin/fifa_recalc.php',
        str_starts_with($path, 'v1/admin/fifa-group-standings') => require __DIR__ . '/v1/admin/fifa_group_standings.php',
        $path === 'v1/admin/fifa-test-setup'  => require __DIR__ . '/v1/admin/fifa_test_setup.php',
        $path === 'v1/admin/fifa-game-live'   => require __DIR__ . '/v1/admin/fifa_game_live.php',
        $path === 'v1/admin/ucl-teams'        => require __DIR__ . '/v1/admin/ucl_teams.php',
            $path === 'v1/admin/ucl-countries'    => require __DIR__ . '/v1/admin/ucl_countries.php',
        $path === 'v1/admin/ucl-generate-games' => require __DIR__ . '/v1/admin/ucl_generate_games.php',
        $path === 'v1/admin/ucl-game-update'    => require __DIR__ . '/v1/admin/ucl_game_update.php',
        $path === 'v1/admin/ucl-game-edit'      => require __DIR__ . '/v1/admin/ucl_game_edit.php',
        $path === 'v1/admin/ucl-tie-edit'       => require __DIR__ . '/v1/admin/ucl_tie_edit.php',
        $path === 'v1/admin/livescore-test'     => require __DIR__ . '/v1/admin/livescore_test.php',
        $path === 'v1/admin/livescore-models'   => require __DIR__ . '/v1/admin/livescore_models.php',
        $path === 'v1/admin/livescore-log'      => require __DIR__ . '/v1/admin/livescore_log.php',
        $path === 'v1/admin/livescore-batch'    => require __DIR__ . '/v1/admin/livescore_batch.php',
        $path === 'v1/admin/ucl-livescore'      => require __DIR__ . '/v1/admin/ucl_livescore.php',
        $path === 'v1/admin/ucl-recalc'         => require __DIR__ . '/v1/admin/ucl_recalc.php',
        $path === 'v1/admin/ucl-load-pdf'         => require __DIR__ . '/v1/admin/ucl_load_pdf.php',
        $path === 'v1/admin/ucl-generate-tips'    => require __DIR__ . '/v1/admin/ucl_generate_tips.php',
        $path === 'v1/admin/ucl-generate-results' => require __DIR__ . '/v1/admin/ucl_generate_results.php',
        $path === 'v1/ucl/games'                => require __DIR__ . '/v1/ucl/games.php',
        $path === 'v1/ucl/teams'                => require __DIR__ . '/v1/ucl/teams.php',
        $path === 'v1/ucl/tips'                 => require __DIR__ . '/v1/ucl/tips.php',
        $path === 'v1/ucl/game-tips'            => require __DIR__ . '/v1/ucl/game_tips.php',
        $path === 'v1/ucl/standings'            => require __DIR__ . '/v1/ucl/standings.php',
        $path === 'v1/admin/impersonate'      => require __DIR__ . '/v1/admin/impersonate.php',
        $path === 'v1/fifa/teams'          => require __DIR__ . '/v1/fifa/teams.php',
        $path === 'v1/fifa/games'          => require __DIR__ . '/v1/fifa/games.php',
        $path === 'v1/fifa/game-tips'      => require __DIR__ . '/v1/fifa/game_tips.php',
        $path === 'v1/fifa/tips'           => require __DIR__ . '/v1/fifa/tips.php',
        $path === 'v1/fifa/standings'      => require __DIR__ . '/v1/fifa/standings.php',
        $path === 'v1/games'               => require __DIR__ . '/v1/games.php',
        $path === 'v1/tips'                => require __DIR__ . '/v1/tips.php',
        $path === 'v1/standings'           => require __DIR__ . '/v1/standings.php',
        $path === 'v1/global-standings'    => require __DIR__ . '/v1/global-standings.php',
        $path === 'v1/hall-of-fame'        => require __DIR__ . '/v1/hall-of-fame.php',
        $path === 'v1/team-names'          => require __DIR__ . '/v1/team-names.php',
        $path === 'v1/messages'            => require __DIR__ . '/v1/messages.php',
        $path === 'v1/message-image'       => require __DIR__ . '/v1/message-image.php',
        $path === 'v1/admin/messages'      => require __DIR__ . '/v1/admin/messages.php',
        $path === 'v1/player-tips'         => require __DIR__ . '/v1/player_tips.php',
        $path === 'v1/group-standings'     => require __DIR__ . '/v1/group_standings.php',
        $path === 'v1/admin/standings'           => require __DIR__ . '/v1/admin/standings.php',
        str_starts_with($path, 'v1/admin/group-standings') => require __DIR__ . '/v1/admin/group_standings.php',
        $path === 'v1/admin/run-migration'               => require __DIR__ . '/v1/admin/run_migration.php',
        $path === 'v1/admin/login-logs'                  => require __DIR__ . '/v1/admin/login_logs.php',
        $path === 'v1/admin/sync-scores'                 => require __DIR__ . '/v1/admin/sync_scores.php',
        $path === 'v1/notifications'                     => require __DIR__ . '/v1/notifications.php',
        $path === 'v1/admin/test-mail'                   => require __DIR__ . '/v1/admin/test_mail.php',
        $path === 'v1/admin/test-push'                   => require __DIR__ . '/v1/admin/test_push.php',
        $path === 'v1/admin/generate-vapid'              => require __DIR__ . '/v1/admin/generate_vapid.php',
        $path === 'v1/admin/send-test-push'              => require __DIR__ . '/v1/admin/send_test_push.php',
        $path === 'v1/push-config'                       => require __DIR__ . '/v1/push_config.php',
        $path === 'v1/push-subscribe'                    => require __DIR__ . '/v1/push_subscribe.php',
        $path === 'v1/admin/mail-log'                    => require __DIR__ . '/v1/admin/mail_log.php',
        $path === 'v1/admin/announcements'               => require __DIR__ . '/v1/admin/announcements.php',
        $path === 'v1/announcement'                      => require __DIR__ . '/v1/announcement.php',
        $path === 'v1/announcements'                     => require __DIR__ . '/v1/announcements.php',
        $path === 'setup'                  => require __DIR__ . '/setup_once.php',
        $path === 'sync-prod'              => require __DIR__ . '/sync_from_prod.php',
        default                            => json_error('Not found', 404)
    };
} catch (Throwable $e) {
    json_error($e->getMessage(), 500);
}
