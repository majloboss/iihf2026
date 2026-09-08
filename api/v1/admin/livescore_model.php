<?php
// Aktualny model pre livescore — informacie a nastavenie.
//
// GET  /v1/admin/livescore-model?competition_id=5
//      Ktory model dnes bezi, jeho cena, minute dnes a predpoklad na den.
//
// POST /v1/admin/livescore-model
//      { competition_id, model_id }        zmen model na dnes
//      { competition_id, vypnut: true, dovod }  vypni livescore na dnes
//      { competition_id, zapnut: true }    zapni spat
//      { competition_id, budget: 2.5 }     zmen denny strop

$auth = require_auth(true);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (file_exists($cfg)) require_once $cfg;
require_once __DIR__ . '/../../helpers/ai_models_fn.php';

$pdo = db();
$den = date('Y-m-d');

// ------------------------------------------------------------
// POST — zmena nastavenia
// ------------------------------------------------------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?: [];
    $cid  = (int)($body['competition_id'] ?? 0);
    if (!$cid) json_error('Chýba competition_id', 400);

    if (!empty($body['vypnut'])) {
        $dovod = trim((string)($body['dovod'] ?? 'vypnuté administrátorom'));
        ai_vypni_livescore($cid, $dovod, $auth['user_id']);
        json_ok(['stav' => 'vypnute', 'dovod' => $dovod]);
    }

    if (!empty($body['zapnut'])) {
        // Zapnutie rovno nastavi aj model, ked je vybrany — su to v praxi
        // dve casti jednej akcie a osobitne tlacidlo bolo len navyse.
        $mid = null;
        if (!empty($body['model_id'])) {
            $st = $pdo->prepare('SELECT id FROM admin.ai_models WHERE model_id = ?');
            $st->execute([trim((string)$body['model_id'])]);
            $mid = $st->fetchColumn() ?: null;
        }

        // INSERT ... ON CONFLICT, nie UPDATE: ked na dnes zaznam este nie je,
        // UPDATE by nemal co aktualizovat a zapnutie by ticho zlyhalo.
        $pdo->prepare(
            "INSERT INTO admin.livescore_day_config
                (competition_id, den, model_id, is_enabled, chosen_by,
                 chosen_by_user_id, chosen_at)
             VALUES (?, ?, ?, TRUE, 'admin', ?, NOW())
             ON CONFLICT (competition_id, den) DO UPDATE
                SET is_enabled = TRUE, disabled_reason = NULL,
                    -- model sa prepise len ked prisiel; inak zostane povodny
                    model_id = COALESCE(EXCLUDED.model_id, admin.livescore_day_config.model_id),
                    chosen_by_user_id = EXCLUDED.chosen_by_user_id, chosen_at = NOW()")
            ->execute([$cid, $den, $mid, $auth['user_id']]);

        json_ok(['stav' => 'zapnute', 'model' => $body['model_id'] ?? null]);
    }

    if (isset($body['budget'])) {
        $b = (float)$body['budget'];
        if ($b < 0 || $b > 100) json_error('Denný strop musí byť medzi 0 a 100 USD', 400);

        // Strop sa nastavuje na den aj ako predvolba sutaze, aby platil
        // aj zajtra, ked sa zaznam na den este nevytvoril.
        $pdo->prepare(
            "INSERT INTO admin.livescore_day_config (competition_id, den, daily_budget_usd)
             VALUES (?, ?, ?)
             ON CONFLICT (competition_id, den) DO UPDATE SET daily_budget_usd = EXCLUDED.daily_budget_usd")
            ->execute([$cid, $den, $b]);
        $pdo->prepare(
            "INSERT INTO admin.livescore_competition_default (competition_id, daily_budget_usd)
             VALUES (?, ?)
             ON CONFLICT (competition_id) DO UPDATE
                SET daily_budget_usd = EXCLUDED.daily_budget_usd, updated_at = NOW()")
            ->execute([$cid, $b]);

        json_ok(['budget' => $b]);
    }

    $modelKey = trim((string)($body['model_id'] ?? ''));
    if ($modelKey === '') json_error('Chýba model_id', 400);

    $st = $pdo->prepare('SELECT id FROM admin.ai_models WHERE model_id = ?');
    $st->execute([$modelKey]);
    $mid = $st->fetchColumn();
    if (!$mid) json_error('Model nie je v číselníku', 404);

    ai_nastav_model_na_den($cid, (int)$mid, 'admin', $auth['user_id']);
    json_ok(['model' => $modelKey, 'den' => $den]);
}

if ($method !== 'GET') json_error('Method not allowed', 405);

// ------------------------------------------------------------
// GET — stav pre vsetky sutaze, alebo pre jednu
// ------------------------------------------------------------
$cid = isset($_GET['competition_id']) ? (int)$_GET['competition_id'] : 0;

$sutaze = $cid
    ? $pdo->query("SELECT id, slug, name FROM admin.competitions WHERE id = $cid")->fetchAll()
    : $pdo->query('SELECT id, slug, name FROM admin.competitions WHERE is_active ORDER BY id')->fetchAll();

$vysledok = [];

foreach ($sutaze as $s) {
    $sid = (int)$s['id'];
    [$model, $modelRow, $dovod] = ai_model_pre_livescore($sid, $den);

    // Co sa dnes minulo — len ostre volania, testy sa do nakladov sutaze neratajú.
    $st = $pdo->prepare(
        "SELECT COUNT(*) AS volani,
                COUNT(*) FILTER (WHERE success) AS uspesnych,
                COALESCE(SUM(cost_usd), 0) AS minute,
                COALESCE(SUM(tokens), 0)   AS tokenov
           FROM admin.livescore_log
          WHERE call_type = 'live' AND competition_id = ?
            AND checked_at::date = ?::date");
    $st->execute([$sid, $den]);
    $dnes = $st->fetch();

    // Strop a stav vypnutia
    $st = $pdo->prepare(
        'SELECT d.daily_budget_usd, d.is_enabled, d.disabled_reason, d.chosen_by,
                d.chosen_at, u.username AS kto
           FROM admin.livescore_day_config d
           LEFT JOIN admin.users u ON u.id = d.chosen_by_user_id
          WHERE d.competition_id = ? AND d.den = ?');
    $st->execute([$sid, $den]);
    $cfgDen = $st->fetch();

    $st = $pdo->prepare(
        'SELECT daily_budget_usd FROM admin.livescore_competition_default WHERE competition_id = ?');
    $st->execute([$sid]);
    $budgetDefault = $st->fetchColumn();

    $budget = (float)($cfgDen['daily_budget_usd'] ?? $budgetDefault ?? 1.0);
    $minute = (float)$dnes['minute'];
    $volani = (int)$dnes['volani'];

    // Predpoklad na cely den: priemerna cena volania krat odhad poctu volani.
    // Odhad vychadza zo zapasov danej SUTAZE, ktore dnes este len budu bezat.
    //
    // Kazda sutaz ma vlastnu schemu a stlpec s casom sa v nich vola inak:
    // IIHF ma starts_at, ostatne start_time. Slug 'ucl2026' navyse nesedi
    // s nazvom schemy 'lm2026-27', preto je mapovanie explicitne.
    $schemy = [
        'iihf2026' => ['iihf2026',  'starts_at'],
        'fifa2026' => ['fifa2026',  'start_time'],
        'ucl2026'  => ['lm2026-27', 'start_time'],
    ];

    $zostava = 0;
    if (isset($schemy[$s['slug']])) {
        [$schema, $stlpec] = $schemy[$s['slug']];
        try {
            $st = $pdo->prepare(
                "SELECT COUNT(*) FROM \"$schema\".games
                  WHERE ($stlpec AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava' >= NOW()
                    AND ($stlpec AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava' < ?::date + 1");
            $st->execute([$den]);
            $zostava = (int)$st->fetchColumn();
        } catch (Throwable $e) {
            // Sutaz moze mat inak pomenovanu schemu alebo este nemat zapasy.
            $zostava = 0;
        }
    }

    $cenaVolania = $volani > 0 ? $minute / $volani
                 : ($modelRow ? ai_cena_volania($modelRow, 3200, 400) : 0.0);

    // Zapas sa poll-uje priblizne kazdych 5 minut po dobu 2 hodin = 24 volani.
    $predpoklad = $minute + $zostava * 24 * $cenaVolania;

    $vysledok[] = [
        'competition_id' => $sid,
        'slug'           => $s['slug'],
        'name'           => $s['name'],

        'model'          => $model,
        'model_nazov'    => $modelRow['name'] ?? null,
        'model_free'     => $modelRow ? in_array($modelRow['is_free'], [true,'t','1',1], true) : null,
        'cena_vstup_1m'  => $modelRow && $modelRow['price_input_1m']  !== null
                            ? round((float)$modelRow['price_input_1m'], 4) : null,
        'cena_vystup_1m' => $modelRow && $modelRow['price_output_1m'] !== null
                            ? round((float)$modelRow['price_output_1m'], 4) : null,
        'zdroj_nastavenia' => $dovod,
        'nastavil'       => $cfgDen['kto'] ?? null,
        'nastavene_kedy' => $cfgDen['chosen_at'] ?? null,

        // Zapnute a "ma nastaveny model" su dva rozne stavy: livescore moze
        // byt zapnute a este cakat na rany test, ktory model vyberie.
        'zapnute'        => $cfgDen
                            ? in_array($cfgDen['is_enabled'], [true,'t','1',1], true)
                            : ($model !== null),
        'ma_model'       => $model !== null,
        'dovod_vypnutia' => $cfgDen['disabled_reason'] ?? null,

        'dnes_volani'    => $volani,
        'dnes_uspesnych' => (int)$dnes['uspesnych'],
        'dnes_tokenov'   => (int)$dnes['tokenov'],
        'dnes_minute'    => round($minute, 6),
        'cena_volania'   => round($cenaVolania, 6),
        'zostava_zapasov'=> $zostava,
        'predpoklad_den' => round($predpoklad, 4),
        'budget'         => $budget,
        'vyuzitie_pct'   => $budget > 0 ? round(100 * $minute / $budget, 1) : null,
    ];
}

// Modely na vyber.
//
// Vracia sa CELY zoznam, nie prvych 40: odkedy je zoradenie abecedne, orezanie
// by zoznam ukoncilo niekde pri 'google/...' a na ostatne modely by sa nedalo
// prepnut. Vyber podla kvality a ceny sa robi v ciselniku.
$kandidati = array_map(static fn($m) => [
    'model_id'     => $m['model_id'],
    'name'         => $m['name'],
    'is_free'      => in_array($m['is_free'], [true,'t','1',1], true),
    'cena_1m'      => round((float)($m['price_input_1m'] ?? 0)
                          + (float)($m['price_output_1m'] ?? 0), 4),
    'success_rate' => $m['success_rate'] !== null ? (float)$m['success_rate'] : null,
    'agree_rate'   => $m['agree_rate']   !== null ? (float)$m['agree_rate']   : null,
    'tests_total'  => (int)$m['tests_total'],
    'avg_ms'       => $m['avg_ms'] !== null ? (int)$m['avg_ms'] : null,
    // Kolkokrat model vratil ine timy nez vacsina. Pri vybere do produkcie
    // je to podstatnejsie nez cena — model, ktory halucinuje, hlasi hracom
    // vymyslene vysledky.
    'halucinacii'  => (int)($m['halucinacii'] ?? 0),
], $pdo->query(
    "SELECT m.*,
            (SELECT COUNT(*) FROM admin.livescore_model_test t
              WHERE t.model_key = m.model_id AND t.teams_agree = FALSE) AS halucinacii
       FROM admin.ai_models m
      WHERE m.is_enabled AND m.unavailable_reason IS NULL
        AND (m.is_free OR (m.price_input_1m IS NOT NULL AND m.price_output_1m IS NOT NULL))
      -- Abecedne: v rozbalovacom zozname sa model uz len hlada, vyber podla
      -- kvality a ceny sa robi v ciselniku.
      ORDER BY m.model_id
      LIMIT 1000")->fetchAll());

json_ok(['den' => $den, 'sutaze' => $vysledok, 'modely' => $kandidati]);
