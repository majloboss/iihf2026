# Live Score — Dizajn implementácie

> Stav: **modelovanie** — nič nie je naprogramované
> Posledná aktualizácia: 2026-05-19

---

## Cieľ

Automaticky načítavať živé výsledky zápasov z api-sports.io počas MS hokeja 2026.
Po turnaji vyhodnotiť presnosť/spoľahlivosť live score dát oproti reálnym výsledkom.

---

## Zdroj dát — api-sports.io

- **Endpoint:** `GET https://v1.hockey.api-sports.io/games?date=YYYY-MM-DD`
- **Liga:** World Championship, `league.name = "World Championship"` (league ID = 111, ale filter cez date funguje, cez league nie — bug v API)
- **Free tier:** 100 req/deň, reset 00:00 UTC
- **Obnova:** ~15 sekúnd na strane API

### Štruktúra odpovede (relevantné polia)

```json
{
  "id": 396697,
  "date": "2026-05-18T12:20:00+00:00",
  "teams": {
    "home": { "id": 1324, "name": "Finland" },
    "away": { "id": 1334, "name": "USA" }
  },
  "status": {
    "short": "FT",
    "long": "Finished"
  },
  "scores": {
    "home": 6,
    "away": 2
  },
  "periods": {
    "first":    "3-1",
    "second":   "2-0",
    "third":    "1-1",
    "overtime": null,
    "penalties": null
  }
}
```

### Známe statusy (čiastočne overené)

| `status.short` | Popis | Overené |
|---|---|---|
| `NS` | Not Started | ✅ |
| `FT` | Finished | ✅ |
| `1P` / `2P` / `3P` | Perioda prebieha | ⏳ treba živý zápas |
| `BT` | Break (prestávka) | ⏳ treba živý zápas |
| `OT` | Predĺženie | ⏳ treba živý zápas |

> **TODO:** Overiť živé statusy počas zápasu (najbližší: ITA vs NOR 19.5. 14:20 UTC)

---

## Párovanie zápasov (API ↔ DB)

Párovanie cez: **dátum + dvojica tímov** (po konverzii API mena → DB kódu)

### Mapping — uložený v DB

Nový stĺpec `api_name` v tabuľke `iihf2026.teams` — presný názov tímu tak ako ho vracia api-sports.io.

```sql
ALTER TABLE iihf2026.teams ADD COLUMN api_name VARCHAR(100);
```

| `team_code` | `team_name` | `api_name` |
|---|---|---|
| AUT | Austria | Austria |
| CAN | Canada | Canada |
| CZE | Czech Republic | Czech Republic |
| DEN | Denmark | Denmark |
| FIN | Finland | Finland |
| GER | Germany | Germany |
| GBR | Great Britain | Great Britain |
| HUN | Hungary | Hungary |
| ITA | Italy | Italy |
| LAT | Latvia | Latvia |
| NOR | Norway | Norway |
| SVK | Slovakia | Slovakia |
| SLO | Slovenia | Slovenia |
| SWE | Sweden | Sweden |
| SUI | Switzerland | Switzerland |
| USA | United States | USA |

PHP cron načíta mapping z DB (nie hardcoded):
```php
$map = $pdo->query("SELECT api_name, team_code FROM iihf2026.teams")
           ->fetchAll(PDO::FETCH_KEY_PAIR); // ["Finland" => "FIN", ...]
```

### SQL párovanie zápasu

```sql
SELECT id FROM iihf2026.games
WHERE team1 = :home_code
  AND team2 = :away_code
  AND DATE(starts_at AT TIME ZONE 'UTC') = :date
```

---

## Dátový model — nové stĺpce

Live score sa ukladá do **samostatných stĺpcov** — oddelene od potvrdených výsledkov.
Dôvod: po turnaji vyhodnotíme presnosť/spoľahlivosť API dát.

### Nové stĺpce v `iihf2026.games`

| Stĺpec | Typ | Popis |
|---|---|---|
| `ls_score1` | INT | Live: regulačné skóre home (NULL = nezačal/neznáme) |
| `ls_score2` | INT | Live: regulačné skóre away |
| `ls_final1` | INT | Live: finálne skóre po OT (NULL = bez OT) |
| `ls_final2` | INT | Live: finálne skóre po OT (NULL = bez OT) |
| `ls_status` | VARCHAR(10) | Live: raw status z API (`NS`, `1P`, `BT`, `FT`, …) |
| `ls_api_game_id` | INT | ID zápasu v api-sports (pre priame dotazy, audit) |
| `ls_updated_at` | TIMESTAMP | Kedy bol naposledy live score aktualizovaný |

### Existujúce stĺpce (potvrdené výsledky — nemenia sa automaticky)

