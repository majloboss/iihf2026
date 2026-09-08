<?php
// POST /v1/admin/livescore-models-sync
//
// Zosynchronizuje ciselnik admin.ai_models so zivym cennikom OpenRoutera.
// Ceny aj dostupnost sa v case menia, preto to nie je jednorazovy import.

require_auth(true);
if ($method !== 'POST') json_error('Method not allowed', 405);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) {
    json_error('Chýba api/config/openrouter.php', 500);
}
require_once $cfg;
require_once __DIR__ . '/../../helpers/ai_models_fn.php';

try {
    [$pridanych, $aktualizovanych] = ai_sync_cennik();
} catch (Throwable $e) {
    json_error($e->getMessage(), 502);
}

$suhrn = db()->query(
    "SELECT COUNT(*) AS spolu,
            COUNT(*) FILTER (WHERE is_free) AS free,
            COUNT(*) FILTER (WHERE is_enabled AND unavailable_reason IS NULL) AS pouzitelnych
       FROM admin.ai_models")->fetch();

json_ok([
    'pridanych'       => $pridanych,
    'aktualizovanych' => $aktualizovanych,
    'spolu'           => (int)$suhrn['spolu'],
    'bezplatnych'     => (int)$suhrn['free'],
    'pouzitelnych'    => (int)$suhrn['pouzitelnych'],
]);
