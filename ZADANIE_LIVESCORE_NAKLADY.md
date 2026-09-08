# ZADANIE — sledovanie nákladov na livescore

Evidencia modelov, ich cien a spotreby, automatický výber modelu podľa úspešnosti
a admin obrazovka na sledovanie nákladov.

Legenda: ✅ hotové | 🟠 rozpracované | 🔲 TODO

---

## 0. Validácia pôvodného zadania

Zadanie je vecne správne. Pri overovaní v kóde vyšlo najavo päť vecí, ktoré ho
menia alebo dopĺňajú.

### 0.1 Dva rôzne livescore systémy, nie jeden

| Súťaž | Zdroj | Platí sa za |
|---|---|---|
| IIHF 2026 | **api-sports.io** (`api/cron/livescore_poll.php`) | volania API, nie tokeny |
| UCL 2026/27 | **OpenRouter** (`api/cron/ucl_livescore.php`) | tokeny |
| FIFA 2026 | zatiaľ neriešené | — |

Zadanie hovorí o tokenoch a cene za token, čo sedí len na OpenRouter. Aby bola
evidencia úplná, číselník musí zvládnuť **oba typy poskytovateľov** — inak by
náklady na IIHF v prehľade chýbali.

**Riešenie:** `provider` v číselníku (`openrouter` | `api_sports`) a cena zvlášť
za token aj za volanie. Pre api-sports sa tokeny neevidujú, cena sa počíta
za volanie.

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

---

## 1. Číselník modelov

`admin.ai_models`

| Stĺpec | Účel |
|---|---|
| `id` | PK |
| `provider` | `openrouter` \| `api_sports` |
| `model_id` | `minimax/minimax-m3` — identifikátor pre volanie |
| `name` | zobrazovaný názov |
| `is_free` | bezplatný (mení sa v čase, obnovuje sa z cenníka) |
| `price_input_1m` | USD za 1M vstupných tokenov |
| `price_output_1m` | USD za 1M výstupných tokenov |
| `price_per_call` | USD za volanie (pre api-sports, kde tokeny nie sú) |
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

**`daily_budget_usd` je nad rámec zadania**, ale patrí sem: bez stropu môže
zacyklený cron minúť kredit za noc. Predvolene napríklad 1 USD na deň a súťaž.

## 3. Log volaní

Rozšírenie existujúcej `admin.livescore_log` o:

| Stĺpec | Účel |
|---|---|
| `competition_id` | ktorej súťaže sa volanie týka |
| `game_id` | ktorý zápas (číslo zo súťažnej schémy) |
| `provider` | `openrouter` \| `api_sports` |
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

### 4.2 Model info

- Aktuálny model pre dnešok, per súťaž
- Cena za volanie a **predpoklad na dnešný deň** (počet volaní × priemerná cena)
- Minuté dnes vs. `daily_budget_usd`
- Výsledky ranného testu: ktoré modely prešli, úspešnosť, cena
- **Akcie:** zmeniť model na dnes, vypnúť livescore na dnes, spustiť test znova

## 5. Automatický výber modelu

Beží pri **prvom zápase dňa** (cron `livescore_model_test.php`).

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
| 1 | Migrácia: `ai_models`, `livescore_day_config`, rozšírenie `livescore_log` | 🔲 |
| 2 | Naplnenie číselníka z cenníka OpenRoutera + api-sports | 🔲 |
| 3 | Zápis nákladov do logu pri každom volaní (UCL aj IIHF) | 🔲 |
| 4 | API: `/v1/admin/livescore-naklady`, `/v1/admin/livescore-model` | 🔲 |
| 5 | Admin obrazovka Náklady | 🔲 |
| 6 | Admin obrazovka Model info + ručná zmena a vypnutie | 🔲 |
| 7 | Automatický test a výber modelu (cron) | 🔲 |
| 8 | Denný strop nákladov + notifikácia adminovi | 🔲 |

## 7. Otvorené otázky

1. **Strop nákladov** — aká suma na deň a súťaž? Návrh 1 USD.
2. **Čo pri prekročení stropu** — zastaviť livescore, alebo prepnúť na
   najlacnejší model? Návrh: prepnúť, a zastaviť až pri dvojnásobku.
3. **api-sports v prehľade** — má sa cena za volanie počítať, alebo ho sledovať
   len počtom volaní? (má mesačný paušál, nie platbu za volanie)
4. **Ako často testovať** — len pri prvom zápase dňa, alebo aj keď model počas
   dňa začne zlyhávať? Návrh: aj priebežne, po troch neúspechoch za sebou.