| Stĺpec | Popis |
|---|---|
| `status` | `'scheduled'` / `'live'` / `'finished'` — mení admin |
| `score1` / `score2` | Regulačné skóre — potvrdzuje admin |
| `final1` / `final2` | OT skóre — potvrdzuje admin |

---

## Mapovanie API skóre → DB `ls_*` stĺpce

```
Bez OT (periods.overtime = null):
  ls_score1 = api.scores.home
  ls_score2 = api.scores.away
  ls_final1 = NULL
  ls_final2 = NULL

S OT (periods.overtime = "1-0"):
  ot_home = 1, ot_away = 0
  ls_score1 = api.scores.home - ot_home   ← regulácia
  ls_score2 = api.scores.away - ot_away   ← regulácia
  ls_final1 = api.scores.home             ← po OT
  ls_final2 = api.scores.away             ← po OT
```

---

## Workflow

### Automatický cron (počas turnaja)

```
Každých N minút (len v dňoch so zápasmi, len počas herných hodín):
  1. GET /games?date=DNES → všetky WC zápasy
  2. Pre každý zápas:
     a. Nájdi DB záznam cez párovanie (team1, team2, dátum)
     b. Ulož ls_* stĺpce + ls_api_game_id + ls_updated_at
     c. Ak ls_status = 'FT' → označ zápas ako skončený (len ls_status, nie status)
  3. Ak VŠETKY dnešné WC zápasy majú ls_status = 'FT' → zastav polling do zajtra
```

### Admin potvrdenie výsledku (AdminResults UI)

Admin vidí v karte zápasu predvyplnené hodnoty z `ls_*` stĺpcov.
Má dve možnosti:

- **Prevziať live score** — jedným klikom skopíruje `ls_*` → `score1/score2/final1/final2`, nastaví `status = 'finished'`
- **Zadať manuálne** — vypíše vlastné hodnoty, uloží štandardne

Po uložení (ľubovoľnou cestou) → admin spustí "Prepočítať body".

---

## Polling stratégia

### Interval

- **Základ:** 1 request = všetky dnešné zápasy naraz (nie 1 req/zápas)
- **Počet req/deň pri 5-min intervale, 8h:** ~96 req → zmestí sa do free tieru (100/deň)
- **Počet req/deň pri 10-min intervale, 8h:** ~48 req → bezpečná rezerva

### Dynamický interval (návrh, zatiaľ neschválený)

| Situácia | Interval |
|---|---|
| Žiadny live zápas (`NS` alebo `FT`) | nepolluje |
| Prebieha perioda (`1P`/`2P`/`3P`/`OT`) | 5 min |
| Prestávka (`BT`) | 15 min |

> Závisí od overenia `BT` statusu na živom zápase.

### Aktivácia pollingu

- Začína: 5 minút po `starts_at` prvého zápasu dňa
- Končí: keď všetky dnešné WC zápasy majú `ls_status = 'FT'`

---

## Sledovanie requestov — očakávané vs skutočné

### Cieľ

Po turnaji vyhodnotiť: koľko requestov sme plánovali, koľko sme skutočne spálili, kde vznikli odchýlky (OT, predčasný koniec, chyby API).

### Nové stĺpce per zápas

| Stĺpec | Typ | Popis |
|---|---|---|
| `ls_requests_expected` | INT | Vypočítané pri štarte zápasu — plánovaný počet pollov |
| `ls_requests_actual` | INT DEFAULT 0 | Reálny počet pollov počas ktorých bol zápas aktívny (nie FT) |

### Nová tabuľka — denný counter API volaní

```sql
CREATE TABLE iihf2026.livescore_daily (
    date      DATE PRIMARY KEY,
    api_calls INT  NOT NULL DEFAULT 0
);
```

Každý cron run (jedno volanie `/games?date=...`) → `api_calls += 1`.
Toto je skutočný počet spotrebovaných API kreditov za deň.

### Prečo oddelený counter?

Keď bežia 2 zápasy súčasne a spravíme 1 API call:
- `ls_requests_actual` **oba zápasy** +1 (= koľkokrát sme ich sledovali)
- `livescore_daily.api_calls` +1 (= koľko kreditov sme skutočne míňali)

Pre výpočet `remaining` používame `livescore_daily.api_calls`, nie súčet per-zápas.

### Výpočet `ls_requests_expected` pri štarte zápasu

Spustí sa raz — keď script prvýkrát zaznamená zápas ako aktívny (nie NS):

```
remaining  = 100 - livescore_daily.api_calls (default 0)
window_min = MAX(starts_at + expected_duration) - NOW  pre všetky dnešné nezačaté/aktívne zápasy
interval   = ROUND(window_min / remaining na najbližších 5 min)
ls_requests_expected = CEIL(expected_duration_min / interval)
```

### Očakávané trvanie zápasov

