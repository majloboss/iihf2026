<?php
// Hromadne zistovanie stavu zapasov z jedneho feedu Flashscore.
//
// Namiesto dvoch dopytov na kazdy zapas sa stiahne jeden feed s vsetkymi
// dnesnymi zapasmi. Z neho sa vyberu len sledovane, orezu sa na podstatne
// polia a posle sa to modelu naraz.
//
// Zataz na Flashscore je tak jeden dopyt za minutu bez ohladu na pocet zapasov.

require_once __DIR__ . '/livescore_fn.php';

const LIVESCORE_BULK_URL = 'https://local-global.flashscore.ninja/2/x/feed/f_1_0_3_en_1';

// Polia, ktore nesu stav zapasu. Ostatne (loga, kurzy, TV) sa zahadzuju.
const LIVESCORE_KEEP = ['AA', 'AE', 'AF', 'AG', 'AH', 'BC', 'BD', 'AB', 'AC', 'AD'];

// Stiahne hromadny feed a vrati zapasy indexovane podla id (AA).
function livescore_bulk_fetch(): array {
    $ch = curl_init(LIVESCORE_BULK_URL);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['x-fsign: SW9D1eZo'],
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $code !== 200) {
        return ['ok' => false, 'error' => "Feed sa nepodarilo stiahnuť (HTTP $code) $err", 'games' => []];
    }

    $games = [];
    foreach (explode('~', $raw) as $chunk) {
        if (!str_contains($chunk, 'AA÷')) continue;
        $f = livescore_parse_feed($chunk);
        if (!empty($f['AA'])) $games[$f['AA']] = $f;
    }
    return ['ok' => true, 'error' => null, 'games' => $games, 'total' => count($games)];
}

// Zostavi z vybranych zapasov kratky vstup pre model.
// $wanted je pole id zapasov (AA) — zvycajne z flashscore_url v DB.
function livescore_bulk_input(array $games, array $wanted, bool $withDetails = false): array {
    $rows = [];
    $missing = [];
    foreach ($wanted as $id) {
        if (!isset($games[$id])) { $missing[] = $id; continue; }
        $f = $games[$id];
        $parts = [];
        foreach (LIVESCORE_KEEP as $k) {
            if (isset($f[$k]) && $f[$k] !== '') $parts[] = $k . '÷' . $f[$k];
        }
        // Minutu spocita server — model ju uz len prevezme.
        $m = livescore_minute(['DB' => $f['AC'] ?? null, 'DC' => $f['AD'] ?? null,
                               'DD' => $f['AD'] ?? null]);
        $parts[] = 'MINUTA÷' . ($m['minute'] === null ? 'null' : $m['minute']);
        if ($m['note'] !== null) $parts[] = 'POZNAMKA÷' . $m['note'];
        $row = implode('¬', $parts);

        // Priebeh zapasu (goly, karty) je len v detailnom feede a vracia cely
        // zoznam od zaciatku. Stahuje sa preto len ked sa nieco zmenilo —
        // pri nezmenenom zapase by dal ten isty obsah znova.
        if ($withDetails && ($f['AC'] ?? '1') !== '1' && livescore_needs_detail($id, $f)) {
            $detail = livescore_fetch_events($id);
            if ($detail !== '') $row .= "\n  UDALOSTI: " . $detail;
        }
        $rows[] = $row;
    }
    return ['input' => implode("\n", $rows), 'missing' => $missing, 'found' => count($rows)];
}

// Rozhodne, ci sa oplati stiahnut detailny feed. Porovnava skore a stav
// s predchadzajucim volanim — pri nezmenenom zapase by detail dal to iste.
function livescore_needs_detail(string $id, array $f): bool {
    static $last = null;
    $file = sys_get_temp_dir() . '/livescore_state.json';

    if ($last === null) {
        $raw  = @file_get_contents($file);
        $last = $raw ? (json_decode($raw, true) ?: []) : [];
    }

    $now = ($f['AG'] ?? '') . ':' . ($f['AH'] ?? '') . '|' . ($f['AC'] ?? '');
    $changed = !isset($last[$id]) || $last[$id] !== $now;
    if ($changed) {
        $last[$id] = $now;
        @file_put_contents($file, json_encode($last));
    }
    return $changed;
}

// Priebeh jedneho zapasu — goly a karty. Skrateny na podstatne polia.
function livescore_fetch_events(string $matchId): string {
    $ch = curl_init('https://local-global.flashscore.ninja/2/x/feed/df_sui_1_' . $matchId);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => ['x-fsign: SW9D1eZo'],
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!$raw || $code !== 200 || str_contains($raw, '<html')) return '';

    // Z kazdej udalosti staci strana, minuta, typ a hrac.
    $out = [];
    foreach (explode('~', $raw) as $chunk) {
        if (!str_contains($chunk, 'IK÷')) continue;
        $e = livescore_parse_feed($chunk);
        $type = $e['IK'] ?? '';
        if (!preg_match('/goal|card/i', $type)) continue;
        $out[] = ($e['IA'] ?? '?') . '|' . ($e['IB'] ?? '?') . '|' . $type . '|' . ($e['IF'] ?? '');
    }
    return implode(' ; ', array_slice($out, 0, 40));
}

