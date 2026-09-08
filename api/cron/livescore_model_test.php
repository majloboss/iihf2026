<?php
// Automaticky vyber livescore modelu na dnesny den.
//
// Volaj kazdych 15 minut:
//   https://betclub.fellow.sk/api/cron/livescore_model_test.php?token=<CRON_SECRET>
//
// Script sam rozhodne, ci ma zmysel nieco robit:
//   - ked je na dnes uz model vybrany, skonci hned a nic nestoji
//   - inak caka na okno hodinu pred prvym zapasom dna
//
// Postup vyberu:
//   1. najde zapas, na ktorom sa da testovat (vlastny prebiehajuci, inak
//      lubovolny prebiehajuci z Flashscore)
//   2. skusa modely v poradi: bezplatne podla doterajsej zhody, potom
//      platene od najlacnejsieho
//   3. prvy, ktory vytiahne skore aj cast hry, sa nastavi na dnesny den
//
// Ked neprejde ziadny, livescore sa pre dany den vypne a admin dostane
// spravu — lepsie nic nez nespravne skore.

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/db.php';

header('Content-Type: text/plain; charset=utf-8');

$token = $_GET['token'] ?? '';
if (!defined('CRON_SECRET') || !hash_equals(CRON_SECRET, $token)) {
    http_response_code(403);
    exit('Forbidden');
}

$cfg = __DIR__ . '/../config/openrouter.php';
if (!file_exists($cfg)) { http_response_code(500); exit('Chýba openrouter.php'); }
require_once $cfg;

require_once __DIR__ . '/../helpers/ai_models_fn.php';
require_once __DIR__ . '/../helpers/livescore_fn.php';
require_once __DIR__ . '/../helpers/livescore_test_fn.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/cron_heartbeat.php';

// ------------------------------------------------------------
// Sprava adminom. Nefunkcna posta nesmie zhodit cely beh, preto try/catch.
// ------------------------------------------------------------
function ls_uvedom_admina(string $predmet, string $telo): void {
    try {
        $pdo = db();
        $st = $pdo->query(
            "SELECT email FROM admin.users
              WHERE role = 'admin' AND is_active AND email IS NOT NULL AND email <> ''");
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $email) {
            send_mail_logged($pdo, $email, $predmet, nl2br(htmlspecialchars($telo)));
        }
    } catch (Throwable $e) {
        error_log('livescore_model_test: notifikacia zlyhala - ' . $e->getMessage());
    }
}

const TEST_COMPETITION_ID = 5;      // UCL
const TEST_MAX_MODELOV    = 8;      // kolko skusit, nez to vzdame
const TEST_MAX_SEKUND     = 20;     // model pomalsi nez toto je na livescore nepouzitelny

$pdo  = db();
$den  = date('Y-m-d');
$cas  = gmdate('Y-m-d H:i:s') . ' UTC';
echo "$cas — automatický výber livescore modelu\n";

// ------------------------------------------------------------
// 1. Je uz model na dnes vybrany?
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT model_id, is_enabled, chosen_by FROM admin.livescore_day_config
      WHERE competition_id = ? AND den = ?");
$st->execute([TEST_COMPETITION_ID, $den]);
$cfgDen = $st->fetch();

if ($cfgDen && ($cfgDen['model_id'] || !in_array($cfgDen['is_enabled'], [true,'t','1',1], true))) {
    cron_beh('livescore_model_test', 'na dnes je rozhodnute');
    exit("Na dnes je už rozhodnuté ({$cfgDen['chosen_by']}), test netreba.\n");
}