| Typ zápasu | `phase` v DB | Očakávaná dĺžka |
|---|---|---|
| Skupinová fáza, playoff, bronz | A, B, QF, SF, BRONZE | 3 hodiny (180 min) |
| Finále | GOLD (najvyššie `game_number`) | 5 hodín (300 min) |

### Príklady výpočtu

**Posledný deň — bronz (14:00) + finále (20:00):**
```
Bronz štartuje 14:05:
  remaining = 100
  window = MAX(14:00+3h, 20:00+5h) − 14:05 = 25:00 − 14:05 = 655 min
  interval = ROUND(655/100 na 5) = 5 min
  bronz expected = CEIL(180/5) = 36

Finále štartuje 20:05:
  remaining = 100 − 36 = 64  (bronz spotreboval 36 kreditov)
  window = 20:00+5h − 20:05 = 295 min
  interval = ROUND(295/64 na 5) = 5 min
  finále expected = CEIL(300/5) = 60

Celkom: 36 + 60 = 96 ≤ 100 ✓
```

**Deň so 6 zápasmi — 2 × 14:20, 2 × 16:20, 2 × 20:20:**
```
Prvý batch štartuje 14:25:
  remaining = 100
  window = MAX(vsetky starts_at + 3h) − 14:25 = 23:20 − 14:25 = 535 min
  interval = ROUND(535/100 na 5) = 5 min
  každý zápas expected = CEIL(180/5) = 36

Druhý batch (16:25), remaining ≈ 100 − 24 = 76:
  window = 23:20 − 16:25 = 415 min
  interval = ROUND(415/76 na 5) = 5 min
  každý zápas expected = CEIL(180/5) = 36
```

### Vyhodnotenie po turnaji

```sql
SELECT
    g.game_number,
    g.team1, g.team2,
    g.phase,
    g.ls_requests_expected,
    g.ls_requests_actual,
    g.ls_requests_actual - g.ls_requests_expected AS odchylka,
    CASE WHEN g.ls_final1 IS NOT NULL THEN 'OT' ELSE 'regulacia' END AS typ,
    CASE WHEN g.ls_score1 = g.score1 AND g.ls_score2 = g.score2 THEN 'OK' ELSE 'ROZDIEL' END AS zhoda
FROM iihf2026.games g
WHERE g.ls_requests_actual > 0
ORDER BY g.game_number;
```

---

## UI zmeny — Admin / Obrazovka Výsledky

### Zobrazenie výsledku v karte zápasu

| Stav | Farba / štýl | Popis |
|---|---|---|
| Potvrdený výsledok (admin uložil) | **zelená** | Existujúce správanie |
| Live score z API | **červená + blikanie** | Nové — len kým `status != 'finished'` |
| LIVE badge | **červená + blikanie** | Zobrazí sa keď `ls_status` je aktívna perioda |
| Čas poslednej aktualizácie | sivá, malé | `ls_updated_at` — „Livescore: pred 3 min" |

### Tlačidlá v karte zápasu

Aktuálne: `[ Uložiť ]`

Nové: `[ Uložiť ]  [ Prevziať Livescore ]`

**Prevziať Livescore:**
- Skopíruje `ls_score1/2` → vstupné polia skóre
- Skopíruje `ls_final1/2` → nastaví checkbox „Po predĺžení"
- Nastaví status na „Odohraný"
- Admin potom ešte musí kliknúť **Uložiť** (nie automatické uloženie)

**Uložiť:**
- Zapíše výsledok do `score1/2`, `final1/2`, `status = 'finished'`
- Spustí prepočet bodov pre všetkých tipérov tohto zápasu
- Admin môže výsledok kedykoľvek zmeniť (ďalší Uložiť prepočíta znovu)

### Tipy hráčov počas zápasu

- Body tipérov (`points`) sa zobrazujú **červenou farbou** kým `status != 'finished'`
  → signalizuje že sú to priebežné/predbežné body, nie finálne
- Po uložení výsledku adminom → body sú zelené (finálne)

### Livescore requesty v karte zápasu

Zobrazí sa malý informačný riadok (len pre admina):
```
Livescore: 12 / 36 requestov  •  posledná aktualizácia: 14:47
```
- `ls_requests_actual` / `ls_requests_expected`
- `ls_updated_at`
- Viditeľné len keď `ls_requests_actual > 0`

---

## UI zmeny — User / Obrazovka Zápasy

### Zobrazenie skóre v karte zápasu

Zmena layoutu: skóre sa zobrazuje **v strede medzi tímami** (rovnaký štýl ako admin karta).

```
[ FIN ]  6 : 2  [ USA ]
```

| Stav | Farba / štýl | Popis |
|---|---|---|
| Potvrdený výsledok (admin uložil) | **zelená** | Existujúce správanie |
| Live score z API | **červená + blikanie** | Nové — kým admin neuloží |
| LIVE badge | **červená + blikanie** | Viditeľné počas aktívneho zápasu |
| Čas poslednej aktualizácie | sivá, malé | `ls_updated_at` — „Livescore: pred 3 min" |

