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
//   2. skusa bezplatne modely, kym nenazbiera PAT funkcnych
//   3. k nim prida jeden plateny ako poistku pre pripad, ze bezplatne
//      vycerpaju denny limit poskytovatela
//   4. zostavene poradie ulozi do admin.livescore_poradie a prvy model
//      nastavi na dnesny den
//
// PRECO PORADIE A NIE JEDEN VITAZ: bezplatne modely maju denny limit
// poziadaviek. Jediny vybrany model ho cez vecer vycerpa a livescore
// zhasne uprostred zapasov. S poradim sa aplikacia sama prepne na dalsi.
//
// Rucne nastavene poradie sa PREPISE — dostupnost modelov sa meni zo dna
// na den a test vie, co dnes naozaj funguje.
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

// Verejny feed Flashscore so vsetkymi dnesnymi zapasmi. Stranka
// flashscore.com zapasy v HTML nema — dotahuje ich javascriptom, takze
// zoznam sa musi brat odtialto.
const FS_FEED = 'https://local-global.flashscore.ninja/2/x/feed/f_1_0_1_en_1';

// ------------------------------------------------------------
// Najde lubovolny PRAVE BEZIACI zapas na Flashscore.
//
// Test musi bezat na zapase, ktory sa naozaj hra — inak nie je co odcitat
// a kazdy model "zlyha" bez ohladu na to, ci funguje.
//
// Feed ma vlastny format: zaznamy oddelene ~AA÷, polia znakom ¬.
// AB÷2 znamena prave bezuci zapas, AE/AF su nazvy timov.
// ------------------------------------------------------------
function ls_najdi_bezuci_zapas(): ?string {
    $ch = curl_init(FS_FEED);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_USERAGENT      => 'Mozilla/5.0',
        CURLOPT_HTTPHEADER     => ['x-fsign: SW9D1eZo'],
    ]);
    $data = curl_exec($ch);
    $kod  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($kod !== 200 || !$data) return null;

    foreach (array_slice(explode('~AA÷', $data), 1) as $zaznam) {
        if (!preg_match('/AB÷2/', $zaznam)) continue;      // 2 = prave bezi
        $id = explode('¬', $zaznam)[0];
        if (!preg_match('/^[A-Za-z0-9]{6,10}$/', $id)) continue;

        preg_match('/AE÷([^¬]+)/', $zaznam, $d);
        preg_match('/AF÷([^¬]+)/', $zaznam, $h);
        echo sprintf("  bežiaci zápas: %s — %s
", $d[1] ?? '?', $h[1] ?? '?');

        return 'https://www.flashscore.com/match/' . $id . '/#/match-summary';
    }
    return null;
}

const TEST_COMPETITION_ID = 5;      // UCL
const TEST_FREE_CIEL      = 5;      // kolko bezplatnych chceme mat v poradi
const TEST_PLATENYCH      = 1;      // plateny na koniec ako poistka
const TEST_MAX_SKUSOK     = 15;     // poistka proti nekonecnemu testovaniu
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
    // Ziadny NAS zapas prave nebezi — vezme sa lubovolny prave bezuci zapas
    // z Flashscore.
    //
    // PRECO NIE PRVY DNESNY: na zapase, ktory sa este nezacal, nie je co
    // odcitat — nema skore ani minutu. Model "zlyha" aj ked funguje spravne
    // a livescore sa zbytocne vypne. Presne to sa stalo 10.9.2026: test
    // bezal o 15:45 na zapase s vykopom o 18:45.
    $testUrl = ls_najdi_bezuci_zapas();
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

// Vysledkom je PORADIE, nie jeden vitaz: bezplatne modely maju denny limit
// poziadaviek a jediny model by ho cez vecer vycerpal.
$uspesne   = [];      // bezplatne, ktore presli
$skusenych = 0;

