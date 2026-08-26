# BetClub — UEFA Champions League 2026/27

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop` &nbsp;|&nbsp; 🔲 = nie je implementované

Súťaž: **UEFA Champions League 2026/27** · slug `ucl2026` · schéma `"lm2026-27"`

**Základné pravidlo:** UCL preberá celú funkcionalitu FIFA 2026. Rozdiely sú iba tam,
kde to vyžaduje formát súťaže (jedna ligová tabuľka namiesto skupín, kluby namiesto
reprezentácií, dvojzápasy v play-off). Všetko ostatné sa má správať rovnako.

---

## Formát súťaže

### Ligová fáza
- 36 klubov v **jednej spoločnej tabuľke**, nie v skupinách
- Každý klub odohrá 8 zápasov (4 doma, 4 vonku), bez odviet
- Kolo v utorok (8 zápasov) a stredu (8 zápasov), ďalšie o dva týždne
- Fáza: `LEAGUE`, kolá `LF1`–`LF8`

### Postup
| Umiestnenie | Postup |
|---|---|
| 1.–8. | priamo do osemfinále |
| 9.–24. | baráž o play-off (`PO`) |
| 25.–36. | vyradenie |

### Play-off
`PO` → `R16` → `QF` → `SF` → `F`. Všetky kolá na dva zápasy okrem finále.
O 3. miesto sa **nehrá**.

---

## Bodovanie

Hodnotí sa výsledok **po 90 minútach**. Predĺženie a penalty sa do tipu nezapočítavajú.

| Situácia | Ligová fáza | Play-off |
|---|:---:|:---:|
| Správny výsledok | 3 body | 5 bodov |
| Správny počet gólov domácich | +1 | +1 |
| Správny počet gólov hostí | +1 | +1 |
| **Maximum za zápas** | **5** | **7** |

Góly sa hodnotia **nezávisle od výsledku** — tip `1:1` pri výsledku `2:1` dá 1 bod
za správny počet gólov hostí. Overené testom.

---

## Prevzatá funkcionalita z FIFA

### Tipovanie
Zdieľaná logika v `web/src/utils/tipWindow.js` — rozhranie aj server musia
počítať uzáver rovnako, inak sa ponúknu políčka na zápas, ktorý sa už neuloží.

- 🟠 Tipovanie sa uzatvára **5 minút pred začiatkom** zápasu (server aj rozhranie)
- 🟠 Server pri pokuse po uzávere nastaví `tips_open = FALSE` a vráti 409
- 🟠 Tipovať sa dá len zápas, ktorý má **určené oba tímy** (play-off zostáva zamknuté)
- 🟠 Rozhranie nesmie ponúknuť políčka na zápas, ktorý sa už uložiť nedá

### Zadávanie výsledkov (admin)
- 🟠 Skóre po 90 minútach + schválenie
- 🟠 **Zákaz zadania výsledku pred začiatkom zápasu**
- 🟠 **Predĺženie len pri remíze po 90 min** — konečný výsledok inak odmietnuť
- 🟠 **Konečný výsledok musí mať víťaza** (nesmie byť remíza)
- 🟠 **Konečný výsledok nesmie byť nižší** ako po 90 minútach
- 🟠 Schválenie automaticky prepočíta tabuľku aj body všetkých hráčov

**Rozdiel oproti FIFA:** predĺženie sa v UCL týka `PO`, `R16`, `QF`, `SF`, `F` —
teda všetkého okrem `LEAGUE`. V ligovej fáze je remíza platný konečný výsledok.

### Zobrazenie
Tipy skupín sa riadia rovnakým pravidlom ako FIFA: zobrazia sa len členovia
**mojich skupín priateľov** a až **po začiatku zápasu** (server ich dovtedy nevydá).
Kým výsledok nie je schválený, body sa počítajú priebežne z live skóre.

- 🟠 Konečný výsledok po predĺžení ako `X:Y (A:B pp)` v Zápasoch aj Prehľade
- 🟠 Tipy skupín v rozkliku zápasu vrátane priebežných bodov počas zápasu
- 🟠 Rozpad bodov v Poradí hráčov (mriežka 7–0) + rozklik tipov hráča
- 🟠 Poradie hráčov číta z `"lm2026-27".tips`, maximum 7 bodov

### Filtre v Zápasoch
- 🟠 1. riadok: `1x2` (nenatipované) + `LF1`–`LF8`, `BAR`, `R16`, `QF`, `SF`, `F`
- 🟠 2. riadok: 36 klubov v mriežke 9 × 4 (logo + kód)
- 🟠 3. riadok: hracie dni bez roka
- 🟠 Zoznamy sa prispôsobujú ostatným filtrom

### Live výsledky
- Manuálne, rovnako ako FIFA — admin zadáva výsledky, automatické API nie je plánované
- 🟠 Stĺpce `ls_*` pripravené v migrácii `057`

---

## Časové zóny

`start_time` sa v DB ukladá ako **naive UTC** — rovnako ako pri FIFA a IIHF.
Rozhranie ho vždy prepočítava na miestny čas používateľa.

| Miesto | Prevod |
|---|---|
| DB → zobrazenie | `new Date(start_time + 'Z')`, formátovanie **bez** `timeZone: 'UTC'` |
| DB → admin formulár | `toInput()` — `getFullYear/getHours` (miestne) |
| Admin formulár → DB | `fromInput()` — `getUTCFullYear/getUTCHours` |
| Generátor | zapisuje 19:00 UTC = 21:00 miestneho |

**Pozor:** ak sa čas zobrazuje v UTC, ale o tipovaní sa rozhoduje v miestnom čase,
používateľ vidí iný čas, než podľa ktorého systém počíta. Obe strany musia
používať rovnakú zónu.

Kontrola v DB musí porovnávať v UTC:
```sql
SELECT start_time < NOW() AT TIME ZONE 'UTC' AS uz_zacal FROM "lm2026-27".games;
```

---

## Databáza

| Objekt | Poznámka |
|---|---|
| `admin.uefa_clubs` | **trvalý** číselník klubov naprieč ročníkmi, `is_active` |
| `admin.countries` | spoločný číselník štátov, ISO + športové kódy |
| `"lm2026-27".games` | 189 zápasov (144 ligových + 45 play-off) |
| `"lm2026-27".tips` | tipy, unique `(user_id, game_id)` |
| `"lm2026-27".group_standings` | jedna tabuľka, `phase = 'LEAGUE'` |
| `"lm2026-27".scoring_config` | bodovanie |

**Rozdiel oproti FIFA:** kluby nie sú v ročníkovej schéme, ale v `admin.uefa_clubs` —
klub, ktorý sa nekvalifikoval, v číselníku zostáva a o rok sa môže vrátiť.

---

## API endpointy

| Endpoint | Účel | Stav |
|---|---|---|
| `GET /v1/ucl/games` | zápasy + môj tip (`?id=` detail) | 🟠 |
| `GET /v1/ucl/teams` | kluby účastníkov | 🟠 |
| `GET,POST /v1/ucl/tips` | moje tipy, zadanie tipu | 🟠 |
| `GET /v1/ucl/game-tips` | tipy ostatných (až po uzavretí) | 🟠 |
| `GET /v1/ucl/standings` | ligová tabuľka s postupovými pásmami | 🟠 |
| `POST /v1/admin/ucl-game-update` | výsledok + schválenie | 🟠 |
| `PUT /v1/admin/ucl-game-edit` | dvojice, termín, štadión | 🟠 |
| `POST /v1/admin/ucl-recalc` | ručný prepočet | 🟠 |
| `POST /v1/admin/ucl-generate-games` | vygenerovanie kostry | 🟠 |

---

## Obrazovky

Prepínajú sa podľa slugu `ucl2026` v `App.jsx`:

| Cesta | Komponent |
|---|---|
| `/dashboard` | `UclDashboard` |
| `/games` | `UclGames` |
| `/tabulky` | `UclStandings` |
| admin `/results`, `/games` | `UclAdminGames` |
| Nástroje → LM 2026/27 | `UclGameGenerator` |

---

## Stav a ďalšie kroky

1. ✅ Migrácie `044`–`057` spustené na DB-DEV-BET
2. 🟠 Číselníky štátov a klubov vrátane admin obrazoviek
3. 🟠 Generátor rozlosovania (189 zápasov)
4. 🟠 Používateľské aj admin obrazovky, tipovanie, tabuľka, bodovanie
5. 🟠 **Validácie výsledku** — zákaz pred začiatkom, pravidlá predĺženia (overené 10 testami)
6. 🟠 **Zobrazenie `X:Y (A:B pp)`** po predĺžení
7. 🟠 **Tipy skupín** v rozkliku zápasu
8. 🟠 **Rozpad bodov** v Poradí hráčov
9. 🔲 Po oficiálnom žrebe opraviť dvojice a termíny

---

## Pravidlá práce

- Vývoj v `dev_betclub` na vetve `develop`
- Na `main` sa neposiela nič bez explicitného pokynu
- Po každej zmene aktualizovať toto zadanie (✅ / 🟠 / 🔲)
- Oficiálne názvy, termíny a výsledky sa overia podľa UEFA po žrebe
