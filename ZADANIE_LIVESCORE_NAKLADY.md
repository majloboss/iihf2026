# ZADANIE — sledovanie nákladov na livescore

Evidencia modelov, ich cien a spotreby, automatický výber modelu podľa úspešnosti
a admin obrazovka na sledovanie nákladov.

Legenda: ✅ hotové | 🟠 rozpracované | 🔲 TODO

---

## 0. Validácia pôvodného zadania

Zadanie je vecne správne. Pri overovaní v kóde vyšlo najavo päť vecí, ktoré ho
menia alebo dopĺňajú.

### 0.1 Všetko ide cez OpenRouter

IIHF dnes používa api-sports.io (`api/cron/livescore_poll.php`), ale **api-sports
sa už nebude používať** — IIHF sa neskôr prerobí na OpenRouter rovnako ako UCL.

Číselník preto pozná **len jedného poskytovateľa** a cenu za tokeny. Stĺpec
`provider` v ňom napriek tomu je: keby raz pribudol iný poskytovateľ, nebude
to znamenať zásah do schémy.

| Súťaž | Zdroj dnes | Cieľ |
|---|---|---|
| IIHF 2026 | api-sports.io | OpenRouter |
| UCL 2026/27 | **OpenRouter** | — |
| FIFA 2026 | zatiaľ neriešené | OpenRouter |

### 0.2 Model sa nenastavuje na súťaž, ale na súťaž a deň

Bod 2 hovorí „nastavený aktuálny model pre súťaž", bod 6 ale žiada meniť model
a vypínať livescore **pre aktuálny deň**. To sú dve rôzne veci.

**Riešenie:** väzba je `(competition_id, deň)`, nie `(competition_id)`. Umožní to:
- rôzny model pre rôzne dni (výsledok testu sa mení podľa dostupnosti)
- vypnutie livescore len na jeden deň bez zásahu do nastavenia súťaže
- historickú dohľadateľnosť, ktorý model ktorý deň bežal

Predvolený model súťaže (keď pre daný deň nie je nič nastavené) drží
`admin.livescore_competition_default`.

### 0.3 Log potrebuje cenu, nie len tokeny

Bod 3 žiada „počet tokenov, cena". Cena sa musí uložiť **v čase volania**, nie
dopočítavať zo súčasného cenníka — ceny modelov sa menia a spätný prepočet by
skresľoval históriu.

Rovnako sa musí uložiť **model_id ako text**, nie len FK. Keby model z číselníka
zmizol, log musí zostať čitateľný.

### 0.4 Existujúci `admin.livescore_log` sa dá rozšíriť

Tabuľka už existuje (migrácia 061) a má 3 záznamy. Bola myslená ako dočasná, ale
štruktúra sedí — chýbajú jej len stĺpce pre náklady a väzbu na súťaž.

**Riešenie:** rozšíriť ju, nezakladať druhú. Ušetrí to migráciu dát a zachová
doterajšie záznamy.

### 0.5 Test modelu musí overiť viac než dostupnosť

Bod 5 hovorí „aplikácia otestuje ako sa jej darí získavať údaje". To je kľúčové
a treba to upresniť, lebo dnes vieme, že **model môže odpovedať a byť pritom
nepoužiteľný**:

- `nvidia/nemotron-3-super-120b:free` na krátkom teste prešiel, ale na skutočnej
  livescore úlohe namiesto JSON začal nahlas uvažovať a odpoveď sa orezala
- `thinkingmachines/inkling:free` vracia „only available on agentic harnesses"
- pri vyčerpanom dennom limite vracajú modely `429`, čo je **dočasná** chyba

**Riešenie:** test beží na skutočnom zápase a hodnotí sa podľa toho, koľko
z troch povinných údajov model vytiahol (skóre, časť hry, minúta). Dočasné chyby
model nediskvalifikujú natrvalo.

**Test je nezávislý od športu.** Hodnotia sa tri veci, ktoré má každý šport:

| Údaj | Futbal | Hokej | Volejbal | Basketbal |
|---|---|---|---|---|
| skóre | góly | góly | sety | body |
| časť hry | polčas | tretina | set | štvrtina |
| minúta | minúta | minúta | (nemá) | minúta |

Prompt sa modelu odovzdá s názvom športu a on vráti to isté JSON pole
(`period`, `period_number`), len naplnené podľa športu. Minúta je bonus —
pri volejbale ju nemá zmysel vyžadovať.

### 0.6 Log musí rozlíšiť test od ostrého volania

Testovacie volania sa nesmú miešať s ostrými — inak by skresľovali štatistiku
úspešnosti aj náklady na súťaž.

**Riešenie:** stĺpec `call_type` (`test` | `live`) v logu. Prehľad nákladov
predvolene ukazuje ostré volania, testovacie na prepnutie.

---

## 1. Číselník modelov

`admin.ai_models`

