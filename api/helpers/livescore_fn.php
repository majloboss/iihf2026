<?php
// Spolocna logika pre zistovanie stavu zapasu zo stranky cez OpenRouter.
// Pouzivaju ju livescore_test.php (jeden model) aj livescore_models.php (porovnanie).

// Server stahuje len z povolenych domen — inak by sa endpoint dal zneuzit
// na dopyty do vnutornej siete.
function livescore_check_url(string $url): void {
    if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https://#i', $url)) {
        json_error('URL musí byť platná a začínať https://', 400);
    }
    $host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
    $allowed = ['flashscore.com', 'www.flashscore.com', 'flashscore.sk', 'www.flashscore.sk',
                'livescore.com', 'www.livescore.com'];
    if (!in_array($host, $allowed, true)) {
        json_error('Povolené sú len adresy z flashscore.com alebo livescore.com', 400);
    }
}

// Flashscore drzi zive udaje mimo HTML — stranka si ich dotahuje samostatnym
// feedom podla id zapasu v URL (parameter mid alebo posledny segment cesty).
function livescore_match_id(string $url): ?string {
    $q = [];
    parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $q);
    if (!empty($q['mid']) && preg_match('/^[A-Za-z0-9]{6,12}$/', $q['mid'])) return $q['mid'];
    if (preg_match('#/match/[^?]*?([A-Za-z0-9]{8})/?(?:\?|$)#', $url, $m)) return $m[1];
    return null;
}

// Vrati surovy feed so skore a priebehom zapasu, alebo prazdny retazec.
function livescore_fetch_feed(string $matchId): string {
    $out = '';
    $feeds = [
        'STAV A SKORE' => 'dc_1_' . $matchId,      // DA stav, DE/DF skore, DG/DH polcas
        'PRIEBEH'      => 'df_sui_1_' . $matchId,  // goly, karty, striedania
    ];
    foreach ($feeds as $label => $path) {
        $ch = curl_init('https://local-global.flashscore.ninja/2/x/feed/' . $path);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 12,
            CURLOPT_HTTPHEADER     => ['x-fsign: SW9D1eZo'],
            CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($resp && $code === 200 && !str_contains($resp, '<html')) {
            $out .= "\n\n$label:\n" . mb_substr($resp, 0, 4000);
        }
    }
    return $out;
}

// Stiahne stranku a pripravi z nej vstup pre model.
function livescore_fetch_page(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
    ]);
    $html = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($html === false || $code >= 400) {
        json_error("Stránku sa nepodarilo stiahnuť (HTTP $code) $err", 502);
    }

    $text = preg_replace('#<script[^>]*>.*?</script>#is', ' ', $html);
    $text = preg_replace('#<style[^>]*>.*?</style>#is', ' ', $text);
    $text = preg_replace('#<[^>]+>#', ' ', $text);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = trim(preg_replace('/\s+/u', ' ', $text));

    // Flashscore drzi udaje v textovom feede (AA÷id¬AE÷domaci¬AG÷skore)
    // a v window.environment. Oboje modelu pomoze.
    $extra = '';
    if (preg_match_all('/[^~]*AA÷[^~]{0,1200}/', $html, $m)) {
        $extra .= "\n\nDATOVY FEED:\n" . implode("\n", array_slice($m[0], 0, 8));
    }
    if (preg_match('/window\.environment\s*=\s*(\{.{0,3000})/s', $html, $m)) {
        $extra .= "\n\nWINDOW.ENVIRONMENT (skratene):\n" . $m[1];
    }

    // Zive skore v HTML nie je — Flashscore si ho dotahuje samostatnym feedom.
    $mid = livescore_match_id($url);
    if ($mid !== null) {
        // Aktualny cas treba modelu dodat — z feedu ho nevycita.
        $extra .= "\n\n=== ZIVE UDAJE ZAPASU (id $mid) ==="
                . "\nAKTUALNY_CAS: " . time() . " (unixovy cas, " . gmdate('H:i:s') . " UTC)"
                . livescore_fetch_feed($mid);
    }

    return [
        'http_code' => $code,
        'chars'     => mb_strlen($text),
        'match_id'  => livescore_match_id($url),
        'input'     => mb_substr($text, 0, 3000) . mb_substr($extra, 0, 9000),
    ];
}