function livescore_bulk_prompt(string $rows): string {
    return <<<PROMPT
Z feedu Flashscore vyčítaj stav každého zápasu. Každý riadok je jeden zápas.

Význam polí:
  AA = identifikátor zápasu (vráť ho v poli "id")
  AE = domáci tím, AF = hosťujúci tím
  AG = góly domácich, AH = góly hostí
  BC = góly domácich po 1. polčase, BD = góly hostí po 1. polčase
  AC = stav: 1 nezačal, 12 prvý polčas, 38 polčasová prestávka,
       13 druhý polčas, 6 predĺženie, 7 penalty, 3 koniec
  AD = čas začiatku (unixový)
  MINUTA = už vypočítaná minúta, len ju opíš (null znamená null)
  POZNAMKA = doplnok k minúte (prestávka, penalty), inak sa neuvádza
  UDALOSTI = priebeh zápasu, jedna udalosť má tvar
             strana|minúta|typ|hráč, oddelené bodkočiarkou.
             Strana 1 = domáci, 2 = hostia.
             Typ Goal, Own Goal, Penalty, Yellow Card, Red Card.

Vráť VÝHRADNE JSON pole, jeden objekt na zápas, bez komentárov:
[
  {
    "id": "AA hodnota",
    "home_team": "…", "away_team": "…",
    "home_score": číslo alebo null,
    "away_score": číslo alebo null,
    "home_score_halftime": číslo alebo null,
    "away_score_halftime": číslo alebo null,
    "started": true/false,
    "finished": true/false,
    "minute": číslo alebo null,
    "minute_note": "text alebo null",
    "status": "Naplánovaný / 1. polčas / Polčas / 2. polčas / Predĺženie / Penalty / Koniec",
    "home_yellow_cards": číslo alebo null,
    "away_yellow_cards": číslo alebo null,
    "home_red_cards": číslo alebo null,
    "away_red_cards": číslo alebo null,
    "notes": "strelci gólov s minútami, prípadne karty; ak UDALOSTI nie sú, daj null"
  }
]

Pravidlá:
- Skóre vráť ako čísla. Ak AG alebo AH chýba, daj null.
- Polčasové skóre ber z BC a BD. Ak tam nie sú, daj null — nedopočítavaj ho.
- started = true, ak AC nie je 1. finished = true, len ak AC je 3.
- Karty spočítaj z UDALOSTI podľa typu a strany. Ak sú UDALOSTI uvedené,
  ale karta v nich nie je, daj 0. Ak UDALOSTI pri zápase vôbec nie sú,
  daj null — znamená to, že sa od minula nič nezmenilo, nie že karty nie sú.
- Do notes napíš strelcov s minútami, prípadne kto dostal kartu. Stručne.
  Ak UDALOSTI nie sú uvedené, daj do notes null.
- Nikdy si nič nedomýšľaj a nepridávaj zápasy, ktoré v zozname nie sú.

ZÁPASY:
$rows
PROMPT;
}

// Zisti stav vsetkych sledovanych zapasov jednym volanim modelu.
function livescore_bulk_check(array $wantedIds, string $model): array {
    $feed = livescore_bulk_fetch();
    if (!$feed['ok']) return ['ok' => false, 'error' => $feed['error'], 'games' => []];

    // Detaily sa dotahuju len pre sledovane zapasy, nie pre cely feed.
    $prep = livescore_bulk_input($feed['games'], $wantedIds, true);
    if ($prep['found'] === 0) {
        return ['ok' => true, 'games' => [], 'missing' => $prep['missing'],
                'note' => 'Žiadny zo sledovaných zápasov dnes vo feede nie je'];
    }

    // Odpoved rastie s poctom zapasov — jeden zabera zhruba 160 tokenov.
    $maxTokens = min(400 + $prep['found'] * 200, 8000);
    $res = livescore_ask_model_raw(livescore_bulk_prompt($prep['input']), $model, $maxTokens);
    if ($res['error'] !== null) return ['ok' => false, 'error' => $res['error'], 'games' => []];

    $data = $res['data'];
    if (!is_array($data)) {
        // Najcastejsia pricina je orezana odpoved — hlaska to ma povedat.
        $hint = str_ends_with(trim($res['content']), '}') ? '' : ' (odpoveď vyzerá nedokončene)';
        return ['ok' => false,
                'error' => 'Model nevrátil pole zápasov' . $hint,
                'raw' => mb_substr($res['content'], 0, 400), 'games' => []];
    }

    // Indexovanie podla id, aby sa vysledok dal priradit k zapasu v DB.
    $out = [];
    foreach ($data as $g) {
        if (is_array($g) && !empty($g['id'])) $out[$g['id']] = $g;
    }
    return ['ok' => true, 'error' => null, 'games' => $out,
            'missing' => $prep['missing'], 'total_feed' => $feed['total'],
            'usage' => $res['usage']];
}
