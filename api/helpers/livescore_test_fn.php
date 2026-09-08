<?php
// Test modelov na skutocnom zapase.
//
// Zisti sa, ci model dokaze z Flashscore feedu vytiahnut tri veci, ktore ma
// kazdy sport: skore, cast hry a minutu. Nazvy sa lisia (polcas / tretina /
// set / stvrtina), preto sa modelu posiela sport a on vracia to iste pole.
//
// Kazdy testovany model = jeden zaznam v admin.livescore_log s call_type='test'
// a jeden v admin.livescore_model_test. Testovacie volania sa neratajú do
// nakladov sutaze.

require_once __DIR__ . '/ai_models_fn.php';

// ------------------------------------------------------------
// Prompt nezavisly od sportu.
// ------------------------------------------------------------
function ls_test_prompt(string $vstup, string $sport = 'neznámy'): string {
    return <<<PROMPT
Odpovedz IBA JSON objektom. Nepíš žiadne úvahy, vysvetlenia ani text pred
alebo za JSON. Prvý znak odpovede musí byť { a posledný }.

Si asistent, ktorý z obsahu športovej stránky vyčíta stav zápasu.
Šport: {$sport}

Vráť VÝHRADNE JSON bez akéhokoľvek komentára:
{
  "home_team": "názov domáceho tímu alebo null",
  "away_team": "názov hosťujúceho tímu alebo null",
  "sport": "futbal / hokej / volejbal / basketbal / iné",
  "started": true/false,
  "finished": true/false,
  "home_score": číslo alebo null,
  "away_score": číslo alebo null,
  "period": "názov práve prebiehajúcej časti hry podľa športu:
             polčas / tretina / set / štvrtina / predĺženie / prestávka / null",
  "period_number": číslo prebiehajúcej časti (1, 2, 3...) alebo null,
  "minute": číslo prebiehajúcej minúty alebo null,
  "competition": "názov súťaže alebo null",
  "notes": "stručne, čo je na stránke podstatné"
}

Pravidlá:
- Ak údaj na stránke nie je, daj null. Nikdy si nič nedomýšľaj.
- Skóre uvádzaj ako čísla. Pri volejbale je skóre počet setov.
- Minútu majú len športy, ktoré ju merajú — pri volejbale daj null.
- Vo feede Flashscore znamená AE domáci tím, AF hosťujúci, AG skóre domácich,
  AH skóre hostí, AB stav zápasu, AD čas začiatku, AZ prebiehajúcu minútu.

OBSAH STRÁNKY:
{$vstup}
PROMPT;
}

