<?php
// POST /v1/admin/livescore-test — skusobne zistenie stavu zapasu z URL cez OpenRouter
// Telo: { "url": "https://www.flashscore.com/match/..." }
//
// Stranka sa stiahne na serveri a jej text sa posle modelu, ktory z neho vytiahne
// stav zapasu. Model je pouzity zamerne — vie sa zorientovat aj ked sa struktura
// stranky zmeni, na rozdiel od pevneho parsera.
require_auth(true);
if ($method !== 'POST') json_error('Method not allowed', 405);

$cfg = __DIR__ . '/../../config/openrouter.php';
if (!file_exists($cfg)) {
    json_error('Chýba api/config/openrouter.php — skopíruj openrouter.example.php a doplň kľúč', 500);
}
require_once $cfg;
if (!defined('OPENROUTER_KEY') || !str_starts_with(OPENROUTER_KEY, 'sk-or-')) {
    json_error('V openrouter.php nie je platný kľúč', 500);
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$url  = trim((string)($body['url'] ?? ''));

if ($url === '') json_error('Chýba URL', 400);
if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https://#i', $url)) {
    json_error('URL musí byť platná a začínať https://', 400);
}
// Server stahuje len z povolenych domen — inak by sa endpoint dal zneuzit
// na dopyty do vnutornej siete.
$host = strtolower(parse_url($url, PHP_URL_HOST) ?? '');
$allowed = ['flashscore.com', 'www.flashscore.com', 'flashscore.sk', 'www.flashscore.sk',
            'livescore.com', 'www.livescore.com'];
if (!in_array($host, $allowed, true)) {
    json_error('Povolené sú len adresy z flashscore.com alebo livescore.com', 400);
}

// 1. Stiahnut stranku
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
$curlErr = curl_error($ch);
curl_close($ch);

if ($html === false || $code >= 400) {
    json_error("Stránku sa nepodarilo stiahnuť (HTTP $code) $curlErr", 502);
}

// 2. Pripravit vstup pre model: text stranky + datove bloky, ktore nesu skore
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
if (preg_match('/window\.environment\s*=\s*(\{.{0,6000})/s', $html, $m)) {
    $extra .= "\n\nWINDOW.ENVIRONMENT (skratene):\n" . $m[1];
}

// Bezplatne modely maju mensie kontextove okno — vstup sa preto kráti.
// Datovy feed je hodnotnejsi nez text stranky, preto dostane vacsi priestor.
$input = mb_substr($text, 0, 5000) . mb_substr($extra, 0, 7000);

$prompt = <<<PROMPT
Si asistent, ktorý z obsahu športovej stránky vyčíta stav futbalového zápasu.

Vráť VÝHRADNE JSON bez akéhokoľvek komentára, v tomto tvare:
{
  "home_team": "názov domáceho tímu alebo null",
  "away_team": "názov hosťujúceho tímu alebo null",
  "started": true/false,
  "finished": true/false,
  "minute": číslo prebiehajúcej minúty alebo null,
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

OBSAH STRÁNKY:
$input
PROMPT;

// 3. Zavolat model
$payload = json_encode([
    'model' => defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : 'meta-llama/llama-3.3-70b-instruct:free',
    'messages' => [['role' => 'user', 'content' => $prompt]],
    'temperature' => 0,
    'max_tokens' => 900,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init(defined('OPENROUTER_URL') ? OPENROUTER_URL : 'https://openrouter.ai/api/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_TIMEOUT        => 60,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . OPENROUTER_KEY,
        'Content-Type: application/json',
        'HTTP-Referer: https://betclub.fellow.sk',
        'X-Title: BetClub livescore test',
    ],
]);
$aiResp = curl_exec($ch);
$aiCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$aiErr  = curl_error($ch);
curl_close($ch);

if ($aiResp === false) json_error('OpenRouter nedostupný: ' . $aiErr, 502);

$ai = json_decode($aiResp, true);
if ($aiCode !== 200) {
    $msg = $ai['error']['message'] ?? substr($aiResp, 0, 300);
    json_error("OpenRouter vrátil chybu (HTTP $aiCode): $msg", 502);
}

$content = $ai['choices'][0]['message']['content'] ?? '';
// Model niekedy obali JSON do ```json ... ```
if (preg_match('/\{.*\}/s', $content, $m)) $content = $m[0];
$parsed = json_decode($content, true);

json_ok([
    'url'        => $url,
    'http_code'  => $code,
    'model'      => $ai['model'] ?? (defined('OPENROUTER_MODEL') ? OPENROUTER_MODEL : '?'),
    'usage'      => $ai['usage'] ?? null,
    'data'       => $parsed,
    'raw'        => $parsed === null ? $content : null,
    'page_chars' => mb_strlen($text),
]);
