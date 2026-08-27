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
function livescore_bulk_input(array $games, array $wanted): array {
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
        $rows[] = implode('¬', $parts);
    }
    return ['input' => implode("\n", $rows), 'missing' => $missing, 'found' => count($rows)];
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
    "status": "Naplánovaný / 1. polčas / Polčas / 2. polčas / Predĺženie / Penalty / Koniec"
  }
]

Pravidlá:
- Skóre vráť ako čísla. Ak AG alebo AH chýba, daj null.
- Polčasové skóre ber z BC a BD. Ak tam nie sú, daj null — nedopočítavaj ho.
- started = true, ak AC nie je 1. finished = true, len ak AC je 3.
- Nikdy si nič nedomýšľaj a nepridávaj zápasy, ktoré v zozname nie sú.

ZÁPASY:
$rows
PROMPT;
}

// Zisti stav vsetkych sledovanych zapasov jednym volanim modelu.
function livescore_bulk_check(array $wantedIds, string $model): array {
    $feed = livescore_bulk_fetch();
    if (!$feed['ok']) return ['ok' => false, 'error' => $feed['error'], 'games' => []];

    $prep = livescore_bulk_input($feed['games'], $wantedIds);
    if ($prep['found'] === 0) {
        return ['ok' => true, 'games' => [], 'missing' => $prep['missing'],
                'note' => 'Žiadny zo sledovaných zápasov dnes vo feede nie je'];
    }

    $res = livescore_ask_model_raw(livescore_bulk_prompt($prep['input']), $model);
    if ($res['error'] !== null) return ['ok' => false, 'error' => $res['error'], 'games' => []];

    $data = $res['data'];
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Model nevrátil pole zápasov',
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