// ------------------------------------------------------------
// Otestuje jeden model na danom obsahu stranky.
// Vracia pole s vysledkom, vrátane toho, co sa podarilo vytiahnut.
// ------------------------------------------------------------
function ls_test_model(array $model, string $vstup, string $url, string $sport = 'neznámy'): array {
    $prompt = ls_test_prompt($vstup, $sport);
    $zaciatok = microtime(true);

    $payload = json_encode([
        'model'       => $model['model_id'],
        'messages'    => [['role' => 'user', 'content' => $prompt]],
        'temperature' => 0,
        // 2000 staci na JSON aj na kratke uvazovanie pred nim. Pri 700 sa
        // vacsina modelov nedostala k odpovedi — minula limit na premyslani.
        'max_tokens'  => 2000,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init(defined('OPENROUTER_URL') ? OPENROUTER_URL
                    : 'https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . OPENROUTER_KEY,
            'Content-Type: application/json',
            'HTTP-Referer: ' . (defined('APP_URL') ? APP_URL : 'https://betclub.fellow.sk'),
            'X-Title: BetClub livescore test',
        ],
    ]);
    $odpoved = curl_exec($ch);
    $httpKod = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    $ms = (int)round((microtime(true) - $zaciatok) * 1000);

    $vysledok = [
        'model'       => $model['model_id'],
        'model_db_id' => $model['id'] ?? null,
        'http_status' => $httpKod,
        'took_ms'     => $ms,
        'data'        => null,
        'error'       => null,
        'got_score'   => false,
        'got_period'  => false,
        'got_minute'  => false,
        'passed'      => false,
        'prompt_tokens'     => null,
        'completion_tokens' => null,
        'total_tokens'      => null,
        'cost_usd'          => 0.0,
        'score_text'        => null,
        'teams_text'        => null,
    ];

    if ($odpoved === false) {
        $vysledok['error'] = 'Spojenie zlyhalo: ' . $curlErr;
        return $vysledok;
    }

    $ai = json_decode($odpoved, true);
    if ($httpKod !== 200) {
        $vysledok['error'] = $ai['error']['message'] ?? ('HTTP ' . $httpKod);
        return $vysledok;
    }

    $obsah = $ai['choices'][0]['message']['content'] ?? '';
    $vysledok['prompt_tokens']     = $ai['usage']['prompt_tokens']     ?? null;
    $vysledok['completion_tokens'] = $ai['usage']['completion_tokens'] ?? null;
    $vysledok['total_tokens']      = $ai['usage']['total_tokens']      ?? null;
    $vysledok['cost_usd'] = ai_cena_volania(
        $model, $vysledok['prompt_tokens'], $vysledok['completion_tokens']);

    // Orezana odpoved nemusi byt strata: ked model uvazoval a JSON uz stihol
    // dopisat, da sa z textu vytiahnut. Chyba sa hlasi az ked tam JSON nie je.
    $orezane = ($ai['choices'][0]['finish_reason'] ?? null) === 'length';

    // Model niekedy obali JSON do ```json ... ``` alebo pripoji komentar.
    if (preg_match('/\{.*\}/s', $obsah, $m)) $obsah = $m[0];
    $d = json_decode($obsah, true);

    if (!is_array($d)) {
        $vysledok['error'] = $orezane
            ? 'Odpoveď bola orezaná (model uvažoval namiesto JSON)'
            : 'Odpoveď nie je platný JSON';
        return $vysledok;
    }

    $vysledok['data'] = $d;

    // Vyhodnotenie: tri udaje, ktore ma kazdy sport.
    $vysledok['got_score']  = is_numeric($d['home_score'] ?? null)
                           && is_numeric($d['away_score'] ?? null);
    $vysledok['got_period'] = !empty($d['period']) || is_numeric($d['period_number'] ?? null);
    $vysledok['got_minute'] = is_numeric($d['minute'] ?? null);

    // Minuta je bonus — volejbal ju nema. Staci skore a cast hry.
    $vysledok['passed'] = $vysledok['got_score'] && $vysledok['got_period'];

    // Nezmyselne hodnoty. Model, ktory pri futbale vrati 38:1, necital
    // stranku — vytiahol nejake cislo z ineho miesta (poradie v tabulke,
    // pocet striel). Hranice su volne, aby presli aj tenis a volejbal.
    if ($vysledok['passed']) {
        $dh = (int)$d['home_score'];
        $da = (int)$d['away_score'];
        $minuta = is_numeric($d['minute'] ?? null) ? (int)$d['minute'] : null;

        if ($dh < 0 || $da < 0 || $dh > 30 || $da > 30) {
            $vysledok['passed'] = false;
            $vysledok['error']  = "Nezmyselné skóre $dh:$da";
        } elseif ($minuta !== null && ($minuta < 0 || $minuta > 200)) {
            $vysledok['passed'] = false;
            $vysledok['error']  = "Nezmyselná minúta: $minuta";
        }
    }

    // Skore ako text, aby sa dala porovnat zhoda medzi modelmi. Prvy ostry
    // test ukazal, ze 11 modelov vratilo 6 roznych skore toho isteho zapasu —
    // samotne 'passed' teda nestaci, overuje len ci model vratil cisla.
    $vysledok['score_text'] = $vysledok['got_score']
        ? ((int)$d['home_score'] . ':' . (int)$d['away_score'])
        : null;

    // Nazvy timov su najlepsi ukazovatel halucinacie: model, ktory namiesto
    // skutocnych timov vrati 'Real Madrid — Barcelona', si vymyslel aj skore.
    // Odhali to az porovnanie s ostatnymi, preto sa nazvy ukladaju zvlast.
    $vysledok['teams_text'] = (!empty($d['home_team']) && !empty($d['away_team']))
        ? mb_substr(trim((string)$d['home_team']) . ' — ' . trim((string)$d['away_team']), 0, 120)
        : null;

    // Model, ktory skopiroval text zo sablony promptu, zjavne nepochopil ulohu.
    foreach (['home_team', 'away_team', 'period'] as $pole) {
        $h = (string)($d[$pole] ?? '');
        if ($h !== '' && (str_contains($h, 'názov') || str_contains($h, 'alebo null'))) {
            $vysledok['passed'] = false;
            $vysledok['error']  = 'Model skopíroval text zo šablóny namiesto údajov';
            $vysledok['score_text'] = null;
            $vysledok['teams_text'] = null;
            break;
        }
    }

    return $vysledok;
}

