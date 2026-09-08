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

// ------------------------------------------------------------
// Ktory model ma dnes obsluhovat livescore danej sutaze.
//
// Poradie hladania:
//   1. nastavenie pre konkretny den (admin.livescore_day_config)
//   2. predvoleny model sutaze (admin.livescore_competition_default)
//   3. konstanta OPENROUTER_MODEL z konfiguraku
//   4. natvrdo minimax/minimax-m3
//
// Vracia [model_id, riadok_z_ciselnika|null, dovod].
// Ked je livescore pre dany den vypnuty, model_id je null.
// ------------------------------------------------------------
function ai_model_pre_livescore(int $competitionId, ?string $den = null): array {
    $pdo = db();
    $den = $den ?? date('Y-m-d');

    // 1) nastavenie na den — vratane pripadneho vypnutia
    $st = $pdo->prepare(
        'SELECT d.is_enabled, d.disabled_reason, d.chosen_by, m.*
           FROM admin.livescore_day_config d
           LEFT JOIN admin.ai_models m ON m.id = d.model_id
          WHERE d.competition_id = ? AND d.den = ?');
    $st->execute([$competitionId, $den]);
    $den_cfg = $st->fetch();

    if ($den_cfg) {
        $zapnute = in_array($den_cfg['is_enabled'], [true, 't', '1', 1], true);
        if (!$zapnute) {
            return [null, null, 'Livescore je pre dnešok vypnuté: '
                              . ($den_cfg['disabled_reason'] ?: 'bez uvedeného dôvodu')];
        }
        if (!empty($den_cfg['model_id'])) {
            return [$den_cfg['model_id'], $den_cfg,
                    'nastavenie na deň (' . $den_cfg['chosen_by'] . ')'];
        }
    }

    // Poradie nahradnych modelov. Berie sa ten, na ktorom sme prave skoncili —
    // po prepnuti sa tak livescore nevracia k modelu, ktory uz zlyhal.
    $poradie = ai_poradie($competitionId);
    if ($poradie) {
        $index = max(1, (int)($den_cfg['poradie_index'] ?? 1));
        $model = $poradie[min($index, count($poradie)) - 1];
        return [$model['model_id'], $model,
                sprintf('poradie %d z %d', $index, count($poradie))];
    }

    // 2) predvoleny model sutaze
    $st = $pdo->prepare(
        'SELECT c.is_enabled, m.*
           FROM admin.livescore_competition_default c
           LEFT JOIN admin.ai_models m ON m.id = c.model_id
          WHERE c.competition_id = ?');
    $st->execute([$competitionId]);
    $sutaz_cfg = $st->fetch();

    if ($sutaz_cfg) {
        $zapnute = in_array($sutaz_cfg['is_enabled'], [true, 't', '1', 1], true);
        if (!$zapnute) {
            return [null, null, 'Livescore je pre túto súťaž vypnuté'];
        }
        if (!empty($sutaz_cfg['model_id'])) {
            return [$sutaz_cfg['model_id'], $sutaz_cfg, 'predvolený model súťaže'];
        }
    }

    // 3) konfigurak — zaloha, kym sa model v ciselniku nenastavi
    if (defined('OPENROUTER_MODEL') && OPENROUTER_MODEL !== '') {
        $st = $pdo->prepare('SELECT * FROM admin.ai_models WHERE model_id = ?');
        $st->execute([OPENROUTER_MODEL]);
        return [OPENROUTER_MODEL, $st->fetch() ?: null, 'konfigurák openrouter.php'];
    }

    return ['minimax/minimax-m3', null, 'zabudovaná predvoľba'];
}

// ------------------------------------------------------------
// Nastavi model pre sutaz a den. Pouziva ho admin aj automaticky vyber.
// ------------------------------------------------------------
function ai_nastav_model_na_den(int $competitionId, int $modelDbId, string $chosenBy,
                                ?int $userId = null, ?string $den = null): void {
    db()->prepare(
        "INSERT INTO admin.livescore_day_config
            (competition_id, den, model_id, chosen_by, chosen_by_user_id, chosen_at, is_enabled)
         VALUES (?, ?, ?, ?, ?, NOW(), TRUE)
         ON CONFLICT (competition_id, den) DO UPDATE
            SET model_id = EXCLUDED.model_id,
                chosen_by = EXCLUDED.chosen_by,
                chosen_by_user_id = EXCLUDED.chosen_by_user_id,
                chosen_at = NOW(),
                is_enabled = TRUE,
                disabled_reason = NULL")
        ->execute([$competitionId, $den ?? date('Y-m-d'), $modelDbId, $chosenBy, $userId]);
}

// Vypne livescore pre sutaz a den.
function ai_vypni_livescore(int $competitionId, string $dovod,
                            ?int $userId = null, ?string $den = null): void {
    db()->prepare(
        "INSERT INTO admin.livescore_day_config
            (competition_id, den, is_enabled, disabled_reason, chosen_by,
             chosen_by_user_id, chosen_at)
         VALUES (?, ?, FALSE, ?, 'admin', ?, NOW())
         ON CONFLICT (competition_id, den) DO UPDATE
            SET is_enabled = FALSE,
                disabled_reason = EXCLUDED.disabled_reason,
                chosen_by_user_id = EXCLUDED.chosen_by_user_id,
                chosen_at = NOW()")
        ->execute([$competitionId, $den ?? date('Y-m-d'), $dovod, $userId]);
}

// ------------------------------------------------------------
// Strazi denny strop nakladov.
//
// Vola sa po kazdom ostrom volani livescore. Podla vyuzitia stropu:
//   80 %  prepne na najlacnejsi funkcny model — zapas dobehne lacnejsie
//         namiesto toho, aby livescore zhaslo uprostred
//   150 % zastavi livescore pre dany den
//
// Obe hranice posielaju spravu adminovi, kazdu najviac raz za den.
// Vracia zoznam vykonanych zasahov (prazdny, ked sa nic nedialo).
// ------------------------------------------------------------
function ai_straz_rozpocet(int $competitionId, ?string $den = null): array {
    $pdo = db();
    $den = $den ?? date('Y-m-d');
    $zasahy = [];

    // Kolko sa dnes minulo — len ostre volania
    $st = $pdo->prepare(
        "SELECT COALESCE(SUM(cost_usd), 0) FROM admin.livescore_log
          WHERE call_type = 'live' AND competition_id = ? AND checked_at::date = ?::date");
    $st->execute([$competitionId, $den]);
    $minute = (float)$st->fetchColumn();

    $st = $pdo->prepare(
        'SELECT d.daily_budget_usd, d.warned_80_at, d.stopped_150_at, d.model_id,
                m.model_id AS model_key
           FROM admin.livescore_day_config d
           LEFT JOIN admin.ai_models m ON m.id = d.model_id
          WHERE d.competition_id = ? AND d.den = ?');
    $st->execute([$competitionId, $den]);
    $cfg = $st->fetch();

    if (!$cfg) {
        $st = $pdo->prepare(
            'SELECT daily_budget_usd FROM admin.livescore_competition_default
              WHERE competition_id = ?');
        $st->execute([$competitionId]);
        $cfg = ['daily_budget_usd' => $st->fetchColumn() ?: 1.0,
                'warned_80_at' => null, 'stopped_150_at' => null,
                'model_id' => null, 'model_key' => null];
    }

    $strop = (float)($cfg['daily_budget_usd'] ?: 1.0);
    if ($strop <= 0) return $zasahy;

    $podiel = $minute / $strop;

    // --- 150 %: zastavit ---
    if ($podiel >= 1.5 && empty($cfg['stopped_150_at'])) {
        $dovod = sprintf('Prekročený denný strop: minuté $%.4f z $%.2f (%.0f %%)',
                         $minute, $strop, $podiel * 100);
        ai_vypni_livescore($competitionId, $dovod, null, $den);
        $pdo->prepare(
            'UPDATE admin.livescore_day_config SET stopped_150_at = NOW()
              WHERE competition_id = ? AND den = ?')->execute([$competitionId, $den]);

        ai_uvedom_admina_rozpocet('Livescore zastavené — prekročený strop',
            "$dovod

Livescore je pre dnešok vypnuté. V Správa → Livescore → Model "
          . "sa dá znova zapnúť alebo zvýšiť denný strop.");

        $zasahy[] = ['typ' => 'zastavene', 'minute' => $minute, 'strop' => $strop];
        return $zasahy;
    }

    // --- 80 %: prepnut na najlacnejsi ---
    if ($podiel >= 0.8 && empty($cfg['warned_80_at'])) {
        $lacny = ai_najlacnejsi();

        if ($lacny && $lacny['model_id'] !== ($cfg['model_key'] ?? null)) {
            ai_nastav_model_na_den($competitionId, (int)$lacny['id'], 'budget', null, $den);
            $sprava = sprintf(
                'Minuté $%.4f z denného stropu $%.2f (%.0f %%). Livescore prepnuté '
              . 'na najlacnejší funkčný model %s, aby zápas dobehol.',
                $minute, $strop, $podiel * 100, $lacny['model_id']);
            $zasahy[] = ['typ' => 'prepnute', 'model' => $lacny['model_id'],
                         'minute' => $minute, 'strop' => $strop];
        } else {
            $sprava = sprintf(
                'Minuté $%.4f z denného stropu $%.2f (%.0f %%). Lacnejší model '
              . 'sa nenašiel — pri 150 %% sa livescore zastaví.',
                $minute, $strop, $podiel * 100);
            $zasahy[] = ['typ' => 'upozornenie', 'minute' => $minute, 'strop' => $strop];
        }

        $pdo->prepare(
            "INSERT INTO admin.livescore_day_config (competition_id, den, warned_80_at)
             VALUES (?, ?, NOW())
             ON CONFLICT (competition_id, den) DO UPDATE SET warned_80_at = NOW()")
            ->execute([$competitionId, $den]);

        ai_uvedom_admina_rozpocet('Livescore sa blíži k dennému stropu', $sprava);
    }

    return $zasahy;
}

// Sprava adminom o rozpocte. Nefunkcna posta nesmie zhodit livescore.
function ai_uvedom_admina_rozpocet(string $predmet, string $telo): void {
    try {
        if (!function_exists('send_mail_logged')) {
            $m = __DIR__ . '/mailer.php';
            if (file_exists($m)) require_once $m; else return;
        }
        $pdo = db();
        $st = $pdo->query(
            "SELECT email FROM admin.users
              WHERE role = 'admin' AND is_active AND email IS NOT NULL AND email <> ''");
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $email) {
            send_mail_logged($pdo, $email, $predmet, nl2br(htmlspecialchars($telo)));
        }
    } catch (Throwable $e) {
        error_log('rozpocet livescore: notifikacia zlyhala - ' . $e->getMessage());
    }
}

// ------------------------------------------------------------
// Vyber davky modelov na testovanie.
//
// Testovat vsetkych 338 nema zmysel: trvalo by to okolo 95 minut a vacsina
// modelov je pre livescore aj tak nevhodna (drahe, maly kontext). Tato
// funkcia vyberie rozumnu davku podla zvoleneho kriteria.
//
// $davka:
//   'free'        len bezplatne
//   'lacne'       bezplatne + platene do 0,50 USD za 1M tokenov
//   'stredne'     bezplatne + platene do 2 USD za 1M
//   'netestovane' este netestovane (doplnenie historie)
//   'najlepsie'   uz otestovane s najvyssou zhodou (overenie vitazov)
//   'vsetky'      cely zoznam (pozor na cas)
//
// Kontext pod 16 000 tokenov sa vzdy vynecha — livescore posiela okolo
// 6 500 znakov a kratsi kontext by odpoved orezal.
// ------------------------------------------------------------
function ai_davka_na_test(string $davka, int $limit = 30): array {
    $kde = ["is_enabled", "unavailable_reason IS NULL",
            "(context_length IS NULL OR context_length >= 16000)"];
    $radenie = "is_free DESC, COALESCE(price_input_1m,0) + COALESCE(price_output_1m,0) ASC";

    switch ($davka) {
        case 'free':
            $kde[] = "is_free";
            break;

        case 'lacne':
            $kde[] = "(is_free OR (price_input_1m IS NOT NULL
                       AND price_input_1m + price_output_1m <= 0.5))";
            break;

        case 'stredne':
            $kde[] = "(is_free OR (price_input_1m IS NOT NULL
                       AND price_input_1m + price_output_1m <= 2))";
            break;

        case 'netestovane':
            $kde[] = "tests_total = 0";
            $kde[] = "(is_free OR (price_input_1m IS NOT NULL
                       AND price_input_1m + price_output_1m <= 2))";
            break;

        case 'najlepsie':
            // Uz otestovane, bez halucinacii, zoradene podla zhody —
            // sluzi na overenie, ci vitazi obstoja aj na inom zapase.
            $kde[] = "tests_total > 0";
            $kde[] = "NOT EXISTS (SELECT 1 FROM admin.livescore_model_test t
                                   WHERE t.model_key = admin.ai_models.model_id
                                     AND t.teams_agree = FALSE)";
            $radenie = "COALESCE(agree_rate, -1) DESC, COALESCE(success_rate, -1) DESC,
                        COALESCE(price_input_1m,0) + COALESCE(price_output_1m,0) ASC";
            break;

        default:  // 'vsetky'
            $kde[] = "(is_free OR (price_input_1m IS NOT NULL AND price_output_1m IS NOT NULL))";
    }

    return db()->query(
        "SELECT * FROM admin.ai_models
          WHERE " . implode(' AND ', $kde) . "
          ORDER BY $radenie
          LIMIT " . (int)$limit)->fetchAll();
}

// Kolko modelov by dana davka mala — pre odhad casu pred spustenim.
function ai_pocet_v_davke(string $davka): int {
    return count(ai_davka_na_test($davka, 1000));
}

// ------------------------------------------------------------
// Poradie nahradnych modelov pre sutaz.
//
// Vracia zoznam v poradi, v akom sa maju skusat. Prazdny zoznam znamena,
// ze poradie nie je nastavene — vtedy plati jediny model z day_config.
// ------------------------------------------------------------
function ai_poradie(int $competitionId): array {
    $st = db()->prepare(
        'SELECT p.poradie, m.*
           FROM admin.livescore_poradie p
           JOIN admin.ai_models m ON m.id = p.model_id
          WHERE p.competition_id = ? AND p.is_enabled
            AND m.is_enabled AND m.unavailable_reason IS NULL
          ORDER BY p.poradie');
    $st->execute([$competitionId]);
    return $st->fetchAll();
}

// ------------------------------------------------------------
// Zaznamena vysledok volania a v pripade opakovanych zlyhani prepne
// na dalsi model v poradi.
//
// Prepina sa az po TROCH zlyhaniach za sebou — jedno zlyhanie moze byt
// vypadok siete a striedat model pri kazdom zakolisani by bolo horsie
// nez chvilu pockat.
//
// Vracia popis prepnutia, alebo null ked sa nic nemenilo.
// ------------------------------------------------------------
function ai_po_volani(int $competitionId, bool $uspech, ?string $chyba = null): ?string {
    $pdo = db();
    $den = date('Y-m-d');

    if ($uspech) {
        // Uspech vynuluje pocitadlo — tri zlyhania musia byt za sebou.
        $pdo->prepare(
            'UPDATE admin.livescore_day_config SET fails_in_row = 0
              WHERE competition_id = ? AND den = ? AND fails_in_row > 0')
            ->execute([$competitionId, $den]);
        return null;
    }

    // Trvala prekazka vyradi model z ciselnika hned, netreba cakat na tri.
    $trvala = ai_trvala_chyba($chyba);

    $st = $pdo->prepare(
        "INSERT INTO admin.livescore_day_config (competition_id, den, fails_in_row)
         VALUES (?, ?, 1)
         ON CONFLICT (competition_id, den) DO UPDATE
            SET fails_in_row = admin.livescore_day_config.fails_in_row + 1
         RETURNING fails_in_row, poradie_index");
    $st->execute([$competitionId, $den]);
    $stav = $st->fetch();

    $zlyhani = (int)$stav['fails_in_row'];
    if ($trvala === null && $zlyhani < 3) return null;

    // --- prepnutie na dalsi model v poradi ---
    $poradie = ai_poradie($competitionId);
    if (!$poradie) return null;

    $terajsi = (int)$stav['poradie_index'];

    if ($trvala !== null) {
        [$model] = ai_model_pre_livescore($competitionId, $den);
        if ($model !== null) ai_vyrad_model($model, $trvala);
    }

    // Dalsi v poradi. Ked sme na konci, livescore sa vypne — vsetky modely
    // zlyhali a hadzat nespravne skore je horsie nez ziadne.
    $dalsi = $terajsi + 1;
    if ($dalsi > count($poradie)) {
        $dovod = 'Zlyhali všetky modely z poradia (' . count($poradie) . ')';
        ai_vypni_livescore($competitionId, $dovod, null, $den);
        ai_uvedom_admina_rozpocet('Livescore zastavené — zlyhali všetky modely',
            "$dovod.

Posledná chyba: " . ($chyba ?? 'neuvedená')
          . "

V Správa → Livescore → Model súťaže sa dá nastaviť ručne.");
        return $dovod;
    }

    $novy = $poradie[$dalsi - 1];

    $pdo->prepare(
        "INSERT INTO admin.livescore_day_config
            (competition_id, den, model_id, poradie_index, is_enabled,
             chosen_by, chosen_at, fails_in_row, prepnuti_dnes)
         VALUES (?, ?, ?, ?, TRUE, 'fail', NOW(), 0, 1)
         ON CONFLICT (competition_id, den) DO UPDATE
            SET model_id = EXCLUDED.model_id,
                poradie_index = EXCLUDED.poradie_index,
                chosen_by = 'fail', chosen_at = NOW(), fails_in_row = 0,
                prepnuti_dnes = admin.livescore_day_config.prepnuti_dnes + 1")
        ->execute([$competitionId, $den, (int)$novy['id'], $dalsi]);

    $sprava = sprintf('Model %s zlyhal (%s), livescore prepnuté na %s',
        $poradie[$terajsi - 1]['model_id'] ?? '?',
        $trvala ?? "$zlyhani× za sebou",
        $novy['model_id']);

    ai_uvedom_admina_rozpocet('Livescore prepnuté na náhradný model', $sprava);
    return $sprava;
}