function livescore_prompt(string $input): string {
    return <<<PROMPT
Si asistent, ktorý z obsahu športovej stránky vyčíta stav futbalového zápasu.

Vráť VÝHRADNE JSON bez akéhokoľvek komentára, v tomto tvare:
{
  "home_team": "názov domáceho tímu alebo null",
  "away_team": "názov hosťujúceho tímu alebo null",
  "started": true/false,
  "finished": true/false,
  "minute": číslo prebiehajúcej minúty alebo null,
  "period": "1. polčas / 2. polčas / predĺženie / penalty / null",
  "status": "krátky stav: Naplánovaný / 1. polčas / Polčas / 2. polčas / Predĺženie / Penalty / Koniec / iné",
  "home_score": číslo alebo null,
  "away_score": číslo alebo null,
  "home_score_halftime": číslo alebo null,
  "away_score_halftime": číslo alebo null,
  "home_yellow_cards": číslo alebo null,
  "away_yellow_cards": číslo alebo null,
  "home_red_cards": číslo alebo null,
  "away_red_cards": číslo alebo null,
  "start_time": "dátum a čas začiatku, ak je uvedený, inak null",
  "competition": "názov súťaže alebo null",
  "notes": "čokoľvek podstatné, čo si našiel a nezmestilo sa vyššie, alebo null"
}

Pravidlá:
- Ak údaj na stránke nie je, daj null. Nikdy si nič nedomýšľaj.
- Skóre uvádzaj ako čísla, nie text.
- Vo feede Flashscore znamená AE domáci tím, AF hosťujúci, AG skóre domácich,
  AH skóre hostí, AB stav zápasu, AD čas začiatku.
- V sekcii ZIVE UDAJE ZAPASU (feed STAV A SKORE) platí:
  DE = góly domácich, DF = góly hostí (aktuálne skóre),
  DG = góly domácich za 1. polčas, DH = góly hostí za 1. polčas,
  DA = stav zápasu (1 = ešte nezačal, 2 = prebieha alebo skončil),
  DB = fáza (12 = 1. polčas, 13 = 2. polčas, 38 = polčasová prestávka,
       6 = predĺženie, 7 = penalty, 3 = koniec),
  DC = čas začiatku (unixový čas), DK = čas, od ktorého beží prebiehajúca časť.
  Ak je DE alebo DF vyplnené, zápas UŽ ZAČAL — started musí byť true.
- AKTUÁLNU MINÚTU vypočítaj z DK a hodnoty AKTUALNY_CAS uvedenej vyššie:
  minúta = (AKTUALNY_CAS − DK) / 60 zaokrúhlene nadol, a ak DB = 13, pripočítaj 45
  (druhý polčas sa počíta od 45. minúty). Nikdy neber minútu z gólov —
  tá hovorí, kedy padol gól, nie koľko sa práve hrá.
  Ak zápas skončil, minute daj null.
- V sekcii PRIEBEH sú udalosti: IB = minúta, IK = typ (Goal, Yellow Card,
  Red Card, Substitution), IF = hráč, IA = 1 pre domácich a 2 pre hostí.
  Karty spočítaj podľa IK a IA. Ak zápas beží a žiadna karta v PRIEBEHU nie je,
  daj 0, nie null — znamená to, že karta zatiaľ nepadla.

OBSAH STRÁNKY:
$input
PROMPT;
}

// Zavola model. Vracia data, surovu odpoved a pripadnu chybu — bez ukoncenia behu,
// aby sa dalo testovat viac modelov za sebou.
function livescore_ask_model(string $input, string $model): array {
    $payload = json_encode([
        'model'       => $model,
        'messages'    => [['role' => 'user', 'content' => livescore_prompt($input)]],
        'temperature' => 0,
        'max_tokens'  => 900,
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init(defined('OPENROUTER_URL') ? OPENROUTER_URL : 'https://openrouter.ai/api/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . OPENROUTER_KEY,
            'Content-Type: application/json',
            'HTTP-Referer: https://betclub.fellow.sk',
            'X-Title: BetClub livescore',
        ],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false) {
        return ['data' => null, 'content' => '', 'usage' => null, 'error' => 'Spojenie zlyhalo: ' . $err];
    }

    $ai = json_decode($resp, true);
    if ($code !== 200) {
        return ['data' => null, 'content' => '', 'usage' => null,
                'error' => $ai['error']['message'] ?? ('HTTP ' . $code)];
    }

    $content = $ai['choices'][0]['message']['content'] ?? '';
    // Model niekedy obali JSON do ```json ... ``` alebo pripoji komentar.
    if (preg_match('/\{.*\}/s', $content, $m)) $content = $m[0];

    return [
        'data'    => json_decode($content, true),
        'content' => $ai['choices'][0]['message']['content'] ?? '',
        'usage'   => $ai['usage'] ?? null,
        'error'   => null,
    ];
}