echo "Bezplatné modely (cieľ " . TEST_FREE_CIEL . "):\n";
foreach (ai_kandidati_free(TEST_MAX_SKUSOK) as $model) {
    if (count($uspesne) >= TEST_FREE_CIEL || $skusenych >= TEST_MAX_SKUSOK) break;
    $skusenych++;

    $v = ls_test_model($model, $page['input'], $testUrl, $sport);
    ls_zapis_test($v, $testUrl, TEST_COMPETITION_ID, $sport, $runId);

    $sek  = round($v['took_ms'] / 1000, 1);
    $stav = $v['passed'] ? 'OK' : 'zlyhal';
    echo sprintf("  %-46s %-7s %5.1f s  %s\n",
        $model['model_id'], $stav, $sek, $v['error'] ?? '');

    if (!$v['passed']) continue;

    // Model pomalsi nez TEST_MAX_SEKUND je na livescore nepouzitelny —
    // poll bezi kazdych 5 minut a cakat na neho nema zmysel.
    if ($v['took_ms'] > TEST_MAX_SEKUND * 1000) {
        echo "     (príliš pomalý, do poradia nejde)\n";
        continue;
    }

    $uspesne[] = $model;
}

// Plateny na koniec ako poistka. Testuje sa aj vtedy, ked bezplatnych je
// dost — prave vtedy, ked vsetky vycerpaju denny limit, ma nastupit on.
$platene = [];
echo "\nPlatený model (poistka):\n";
foreach (ai_kandidati_platene(3) as $model) {
    if (count($platene) >= TEST_PLATENYCH) break;

    $v = ls_test_model($model, $page['input'], $testUrl, $sport);
    ls_zapis_test($v, $testUrl, TEST_COMPETITION_ID, $sport, $runId);

    $cena = round((float)$model['price_input_1m'] + (float)$model['price_output_1m'], 4);
    echo sprintf("  %-46s %-7s %5.1f s  $%s / 1M  %s\n",
        $model['model_id'], $v['passed'] ? 'OK' : 'zlyhal',
        round($v['took_ms'] / 1000, 1), $cena, $v['error'] ?? '');

    if ($v['passed'] && $v['took_ms'] <= TEST_MAX_SEKUND * 1000) $platene[] = $model;
}

// Bezplatne idu prve, plateny az za nimi — plati sa az ked ine nezostava.
$poradie = array_merge($uspesne, $platene);
$vitaz   = $poradie[0] ?? null;

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

// Poradie sa uklada CELE a prepisuje pripadne rucne nastavenie — dostupnost
// modelov sa meni zo dna na den a test vie, co dnes naozaj funguje.
$ulozenych = ai_uloz_poradie(TEST_COMPETITION_ID, $poradie);
ai_nastav_model_na_den(TEST_COMPETITION_ID, (int)$vitaz['id'], 'auto', null, $den);
cron_beh('livescore_model_test',
         sprintf('poradie %d modelov, prvy: %s', $ulozenych, $vitaz['model_id']));

echo "Poradie na dnes ($ulozenych modelov):\n";
foreach ($poradie as $i => $m) {
    $zadarmo = in_array($m['is_free'], [true, 't', '1', 1], true);
    $cena = $zadarmo ? 'zdarma'
          : '$' . round((float)$m['price_input_1m'] + (float)$m['price_output_1m'], 4) . ' / 1M';
    echo sprintf("  %d. %-46s %s\n", $i + 1, $m['model_id'], $cena);
}
echo "\nSkúšaných bezplatných: $skusenych\n";

// Menej nez ciel znamena, ze dostupnych bezplatnych modelov ubuda — stoji
// za to o tom vediet skor, nez ich prestane byt dost uplne.
if (count($uspesne) < TEST_FREE_CIEL) {
    $sprava = sprintf('Prešlo len %d bezplatných modelov z cieľových %d (skúšaných %d). '
                    . 'Livescore beží, ale rezerva pri vyčerpaní denných limitov je menšia.',
                      count($uspesne), TEST_FREE_CIEL, $skusenych);
    echo "\nUPOZORNENIE: $sprava\n";
    ls_uvedom_admina('Livescore: málo bezplatných modelov', $sprava);
}
