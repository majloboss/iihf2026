<?php
// Praca s ciselnikom modelov admin.ai_models.
//
// Ceny sa tahaju zivo z OpenRoutera — ktore modely su bezplatne a za kolko
// sa v case meni (minimax-m3 prestal byt free 8.9.2026).

// ------------------------------------------------------------
// Zosynchronizuje ciselnik s aktualnym cennikom OpenRoutera.
// Vracia [pridanych, aktualizovanych].
// ------------------------------------------------------------
function ai_sync_cennik(): array {
    $ch = curl_init('https://openrouter.ai/api/v1/models');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . OPENROUTER_KEY],
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code !== 200 || !$resp) {
        throw new RuntimeException("Cenník sa nepodarilo načítať (HTTP $code)");
    }

    $pdo = db();
    $st = $pdo->prepare(
        "INSERT INTO admin.ai_models
            (provider, model_id, name, is_free, price_input_1m, price_output_1m,
             context_length, updated_at)
         VALUES ('openrouter', ?, ?, ?, ?, ?, ?, NOW())
         ON CONFLICT (model_id) DO UPDATE SET
            name            = EXCLUDED.name,
            is_free         = EXCLUDED.is_free,
            price_input_1m  = EXCLUDED.price_input_1m,
            price_output_1m = EXCLUDED.price_output_1m,
            context_length  = EXCLUDED.context_length,
            updated_at      = NOW()
         RETURNING (xmax = 0) AS pridany");

    $pridanych = 0;
    $aktualiz  = 0;
    $videne    = [];   // model_id, ktore cennik prave vratil

    foreach (json_decode($resp, true)['data'] ?? [] as $m) {
        $id = $m['id'] ?? '';
        if ($id === '') continue;

        // Varianty ako :batch a -image na livescore nepotrebujeme
        // a cennik by len zahltili.
        if (str_contains($id, ':batch') || str_contains($id, '-image')) continue;

        // Do vyberu patria len modely, ktore vracaju VYLUCNE text.
        //
        // Hudobne a obrazkove modely (lyria, veo) maju v zozname modalit aj
        // 'text', ale za tokeny nic nestoja — plati sa za sekundy zvuku alebo
        // za obrazok. V poradi podla ceny by tak vysli ako najlacnejsie
        // a automaticky vyber by siahol po nich.
        $vystupy = $m['architecture']['output_modalities'] ?? ['text'];
        if ($vystupy !== ['text']) continue;

        $p = $m['pricing'] ?? [];
        // OpenRouter uvadza cenu za JEDEN token, my drzime za milion.
        //
        // Zaporna hodnota znamena "cena podla skutocne pouziteho modelu"
        // (openrouter/auto). Taku cenu nevieme dopredu, uklada sa NULL —
        // inak by -1 po vynasobeni milionom pretiekol stlpec.
        $cena = static function ($v): ?float {
            if ($v === null) return null;
            $f = (float)$v;
            return $f < 0 ? null : $f * 1000000;
        };
        $vstup  = $cena($p['prompt']     ?? null);
        $vystup = $cena($p['completion'] ?? null);

        $st->execute([
            $id,
            mb_substr($m['name'] ?? $id, 0, 200),
            str_ends_with($id, ':free') ? 't' : 'f',
            $vstup, $vystup,
            $m['context_length'] ?? null,
        ]);

        if ($st->fetchColumn()) $pridanych++; else $aktualiz++;
        $videne[] = $id;
    }

    // Modely, ktore z cennika zmizli, sa nemazu — log na ne moze odkazovat.
    // Iba sa vyradia z automatickeho vyberu.
    //
    // Porovnava sa proti zoznamu prave videnych modelov, nie proti casu:
    // kontrola cez updated_at by pri prvom behu vyradila vsetko naraz.
    if ($videne) {
        $otazniky = implode(',', array_fill(0, count($videne), '?'));
        $pdo->prepare(
            "UPDATE admin.ai_models
                SET is_enabled = FALSE,
                    unavailable_reason = 'Model už nie je v cenníku OpenRoutera',
                    updated_at = NOW()
              WHERE provider = 'openrouter'
                AND is_enabled
                AND unavailable_reason IS NULL
                AND model_id NOT IN ($otazniky)")->execute($videne);
    }

    return [$pridanych, $aktualiz];
}

// ------------------------------------------------------------
// Cena volania v USD podla ceny modelu v case volania.
// ------------------------------------------------------------
function ai_cena_volania(array $model, ?int $vstup, ?int $vystup): float {
    $cv = (float)($model['price_input_1m']  ?? 0);
    $cy = (float)($model['price_output_1m'] ?? 0);
    return ($vstup ?? 0) / 1000000 * $cv + ($vystup ?? 0) / 1000000 * $cy;
}

// ------------------------------------------------------------
// Poradie modelov pre automaticky vyber.
//
// Najprv bezplatne podla doterajsej uspesnosti, potom platene od
// najlacnejsieho. Netestovane bezplatne modely idu za otestovanymi —
// zname fungujuce ma prednost pred neznamym.
// ------------------------------------------------------------
function ai_kandidati(int $limit = 10): array {
    // Platene modely s neznamou cenou (NULL) sa preskakuju — do rozpoctu
    // sa neda zaratat nieco, co nevieme vycislit.
    return db()->query(
        "SELECT * FROM admin.ai_models
          WHERE is_enabled AND unavailable_reason IS NULL
            AND (is_free OR (price_input_1m IS NOT NULL AND price_output_1m IS NOT NULL))
          ORDER BY is_free DESC,
                   CASE WHEN is_free THEN COALESCE(success_rate, -1) END DESC,
                   COALESCE(price_input_1m, 0) + COALESCE(price_output_1m, 0) ASC
          LIMIT " . (int)$limit)->fetchAll();
}

// Najlacnejsi funkcny model — pouzije sa pri prekroceni 80 % denneho stropu.
function ai_najlacnejsi(): ?array {
    $r = db()->query(
        "SELECT * FROM admin.ai_models
          WHERE is_enabled AND unavailable_reason IS NULL
            AND (success_rate IS NULL OR success_rate > 0)
            AND (is_free OR (price_input_1m IS NOT NULL AND price_output_1m IS NOT NULL))
          ORDER BY is_free DESC,
                   COALESCE(price_input_1m, 0) + COALESCE(price_output_1m, 0) ASC
          LIMIT 1")->fetch();
    return $r ?: null;
}

// ------------------------------------------------------------
// Prepocita uspesnost modelu z historie testov.
// ------------------------------------------------------------
function ai_prepocitaj_uspesnost(string $modelKey): void {
    db()->prepare(
        "UPDATE admin.ai_models m SET
            tests_total  = s.spolu,
            tests_ok     = s.ok,
            success_rate = CASE WHEN s.spolu > 0
                                THEN ROUND(100.0 * s.ok / s.spolu, 2) END,
            avg_tokens   = s.tokeny,
            avg_ms       = s.ms,
            last_tested_at = s.posledny,
            updated_at   = NOW()
         FROM (SELECT COUNT(*) AS spolu,
                      COUNT(*) FILTER (WHERE passed) AS ok,
                      ROUND(AVG(total_tokens))::INT AS tokeny,
                      ROUND(AVG(took_ms))::INT AS ms,
                      MAX(tested_at) AS posledny
                 FROM admin.livescore_model_test
                WHERE model_key = ?) s
         WHERE m.model_id = ?")->execute([$modelKey, $modelKey]);
}

// ------------------------------------------------------------
// Je chyba trvala, teda nema zmysel model skusat znova?
//
// Docasne prekazky maju prednost: pri vycerpanom limite vracaju
// poskytovatelia hlasky, ktore inak vyzeraju ako trvale zlyhanie.
// ------------------------------------------------------------
function ai_trvala_chyba(?string $chyba): ?string {
    if ($chyba === null || $chyba === '') return null;
    $c = mb_strtolower($chyba);

    foreach (['rate limit', 'rate-limited', 'temporarily', 'overloaded',
              'try again', 'retry', 'timeout', 'resourceexhausted'] as $docasne) {
        if (str_contains($c, $docasne)) return null;
    }

    $trvale = [
        'agentic harness'       => 'Dostupný len agentickým nástrojom, nie cez API',
        'no endpoints found'    => 'Model nemá dostupný endpoint',
        'is not a valid model'  => 'Model už neexistuje',
        'unavailable for free'  => 'Model už nie je bezplatný',
        'requires more credits' => 'Model vyžaduje kredit',
        'data policy'           => 'Blokuje nastavenie ochrany údajov na účte',
    ];
    foreach ($trvale as $vzor => $popis) {
        if (str_contains($c, $vzor)) return $popis;
    }
    return null;
}

// Oznaci model za trvalo nepouzitelny.
function ai_vyrad_model(string $modelKey, string $dovod): void {
    db()->prepare(
        'UPDATE admin.ai_models
            SET is_enabled = FALSE, unavailable_reason = ?, last_error = ?, updated_at = NOW()
          WHERE model_id = ?')->execute([$dovod, $dovod, $modelKey]);
}