// ------------------------------------------------------------
// 2. Je cas testovat? Hodinu pred prvym zapasom dna.
// ------------------------------------------------------------
$st = $pdo->prepare(
    "SELECT MIN(start_time) AS prvy FROM \"lm2026-27\".games
      WHERE (start_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava' >= ?::date
        AND (start_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava' <  ?::date + 1
        AND flashscore_url IS NOT NULL AND flashscore_url <> ''");
$st->execute([$den, $den]);
$prvy = $st->fetchColumn();

if (!$prvy) { cron_beh('livescore_model_test', 'dnes niet zapasov'); exit("Dnes nie sú zápasy s adresou Flashscore.\n"); }

$prvyTs = strtotime($prvy . ' UTC');
$teraz  = time();

// Okno: hodinu pred vykopom az do vykopu. Neskor uz zapas bezi a testuje sa
// priamo na nom.
if ($teraz < $prvyTs - 3600) {
    $o = (int)round(($prvyTs - 3600 - $teraz) / 60);
    cron_beh('livescore_model_test', "caka sa, test o $o min");
    exit("Prvý zápas o " . gmdate('H:i', $prvyTs) . " UTC, test začne o $o minút.\n");
}

// ------------------------------------------------------------
// 3. Na ktorom zapase testovat
// ------------------------------------------------------------
// Prednost ma vlastny prave bezici zapas — je to presne to prostredie,
// v ktorom bude model pracovat.
$st = $pdo->prepare(
    "SELECT flashscore_url FROM \"lm2026-27\".games
      WHERE flashscore_url IS NOT NULL AND flashscore_url <> ''
        AND start_time <= (NOW() AT TIME ZONE 'UTC')
        AND start_time > (NOW() AT TIME ZONE 'UTC') - INTERVAL '3 hours'
      ORDER BY start_time DESC LIMIT 1");
$st->execute();
$testUrl = $st->fetchColumn();
$sport   = 'futbal';

if (!$testUrl) {
    // Ziadny vlastny zapas nebezi — vezme sa prvy dnesny. Model sa aspon
    // overi na skutocnej stranke, aj ked sa este nehra.
    $st = $pdo->prepare(
        "SELECT flashscore_url FROM \"lm2026-27\".games
          WHERE (start_time AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Bratislava' >= ?::date
            AND flashscore_url IS NOT NULL AND flashscore_url <> ''
          ORDER BY start_time LIMIT 1");
    $st->execute([$den]);
    $testUrl = $st->fetchColumn();
}

if (!$testUrl) { cron_beh('livescore_model_test', 'niet zapasu na test'); exit("Nenašiel sa zápas, na ktorom testovať.\n"); }
echo "Testujem na: $testUrl\n";

// ------------------------------------------------------------
// 4. Skusaj modely v poradi
// ------------------------------------------------------------
$page = livescore_fetch_page($testUrl);
echo "Vstup: " . mb_strlen($page['input']) . " znakov\n\n";

$runId = (int)$pdo->query(
    "SELECT COALESCE(MAX(run_id), 0) + 1 FROM admin.livescore_model_test")->fetchColumn();

$kandidati = ai_kandidati(TEST_MAX_MODELOV);
$vitaz     = null;
$skusenych = 0;

foreach ($kandidati as $model) {
    $skusenych++;
    $v = ls_test_model($model, $page['input'], $testUrl, $sport);
    ls_zapis_test($v, $testUrl, TEST_COMPETITION_ID, $sport, $runId);

    $sek = round($v['took_ms'] / 1000, 1);
    $stav = $v['passed'] ? 'OK' : 'zlyhal';
    echo sprintf("  %-46s %-7s %5.1f s  %s\n",
        $model['model_id'], $stav, $sek, $v['error'] ?? '');

    if (!$v['passed']) continue;

    // Model, ktory odpoveda dlhsie nez TEST_MAX_SEKUND, je na livescore
    // nepouzitelny — poll bezi kazdych 5 minut a cakat na neho nema zmysel.
    if ($v['took_ms'] > TEST_MAX_SEKUND * 1000) {
        echo "     (príliš pomalý, hľadám ďalej)\n";
        continue;
    }

    $vitaz = $model;
    break;
}

// ------------------------------------------------------------
// 5. Vyhodnotenie
// ------------------------------------------------------------
echo "\n";

if ($vitaz === null) {
    $dovod = "Ranný test neprešiel ani jeden z $skusenych modelov";
    ai_vypni_livescore(TEST_COMPETITION_ID, $dovod, null, $den);

    echo "$dovod — livescore je pre dnešok vypnuté.\n";
    ls_uvedom_admina('Livescore dnes nepobeží',
        "$dovod.\n\nLivescore je pre dnešok vypnuté, aby neuvádzalo nesprávne "
      . "skóre. V Správa → Livescore → Model sa dá model nastaviť ručne.");
    exit;
}

ai_nastav_model_na_den(TEST_COMPETITION_ID, (int)$vitaz['id'], 'auto', null, $den);
cron_beh('livescore_model_test', 'vybrany model: ' . $vitaz['model_id']);

$cena = $vitaz['price_input_1m'] === null ? 'zdarma'
      : '$' . round((float)$vitaz['price_input_1m'] + (float)$vitaz['price_output_1m'], 4) . ' / 1M';

echo "Vybraný model: {$vitaz['model_id']} ($cena)\n";
echo "Skúšaných modelov: $skusenych\n";