// ------------------------------------------------------------
// Zapise vysledok testu do logu aj do tabulky testov.
// ------------------------------------------------------------
function ls_zapis_test(array $v, string $url, ?int $competitionId, ?string $sport,
                       ?int $runId = null): void {
    $pdo = db();
    $d   = $v['data'] ?? [];

    $cislo = static fn($x) => is_numeric($x) ? (int)$x : null;
    $text  = static fn($x) => (is_string($x) || is_numeric($x))
                              ? mb_substr((string)$x, 0, 100) : null;

    // 1) log volania — game_id zostava NULL, test bezi na cudzom zapase,
    //    zapas identifikuje url
    //
    // Stlpce a hodnoty su parovane cez pomenovane pole, nie cez poradie
    // otaznikov: pri 25 stlpcoch je posun o jeden takmer nezbadatelny.
    $bool = static fn($x) => is_bool($x) ? ($x ? 't' : 'f') : null;

    $riadok = [
        'url'            => mb_substr($url, 0, 500),
        'model'          => mb_substr($v['model'], 0, 100),
        'call_type'      => 'test',
        'competition_id' => $competitionId,
        'provider'       => 'openrouter',

        'home_team'      => $text($d['home_team'] ?? null),
        'away_team'      => $text($d['away_team'] ?? null),
        'competition'    => $text($d['competition'] ?? null),

        'started'        => $bool($d['started'] ?? null),
        'finished'       => $bool($d['finished'] ?? null),
        'minute'         => $cislo($d['minute'] ?? null),
        'period'         => $text($d['period'] ?? null),
        'period_number'  => $cislo($d['period_number'] ?? null),

        'home_score'     => $cislo($d['home_score'] ?? null),
        'away_score'     => $cislo($d['away_score'] ?? null),
        'notes'          => isset($d['notes']) ? mb_substr((string)$d['notes'], 0, 2000) : null,
        'raw'            => $v['data'] !== null
                            ? json_encode($v['data'], JSON_UNESCAPED_UNICODE) : null,

        'prompt_tokens'     => $v['prompt_tokens'],
        'completion_tokens' => $v['completion_tokens'],
        'tokens'            => $v['total_tokens'],
        'cost_usd'          => round($v['cost_usd'], 6),

        'success'        => $v['passed'] ? 't' : 'f',
        'http_status'    => $v['http_status'],
        'error'          => $v['error'] !== null ? mb_substr($v['error'], 0, 1000) : null,
        'took_ms'        => $v['took_ms'],
    ];

    $stlpce   = implode(', ', array_keys($riadok));
    $otazniky = implode(', ', array_fill(0, count($riadok), '?'));
    $pdo->prepare("INSERT INTO admin.livescore_log ($stlpce) VALUES ($otazniky)")
        ->execute(array_values($riadok));

    // 2) zaznam testu — z neho sa pocita uspesnost modelu
    $pdo->prepare(
        'INSERT INTO admin.livescore_model_test
            (competition_id, model_id, model_key, test_url, sport,
             run_id, score_text, teams_text,
             got_score, got_period, got_minute, passed,
             prompt_tokens, completion_tokens, total_tokens, cost_usd, took_ms,
             error, raw)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([
            $competitionId, $v['model_db_id'], mb_substr($v['model'], 0, 150),
            mb_substr($url, 0, 500), $sport !== null ? mb_substr($sport, 0, 30) : null,
            $runId, $v['score_text'], $v['teams_text'],
            $v['got_score']  ? 't' : 'f',
            $v['got_period'] ? 't' : 'f',
            $v['got_minute'] ? 't' : 'f',
            $v['passed']     ? 't' : 'f',
            $v['prompt_tokens'], $v['completion_tokens'], $v['total_tokens'],
            round($v['cost_usd'], 6), $v['took_ms'],
            $v['error'] !== null ? mb_substr($v['error'], 0, 1000) : null,
            $v['data'] !== null ? json_encode($v['data'], JSON_UNESCAPED_UNICODE) : null,
        ]);

    // 3) trvala prekazka model vyradi, docasna nie
    $trvala = ai_trvala_chyba($v['error']);
    if ($trvala !== null) {
        ai_vyrad_model($v['model'], $trvala);
    }

    ai_prepocitaj_uspesnost($v['model']);
}

// ------------------------------------------------------------
// Vyhodnoti zhodu modelov v ramci jedneho behu.
//
// Najde najcastejsie skore a oznaci modely, ktore ho vratili. Nie je to dokaz
// spravnosti — vacsina sa moze mylit — ale model osamote proti ostatnym je
// podozrivy a nema ist do produkcie.
//
// Vracia [najcastejsie_skore, kolko_modelov_sa_zhodlo, spolu_s_vysledkom].
// ------------------------------------------------------------
function ls_vyhodnot_zhodu(int $runId): array {
    $pdo = db();

    // --- 1) Zhoda na NAZVOCH TIMOV ---
    //
    // Nazvy su spolahlivejsi ukazovatel nez skore: skore sa moze zhodovat
    // nahodou (0:0 je bezne), nazvy timov nie. Model, ktory vrati uplne ine
    // timy, si vymyslel aj skore.
    $st = $pdo->prepare(
        "SELECT teams_text, COUNT(*) AS pocet
           FROM admin.livescore_model_test
          WHERE run_id = ? AND teams_text IS NOT NULL
          GROUP BY teams_text ORDER BY COUNT(*) DESC LIMIT 1");
    $st->execute([$runId]);
    $timy = $st->fetch();

    if ($timy) {
        $pdo->prepare(
            'UPDATE admin.livescore_model_test
                SET teams_agree = (teams_text = ?)
              WHERE run_id = ? AND teams_text IS NOT NULL')
            ->execute([$timy['teams_text'], $runId]);

        // Model, ktory si timy vymyslel, nemoze byt oznaceny ako uspesny —
        // aj keby vratil cisla v spravnom tvare.
        $pdo->prepare(
            'UPDATE admin.livescore_model_test
                SET passed = FALSE,
                    error = COALESCE(error, ?)
              WHERE run_id = ? AND teams_agree = FALSE')
            ->execute(['Model vrátil iné tímy než ostatné — pravdepodobne si údaje vymyslel', $runId]);
    }

    // --- 2) Zhoda na SKORE (len medzi tymi, co maju spravne timy) ---
    $st = $pdo->prepare(
        "SELECT score_text, COUNT(*) AS pocet
           FROM admin.livescore_model_test
          WHERE run_id = ? AND passed AND score_text IS NOT NULL
            AND (teams_agree IS NULL OR teams_agree)
          GROUP BY score_text ORDER BY COUNT(*) DESC, score_text LIMIT 1");
    $st->execute([$runId]);
    $vitaz = $st->fetch();

    if (!$vitaz) return [null, 0, 0, $timy['teams_text'] ?? null];

    $pdo->prepare(
        'UPDATE admin.livescore_model_test
            SET agrees = (score_text = ?)
          WHERE run_id = ? AND passed AND score_text IS NOT NULL')
        ->execute([$vitaz['score_text'], $runId]);

    $spolu = (int)$pdo->query(
        "SELECT COUNT(*) FROM admin.livescore_model_test
          WHERE run_id = " . (int)$runId . " AND passed AND score_text IS NOT NULL")
        ->fetchColumn();

    // --- 3) Prepocet uspesnosti v ciselniku ---
    //
    // Zhoda na timoch ma prednost: model, ktory halucinuje timy, je
    // nepouzitelny bez ohladu na to, ako casto trafi skore.
    $pdo->exec(
        "UPDATE admin.ai_models m SET
            agree_rate = s.podiel, updated_at = NOW()
         FROM (SELECT model_key,
                      ROUND(100.0 * COUNT(*) FILTER (WHERE agrees AND
                            (teams_agree IS NULL OR teams_agree)) / COUNT(*), 2) AS podiel
                 FROM admin.livescore_model_test
                WHERE agrees IS NOT NULL
                GROUP BY model_key) s
         WHERE m.model_id = s.model_key");

    return [$vitaz['score_text'], (int)$vitaz['pocet'], $spolu, $timy['teams_text'] ?? null];
}