| Stĺpec | Účel |
|---|---|
| `id` | PK |
| `provider` | zatiaľ vždy `openrouter`; pripravené na budúce rozšírenie |
| `model_id` | `minimax/minimax-m3` — identifikátor pre volanie |
| `name` | zobrazovaný názov |
| `is_free` | bezplatný (mení sa v čase, obnovuje sa z cenníka) |
| `price_input_1m` | USD za 1M vstupných tokenov |
| `price_output_1m` | USD za 1M výstupných tokenov |
| `context_length` | veľkosť kontextu |
| `is_enabled` | používať pri automatickom výbere |
| `unavailable_reason` | prečo je vyradený (trvalá prekážka) |
| `success_rate` | úspešnosť z testov, 0–100 |
| `avg_tokens`, `avg_ms` | priemerná spotreba a čas |
| `last_tested_at` | kedy naposledy testovaný |

**Prečo cena za 1M a nie za token:** cenníky sa uvádzajú za milión, uloženie
v tom istom tvare zabráni chybám o rády pri prepočte.

## 2. Model pre súťaž a deň

`admin.livescore_day_config` — jeden riadok na `(competition_id, den)`

| Stĺpec | Účel |
|---|---|
| `competition_id` | FK na `admin.competitions` |
| `den` | dátum, ktorého sa nastavenie týka |
| `model_id` | FK na `admin.ai_models` |
| `is_enabled` | livescore beží / je vypnutý pre tento deň |
| `disabled_reason` | prečo vypnuté (napr. „príliš drahé") |
| `chosen_by` | `auto` (test) \| `admin` (ručne) |
| `chosen_at`, `chosen_by_user_id` | kto a kedy |
| `daily_budget_usd` | strop na deň, po prekročení sa livescore zastaví |

`admin.livescore_competition_default` — predvolený model súťaže, keď pre deň nie
je nič nastavené.

**Dve súťaže naraz sú tým vyriešené:** kľúč je zložený, takže UCL aj IIHF môžu
v ten istý deň bežať na inom modeli.

### Denný strop a čo sa stane pri jeho prekročení

`daily_budget_usd` = **1 USD** na deň a súťaž (predvolene).

| Minuté | Reakcia |
|---|---|
| 80 % stropu | prepnúť na **najlacnejší funkčný** model, e-mail + push adminovi |
| 150 % stropu | **zastaviť** livescore pre daný deň, e-mail + push adminovi |

Prepnutie na 80 % dáva priestor dobehnúť zápas lacnejšie namiesto toho, aby
livescore zhaslo uprostred. Zastavenie až na 150 % počíta s tým, že prepnutý
model ešte niečo minie.

Obe udalosti sa zapíšu do `livescore_day_config.disabled_reason`, respektíve
`chosen_by = 'budget'`, aby bolo v prehľade vidieť, prečo sa model zmenil.

## 3. Log volaní

Rozšírenie existujúcej `admin.livescore_log` o:

| Stĺpec | Účel |
|---|---|
| `competition_id` | ktorej súťaže sa volanie týka |
| `game_id` | ktorý zápas (číslo zo súťažnej schémy) |
| `provider` | zatiaľ vždy `openrouter`; pripravené na budúce rozšírenie |
| `prompt_tokens`, `completion_tokens` | vstup a výstup zvlášť |
| `cost_usd` | **cena v čase volania**, NUMERIC(10,6) |
| `success` | vytiahol model povinné údaje? |
| `http_status`, `error` | prevádzkové údaje |

Ostávajú všetky doterajšie stĺpce s údajmi, ktoré model vrátil (skóre, minúta,
karty, `raw` JSON).

**Úspešnosť sa počíta z troch povinných údajov:** skóre oboch tímov, časť hry
(polčas / tretina), minúta ak je dostupná. Ostatné (karty, strelci) sú bonus
a na `success` nemajú vplyv.

## 4. Admin obrazovka — Správa → Livescore

Nová záložka, posledná v menu Správa. Dve podzáložky.

### 4.1 Náklady

- **Filtre:** súťaž, zápas, dátum (od–do), model
- **Prvý riadok = sumarizácia vyfiltrovaného:** počet volaní, úspešných %,
  tokeny (vstup/výstup/spolu), **cena spolu**
- Tabuľka volaní: čas, súťaž, zápas, model, tokeny, cena, úspech, získané skóre
- Graf nákladov po dňoch

Na mobile sumarizácia ako karty, tabuľka vodorovne posuvná.

### 4.2 Test

Ručné spustenie toho istého testu, ktorý beží hodinu pred prvým zápasom dňa —
kedykoľvek a na ľubovoľnom zápase z Flashscore.

- URL zápasu, šport, súťaž (nepovinná), počet modelov
- Modely sa volajú **postupne**, priebeh vidno v reálnom čase
- Pri každom modeli tri značky: skóre / časť hry / minúta
- Kliknutím sa rozbalí surová odpoveď modelu
- Sumarizácia: počet testovacích volaní, úspešných, tokeny, **cena testov**
- História testov a poradie modelov pre automatický výber

**Každý test = jeden záznam v `admin.livescore_log`** s `call_type='test'`.
Test na 15 modeloch pridá 15 záznamov. Zápas identifikuje **`url`**, nie
`game_id` — testuje sa spravidla na cudzom zápase, preto je `game_id` nullable.

### 4.3 Model info

- Aktuálny model pre dnešok, per súťaž
- Cena za volanie a **predpoklad na dnešný deň** (počet volaní × priemerná cena)
- Minuté dnes vs. `daily_budget_usd`
- Výsledky ranného testu: ktoré modely prešli, úspešnosť, cena
- **Akcie:** zmeniť model na dnes, vypnúť livescore na dnes, spustiť test znova

## 5. Automatický výber modelu

Beží **hodinu pred prvým zápasom dňa** (cron `livescore_model_test.php`).

Hodina vopred dáva čas vyriešiť problém skôr, než sa začne hrať. V tom čase
ale ešte nebeží vlastný zápas, preto si model musí na Flashscore **nájsť
ľubovoľný práve prebiehajúci zápas** — na overenie schopnosti čítať feed je
jedno, aký šport to je.

Ak sa žiadny prebiehajúci zápas nenájde, test sa zopakuje pri výkope prvého
vlastného zápasu.

### Poradie skúšania

1. Bezplatné modely podľa `success_rate` (najúspešnejší prvý)
2. Platené od najlacnejšieho (`price_input_1m + price_output_1m`)

### Priebeh testu

Na skutočnom prebiehajúcom zápase, pre každý model:

1. Zavolá sa s reálnym livescore promptom
2. Overí sa, či vrátil platný JSON
3. Skontroluje sa, či vytiahol **skóre, časť hry, minútu**
4. Zapíše sa do `admin.livescore_model_test`

**Prvý model, ktorý vytiahne skóre aj časť hry, sa nastaví na daný deň.**
Minúta je bonus — nie všetky športy ju majú.

### Prečo test na skutočnom zápase

Umelý test klame — `nemotron` na ňom prešiel, na skutočnej úlohe zlyhal.
Skutočný zápas overí aj to, či model rozumie formátu Flashscore feedu.

### Priebežné testovanie

Okrem ranného testu sa test spustí znova, keď aktuálny model **trikrát za sebou
zlyhá**. Vtedy sa prepne na ďalší v poradí — model môže počas dňa prestať
fungovať (vyčerpaný limit, výpadok poskytovateľa).

### Ochranné pravidlá

- **Dočasné chyby** (`429`, `temporarily`, `overloaded`, `timeout`) model
  nediskvalifikujú — skúsi sa neskôr
- **Trvalé chyby** (`agentic harnesses`, `unavailable for free`) ho vyradia
  a zapíšu do `unavailable_reason`
- Ak neprejde **žiadny** model, livescore sa pre daný deň vypne a admin dostane
  notifikáciu — lepšie nič než nesprávne skóre

`admin.livescore_model_test` — výsledky testov, aby sa `success_rate` počítala
z histórie, nie z jedného behu.

## 6. Fázy

| # | Fáza | Stav |
|---|---|---|
| 1 | Migrácia: `ai_models`, `livescore_day_config`, rozšírenie `livescore_log` | ✅ |
| 2 | Naplnenie číselníka zo živého cenníka OpenRoutera | ✅ |
| 3 | Zápis nákladov do logu pri každom volaní (UCL) | 🔲 |
| 4 | API: `/v1/admin/livescore-naklady`, `/v1/admin/livescore-model` | 🔲 |
| 5 | Admin obrazovka Náklady | 🔲 |
| 5b | Admin obrazovka Test — ručné spustenie testu modelov | ✅ |
| 6 | Admin obrazovka Model info + ručná zmena a vypnutie | 🔲 |
| 7 | Automatický test a výber modelu (cron) | 🔲 |
| 8 | Denný strop: prepnutie na 80 %, zastavenie na 150 %, e-mail + push | 🔲 |
| 9 | Prerobiť IIHF z api-sports na OpenRouter | 🔲 |

## 7. Rozhodnutia

| Otázka | Rozhodnutie |
|---|---|
| Strop nákladov | **1 USD** na deň a súťaž |
| Pri 80 % stropu | prepnúť na najlacnejší funkčný model + e-mail a push adminovi |
| Pri 150 % stropu | zastaviť livescore pre daný deň + e-mail a push adminovi |
| api-sports | **nepoužíva sa**, IIHF sa prerobí na OpenRouter (fáza 9) |
| Kedy testovať | hodinu pred prvým zápasom dňa; ak vtedy nebeží vlastný zápas, model si nájde na Flashscore ľubovoľný prebiehajúci |
| Priebežné testovanie | áno — po troch neúspechoch za sebou sa prepne na ďalší model |
| Rozlíšenie testov | `call_type` = `test` / `live`, testovacie sa nerátajú do nákladov súťaže |
| Šport | test aj prompt sú nezávislé od športu (skóre / časť hry / minúta) |