### Tipy hráčov počas zápasu

- Body tipérov sú **červené** kým admin neuloží výsledok → predbežné
- Po uložení adminom → zelené, finálne (existujúce správanie)

---

## UI zmeny — User / Obrazovka Prehľad

### Sekcia „Najbližšie zápasy" — LIVE zápasy

- Ak zápas má aktívny livescore (`ls_status` nie je NS/FT):
  - Zobraziť live skóre **červenou farbou** vedľa tímov
  - Zobraziť blikajúci **LIVE** badge (červený)
- Tipy hráčov v tejto sekcii zobrazovať **červenou** počas live → predbežné body

---

## Čo sa livescore NEDOTÝKA

- **Tabuľky skupín** — neprepočítavajú sa podľa livescore, len po uložení adminom
- **Standings / poradia** — rovnako, len po potvrdení výsledku
- **Body v rebríčku** — len po uložení adminom

---

## TODO — pred implementáciou

- [ ] Overiť live statusy (`1P`, `2P`, `3P`, `BT`, `OT`) na živom zápase
- [ ] Schváliť polling stratégiu (fixný 10-min vs dynamický)
- [ ] Navrhnúť migráciu (nové `ls_*` stĺpce)
- [ ] Navrhnúť UI zmeny v AdminResults (zobrazenie live score + tlačidlo "Prevziať")
- [x] ~~Rozhodnúť: cron na serveri (PHP/shell) alebo GitHub Action?~~ → **PHP script na serveri**
- [x] ~~Ako volať cron?~~ → **HTTP wget** (rovnaký vzor ako existujúce crony)

---

## Technická implementácia — cron

### Existujúci vzor

Hosting volá URL cez wget každých N minút:
```
https://iihf2026.fellow.sk/api/cron/run.php?token=<CRON_SECRET>
```
`run.php` overí token a spustí skripty (`send_notifications.php`).

### Livescore cron — nový endpoint

Samostatný HTTP endpoint (vlastný cron záznam na hostingu = vlastný interval):
```
https://iihf2026.fellow.sk/api/cron/run_livescore.php?token=<CRON_SECRET>
```

Nové súbory:
- `api/cron/run_livescore.php` — HTTP wrapper (token check, include)
- `api/cron/livescore_poll.php` — samotná logika pollingu

### Interval

Hosting cron: **každých 10 minút** (`*/10 * * * *`)

Crontab je "hlúpy" — spúšťa script vždy. **PHP script je inteligentný** — sám rozhodne či má pollovat.

### Logika štartu a zastavenia

```
livescore_poll.php
       │
       ▼
Sú dnes nejaké WC zápasy v DB?
    Nie → exit
       │
       ▼
Začal aspoň jeden? (starts_at ≤ NOW − 5 min)
    Nie → exit
       │
       ▼
Majú VŠETKY začaté zápasy ls_status = 'FT'?
    Áno → exit  (dnes sme hotoví)
       │
       ▼
Polluj API → aktualizuj ls_* stĺpce
```

### SQL pre každé rozhodnutie

```sql
-- 1. Sú dnes WC zápasy?
SELECT COUNT(*) FROM iihf2026.games
WHERE DATE(starts_at AT TIME ZONE 'UTC') = CURRENT_DATE
  AND phase IN ('A','B','QF','SF','BRONZE','GOLD');

-- 2. Začal aspoň jeden? (5-minútový buffer)
SELECT COUNT(*) FROM iihf2026.games
WHERE DATE(starts_at AT TIME ZONE 'UTC') = CURRENT_DATE
  AND starts_at <= NOW() - INTERVAL '5 minutes';

-- 3. Majú všetky začaté zápasy ls_status = 'FT'?
--    → ak COUNT = 0, všetky FT → exit
SELECT COUNT(*) FROM iihf2026.games
WHERE DATE(starts_at AT TIME ZONE 'UTC') = CURRENT_DATE
  AND starts_at <= NOW() - INTERVAL '5 minutes'
  AND (ls_status IS NULL OR ls_status != 'FT');
```

### Príklad dňa so 4 zápasmi (14:20 a 18:20 UTC)

```
Čas UTC   Akcia         Dôvod
────────────────────────────────────────────────────
14:10     exit          žiadny zápas ešte nezačal
14:20     exit          5-min buffer (starts_at - 5min = 14:15, ešte nie)
14:30     POLLUJE       ITA-NOR prebieha
...
16:30     POLLUJE       ITA-NOR = FT, ale LAT-AUT ešte nezačal → čakáme
18:30     POLLUJE       LAT-AUT prebieha
...
21:00     exit          všetky ls_status = 'FT' → dnes hotovo
```
