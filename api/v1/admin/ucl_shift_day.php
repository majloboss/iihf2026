<?php
// GET  /v1/admin/ucl-shift-day — zoznam hracich dni a poctu zapasov
// POST /v1/admin/ucl-shift-day — presunie cely hraci den na novy datum a cas
//
// Testovaci nastroj. Sutaz sa hra od septembra 2026 do juna 2027, takze bez
// posuvania terminov sa neda vyskusat ani vysledok, ani postup do playoff.
//
// Zapasy vybraneho dna sa zoradia podla povodneho casu a rozlozia od zadaneho
// zaciatku po zvolenom kroku (predvolene 15 minut). Vdaka tomu sa daju zapasy
// odbavovat postupne a sledovat, ako pribudaju body a meni sa tabulka.
//
// start_time je naive UTC, ale admin zadava miestny cas — prepocet je rovnaky
// ako inde v aplikacii.
require_auth(true);
$pdo = db();

const UCL_SCHEMA = '"lm2026-27"';

// Posun miestneho casu voci UTC: leto +2 (CEST), zima +1 (CET).
// Letny cas plati od poslednej marcovej do poslednej oktobrovej nedele.
function ucl_utc_offset(string $datum): int {
    $rok = (int)substr($datum, 0, 4);
    $poslednaNedela = function (int $rok, int $mesiac): string {
        $d = new DateTimeImmutable(sprintf('%04d-%02d-01', $rok, $mesiac), new DateTimeZone('UTC'));
        $d = $d->modify('last day of this month');
        return $d->modify('-' . ((int)$d->format('w')) . ' days')->format('Y-m-d');
    };
    $od = $poslednaNedela($rok, 3);
    $do = $poslednaNedela($rok, 10);
    return ($datum >= $od && $datum < $do) ? 2 : 1;
}

if ($method === 'GET') {
    // Hraci den sa urcuje podla miestneho datumu, nie podla UTC — inak by
    // zapas o 21:00 SEC vysiel v zozname pod nespravnym dnom. Prevod na
    // 'Europe/Bratislava' rata letny aj zimny cas sam.
    $rows = $pdo->query('
        SELECT (start_time AT TIME ZONE \'UTC\' AT TIME ZONE \'Europe/Bratislava\')::date AS den,
               COUNT(*) AS zapasov,
               MIN(start_time) AS prvy,
               MAX(start_time) AS posledny,
               COUNT(*) FILTER (WHERE result_approved) AS schvalenych,
               string_agg(DISTINCT game_type_code, \', \') AS fazy
          FROM ' . UCL_SCHEMA . '.games
         GROUP BY 1 ORDER BY 1')->fetchAll();
    json_ok(['days' => $rows]);
}

if ($method !== 'POST') json_error('Method not allowed', 405);

$body    = json_decode(file_get_contents('php://input'), true) ?: [];
$den     = trim((string)($body['day'] ?? ''));
$novyDen = trim((string)($body['new_date'] ?? ''));
$cas     = trim((string)($body['new_time'] ?? ''));
$krok    = isset($body['step_minutes']) ? (int)$body['step_minutes'] : 15;

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $den))     json_error('Neplatný hrací deň', 400);
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $novyDen)) json_error('Neplatný nový dátum', 400);
if (!preg_match('/^\d{2}:\d{2}$/', $cas))           json_error('Neplatný čas, očakáva sa HH:MM', 400);
if ($krok < 0 || $krok > 720) json_error('Krok musí byť medzi 0 a 720 minútami', 400);

// Zapasy dna v poradi, v akom sa hraju — to poradie si presun zachova.
$sel = $pdo->prepare('SELECT game_id FROM ' . UCL_SCHEMA . '.games
                       WHERE (start_time AT TIME ZONE \'UTC\'
                              AT TIME ZONE \'Europe/Bratislava\')::date = ?
                       ORDER BY start_time, game_id');
$sel->execute([$den]);
$games = $sel->fetchAll(PDO::FETCH_COLUMN);
if (!$games) json_error("V dni $den nie sú žiadne zápasy", 400);

$offset = ucl_utc_offset($novyDen);
$zaciatok = new DateTimeImmutable($novyDen . ' ' . $cas . ':00', new DateTimeZone('UTC'));
$zaciatok = $zaciatok->modify('-' . $offset . ' hours');   // miestny cas -> naive UTC

try {
    $pdo->beginTransaction();
    $upd = $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                             SET start_time = ?, updated_at = NOW()
                           WHERE game_id = ?');

    $poradie = 0;
    foreach ($games as $gameId) {
        $novyCas = $zaciatok->modify('+' . ($poradie * $krok) . ' minutes');
        $upd->execute([$novyCas->format('Y-m-d H:i:s'), (int)$gameId]);
        $poradie++;
    }

    // Tipovanie sa riadi casom zapasu, takze po posune do buducnosti sa ma
    // opat otvorit — inak by sa presunuty zapas nedal tipovat.
    $pdo->prepare('UPDATE ' . UCL_SCHEMA . '.games
                      SET tips_open = TRUE
                    WHERE game_id = ANY(?) AND NOT result_approved
                      AND start_time > (NOW() AT TIME ZONE \'UTC\') + INTERVAL \'5 minutes\'')
        ->execute(['{' . implode(',', array_map('intval', $games)) . '}']);

    $pdo->commit();

    $prvy = $zaciatok->modify('+' . $offset . ' hours');
    $posledny = $zaciatok->modify('+' . (($poradie - 1) * $krok + $offset * 60) . ' minutes');
    json_ok([
        'moved'    => count($games),
        'from_day' => $den,
        'to_day'   => $novyDen,
        'first'    => $prvy->format('Y-m-d H:i'),
        'last'     => $posledny->format('Y-m-d H:i'),
        'step'     => $krok,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_error('Presun zlyhal: ' . $e->getMessage(), 500);
}
