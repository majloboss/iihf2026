# BetClub — Liga majstrov UEFA 2026/27

## Stav projektu

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

- Súťaž: **Liga majstrov UEFA 2026/27**
- Organizátor: **UEFA**
- BetClub slug: `ucl2026`
- Stav: 🟠 databázová štruktúra pripravená v develop
- Platforma: webová aplikácia React + Vite PWA
- Android aplikácia: nebude sa robiť

## Formát súťaže

### Kvalifikácia

Kvalifikácia prebieha pred hlavnou súťažou. Po odohraní posledných kvalifikačných zápasov UEFA uskutoční žreb hlavnej fázy.

- Fáza: `QUALIFYING`
- Tímy a dvojice sa doplnia podľa oficiálnych výsledkov
- Kvalifikačné zápasy možno evidovať v databáze, ak sa rozhodne, že sa budú aj tipovať

### Ligová fáza

Liga majstrov sa hrá ako **jedna spoločná ligová tabuľka**, nie ako skupiny.

- 36 tímov v jednej tabuľke
- Každý tím odohrá 8 zápasov
- Každý tím hrá 4 zápasy doma a 4 vonku
- Súperi sa určia žrebom
- Tímy sa v ligovej fáze navzájom stretnú iba raz
- Fáza: `LEAGUE`
- Poradie: body, skóre, strelené góly a ďalšie oficiálne UEFA kritériá

### Postup do vyraďovacej fázy

- 1. až 8. miesto: priamy postup do osemfinále
- 9. až 24. miesto: play-off o osemfinále
- 25. až 36. miesto: vyradenie zo súťaže
- Fáza play-off: `PO`
- Fáza osemfinále: `R16`
- Ďalšie fázy: `QF`, `SF`, `F`

## Databázová štruktúra

Migrácia `044_ucl_competition.sql` pripravuje:

- `admin.competitions` — súťaž `ucl2026`, zatiaľ neaktívna
- schému `lm2026-27`
- `"lm2026-27".teams` — kluby bez skupinového zaradenia
- `"lm2026-27".games` — kvalifikačné, ligové a knockout zápasy
- `"lm2026-27".tips` — tipy používateľov
- `"lm2026-27".scoring_config` — bodovanie
- `"lm2026-27".group_standings` — jedna spoločná tabuľka s fázou `LEAGUE`
- `"lm2026-27".countries` — číselník štátov (`country_code`, `country_name`)

Tímy pri vytváraní zápasov môžu zostať dočasne prázdne, aby bolo možné pripraviť zápasy pred dokončením žrebu.

### Číselník klubov

**Kluby nie sú viazané na ročník.** Klub, ktorý sa tento rok nekvalifikoval, v číselníku
zostáva a o rok sa môže vrátiť. Preto od migrácie `056` žijú v `admin.uefa_clubs`,
nie v ročníkovej schéme, a namiesto mazania majú príznak `is_active`.

Klub, na ktorom visia zápasy, sa nedá zmazať — iba deaktivovať. Ročníkové schémy sa
na číselník odkazujú cez `club_id`.


Zdrojový zoznam klubov a štátov je v `sources/lm2026-27/kluby_loga_staty.csv`.
Obsahuje 81 klubov vrátane účastníkov kvalifikácie. Každý klub bude mať:

 presný názov klubu,
 názov štátu,
 trojpísmenný kód štátu,
 súbor loga.

 Admin bude tieto údaje upravovať v **Správa → Číselníky → Štáty**. Klub si štát vyberá z číselníka; zmena názvu štátu sa preto automaticky prejaví pri všetkých jeho kluboch. V používateľskej časti sa klub zobrazí napríklad ako **Slovan Bratislava (SVK)** a logo sa načíta z jeho priradeného súboru.

Pri úprave štátu platí:

1. Zmení sa iba kód: štát sa presunie pod nový kód a všetky jeho kluby sa prepoja na nový kód.
2. Zmení sa iba názov: aktualizuje sa názov štátu a všetky kluby ho prevezmú.
3. Zmení sa kód aj názov: existujúci štát pod novým kódom sa aktualizuje, alebo sa vytvorí nový štát; kluby sa následne prepoja na nový kód.

## Bodovanie

Hodnotí sa výsledok po 90 minútach. Predĺženie a penalty sa do tipu nezapočítavajú.

| Situácia | Ligová fáza | Play-off |
|---|:---:|:---:|
| Správny výsledok | 3 body | 5 bodov |
| Správny počet gólov domáceho tímu | +1 | +1 |
| Správny počet gólov hosťujúceho tímu | +1 | +1 |
| Maximum za zápas | 5 bodov | 7 bodov |

## Assety

- Logo súťaže: `web/public/logos/tournament_logo_ucl2026.png`
- Logá klubov: `web/public/logos/ucl2026/`
- Kód klubu v databáze bude používaný ako názov assetu, napríklad `real.png`, `bayern.png` alebo `psg.png`
- Assety sa doplnia po potvrdení zoznamu účastníkov

## Implementačný postup

1. ✅ Pripraviť databázovú migráciu `044_ucl_competition.sql`
2. ✅ Spustiť migrácie `044` a `045` na DB-DEV-BET
3. ✅ Pripraviť logo Ligy majstrov UEFA
4. ✅ Pripraviť logá klubov z `sources/lm2026-27/`
5. ✅ Importovať 81 klubov, názvov štátov a kódov štátov z CSV (`046`) na DB-DEV-BET
6. ✅ Pridať admin číselník klubov s editáciou názvu, štátu, kódu a loga
7. ✅ Spustiť migráciu oprávnení `047` na DB-DEV-BET
8. ✅ Spustiť migráciu číselníka štátov `048` na DB-DEV-BET
9. 🔲 Spustiť synchronizáciu starších názvov štátov `049` na DB-DEV-BET
10. 🟠 ~~Generátor rozlosovania~~ — nahradený načítaním z `games_pdf`
11. ✅ Rozlosovanie ligovej fázy známe zo zdroja, dvojice a termíny sedia
12. 🟠 Pridať UCL API endpointy
13. 🟠 Pridať UCL stránky a routing vo webovej aplikácii
14. 🔲 Otestovať ligovú tabuľku, tipovanie a bodovanie
15. 🟠 Aktivovať súťaž (migrácia 057) pre používateľov
16. 🟠 Referenčný rozpis zo zdrojového PDF v `games_pdf` (migrácia `062`)
17. 🟠 Migrácie `060`, `062` a `063` spustené na DB-DEV-BET
18. 🟠 Zápasy ligovej fázy kompletné: dvojice, kolá, termíny, URL aj štadióny
19. 🟠 Migrácie `064`, `065` a `066` spustené na DB-DEV-BET
20. 🔲 Nahradiť dočasné kódy klubov na `X` oficiálnymi podľa UEFA
18. 🟠 Testovacie nástroje: načítanie z PDF, generovanie tipov a výsledkov LF

## Referenčný rozpis zo zdroja (`games_pdf`)

Rozlosovanie ligovej fázy je oficiálne známe. Zdrojom je
`sources/lm2026-27/LM2026-27.pdf` (Flashscore, stav k 30.08.2026).

Tabuľka `"lm2026-27".games_pdf` je **báza dát**: počas testovania sa z nej zápasy
opakovane nahrávajú do `games`, takže sa dá kedykoľvek vrátiť k čistému stavu.

| Fáza | Zápasov | Kolá | Kluby |
|---|---:|---|---|
| `LEAGUE` | 144 | `round_no` 1–8, každé kolo 18 zápasov | vyžrebované |
| `PO` | 16 | 8 dvojíc, zápas + odveta | zatiaľ neznáme |
| `R16` | 16 | 8 dvojíc, zápas + odveta | zatiaľ neznáme |
| `QF` | 8 | 4 dvojice, zápas + odveta | zatiaľ neznáme |
| `SF` | 4 | 2 dvojice, zápas + odveta | zatiaľ neznáme |
| `F` | 1 | jediný zápas, Estadio Metropolitano, Madrid | zatiaľ neznáme |
| **Spolu** | **189** | | |

Kluby drží `games_pdf` cez `home_team_id`/`away_team_id` — odkaz na `club_id`,
rovnako ako `games`. Pôvodná verzia sa viazala na `club_code` a zablokovala tým
premenovanie klubu v číselníku (`violates foreign key constraint
games_pdf_home_code_fkey`); migrácia `064` to naprávila.

### Kód klubu je iba informatívny

Kód je údaj, ktorý admin bežne mení — časť klubov má zatiaľ dočasné označenie
začínajúce `X`, ktoré sa nahradí oficiálnym kódom UEFA. **Identitou klubu je
`club_id`**, na kóde nesmie stáť nič. Migrácia `065` to dokončuje:

- `group_standings.team` (kód) → `team_id` (odkaz na `club_id`) — inak by po
  premenovaní klubu jeho riadok v ligovej tabuľke ostal visieť na starom kóde
- ruší sa `UNIQUE (club_code)`

Poradie pri rovnosti bodov a skóre sa preto láme názvom klubu, nie kódom.

### URL zápasov a štadióny

Zdroj: `sources/lm2026-27/lm_url.csv` — ku každému zápasu ligovej fázy odkaz na
Flashscore a štadión. Dopĺňa ich migrácia `066`.

Štadión sa ukladá **ku každému zápasu, nie ku klubu**: klub nemusí hrať doma na
svojom štadióne.

> 🔎 **Overiť:** Viking má pri zápase s PSV (20. 1. 2027) uvedenú MHPArena
> v Stuttgarte, kým zvyšné tri domáce zápasy hrá na Lyse Arena. UEFA pritom
> uvádza jeho domáci štadión. Zatiaľ ponechané podľa zdroja, treba overiť.

Vyraďovacia časť URL ani štadióny nemá — dozvieme sa ich až po žrebe. Výnimkou
je finále, ktorého štadión zapísala už `062`.

Kolo drží stĺpec `round_no` — presne tá hodnota, ktorou filtruje `UclGames`
(chipy LF1–LF8). Vo vyraďovacej časti je `NULL`.

### Termíny vyraďovacej časti

| Fáza | Prvé zápasy | Odvety |
|---|---|---|
| Baráž o osemfinále | 16. – 17. 2. 2027 | 23. – 24. 2. 2027 |
| Osemfinále | 9. – 10. 3. 2027 | 16. – 17. 3. 2027 |
| Štvrťfinále | 6. – 7. 4. 2027 | 13. – 14. 4. 2027 |
| Semifinále | 27. – 28. 4. 2027 | 4. – 5. 5. 2027 |
| Finále | 5. 6. 2027 (Estadio Metropolitano, Madrid) | — |

### Nástroje

| Súbor | Účel |
|---|---|
| `tools/parse_lm_pdf.cjs` | rozparsuje text PDF do `LM2026-27_games.json` |
| `tools/gen_lm_games_pdf.cjs` | z JSON vygeneruje migráciu `062` |
| `tools/load_games_from_pdf.cjs` | naleje `games_pdf` do `games` (`--write`, `--force`) |
| `tools/run_migration.cjs` | spustí migráciu na DB podľa `api/config/db.php` |
| `tools/db_query.cjs` | jednorazový dopyt na DB |
| `tools/test_ucl_tools.cjs` | overí testovacie nástroje proti DB (v transakcii, vráti späť) |
| `tools/test_ucl_results_window.cjs` | overí, že výsledky dostanú len dohrané zápasy |
| `tools/check_lm_url_csv.cjs` | porovná `lm_url.csv` s rozpisom z PDF |
| `tools/gen_lm_url_migration.cjs` | z CSV vygeneruje migráciu `066` |
| `tools/test_lm_url_migration.cjs` | overí, že každý UPDATE v `066` trafí správny zápas |

### Oprávnenia

Schémy vlastní `dbdevbet-admin`, aplikácia sa pripája ako `dbbet-admin`, ktorý mal
v `"lm2026-27"` len `USAGE` — `CREATE TABLE` mu neprešlo. Migrácia `063` mu právo
doplnila; spustiť ju musel vlastník schémy z databázovej konzoly.

`CREATE` v schéme ale nestačí na `ALTER TABLE` — pri existujúcej tabuľke Postgres
vyžaduje jej vlastníctvo. Práve preto **migrácia `060` (polčasové skóre) ticho
vypadla** a v `games` chýbali stĺpce, na ktoré sa dopytuje `v1/ucl/games.php` —
používateľovi to spadlo na `column g.home_score_halftime does not exist`.

Preniesť vlastníctvo tabuliek na `dbbet-admin` **sa nedá**: `ALTER TABLE … OWNER TO`
vyžaduje, aby bol odovzdávajúci členom cieľovej role, a `GRANT` toho členstva zase
`ADMIN OPTION` na tú rolu. Tú má na hostingu iba superuser, ktorého k dispozícii
nemáme. Pokus skončí na `must have admin option on role "dbbet-admin"`.

**Platí teda toto rozdelenie:**

| Typ migrácie | Kde sa spúšťa |
|---|---|
| `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE` | `tools/run_migration.cjs` |
| `ALTER TABLE`, `DROP TABLE`, `COMMENT ON` | databázová konzola pod `dbdevbet-admin` |

> Poučenie: po každej migrácii si over `admin.schema_versions` — chýbajúce
> číslo v poradí znamená, že sa niektorá nespustila. Práve tak vypadla `060`.

## Pravidlá práce

- Vývoj prebieha v `dev_betclub` na vetve `develop`
- Na produkčný `main` sa neposiela nič bez explicitného pokynu
- Súťaž zostáva neaktívna, kým nebude známy oficiálny zoznam tímov a vyžrebované zápasy
- Oficiálne názvy, termíny, výsledky a postupové kritériá sa overia podľa UEFA po žrebe

## Testovacie nástroje

**Nástroje → LM 2026/27** obsahuje tri sekcie, ktorými sa súťaž naplní dátami
na testovanie. Sekcie *Priebežné výsledky* a *Rozlosovanie zápasov* boli
odstránené — rozlosovanie je už známe zo zdroja, takže náhodná kostra netreba.

### 📥 Načítať zápasy z PDF

Nahrá zápasy z `games_pdf` do `games` — dvojice, kolá aj termíny presne podľa
zdrojového rozpisu. Zápasy v súťaži sa nahradia, takže sa dá kedykoľvek vrátiť
k čistému stavu. Kolo sa prenesie do `game_type_name` v tvare `N. kolo`, odkiaľ
si ho číta filter LF1–LF8.

Keď na zápasoch visia tipy, akcia sa odmietne, kým admin nezapne
**Zmazať aj tipy**.

### 🎯 Generuj tipy hráčov LF

Vytvorí tipy všetkých aktívnych hráčov na všetky zápasy ligovej fázy.
Skóre je náhodné s realistickým rozložením gólov (najčastejšie 0–2).
Bez **Prepísať existujúce** sa doplnia iba chýbajúce tipy.

Play-off sa netipuje — tie zápasy nemajú určené tímy.

### ⚽ Generuj výsledky LF

Vyplní výsledky **dohraných** zápasov ligovej fázy a rovno ich schváli, takže sa
prepočíta ligová tabuľka aj body za tipy (`ucl_recalc_standings`,
`ucl_recalc_points` — tie isté helpery, aké volá zadanie výsledku adminom).
Predĺženie sa v ligovej fáze nehrá, remíza je platný výsledok.

Za dohraný sa považuje zápas, ktorému od výkopu ubehli aspoň **3 hodiny**
(90 minút hry, polčas a rezerva na nadstavený čas) a ktorý ešte nemá zadané
skóre. Vďaka tomu sa dá počas testovania posúvať termínmi zápasov a nástroj
vždy doplní presne to, čo už malo byť odohrané — postupne po kolách, tak ako
súťaž reálne beží.

`start_time` je naive UTC, preto sa porovnáva s `NOW() AT TIME ZONE 'UTC'`
— databázový server beží v lokálnej zóne, takže samotné `NOW()` by bolo
o dve hodiny vedľa.

### Endpointy

| Endpoint | Účel |
|---|---|
| `GET,POST /v1/admin/ucl-load-pdf` | stav a načítanie zápasov z `games_pdf` |
| `GET,POST /v1/admin/ucl-generate-tips` | stav a generovanie tipov ligovej fázy |
| `GET,POST /v1/admin/ucl-generate-results` | stav a generovanie výsledkov ligovej fázy |

Generátory zapisujú priamo do DB, nie cez `ucl-game-update` a `/v1/ucl/tips` —
tie kontrolujú uzávierku a odmietli by zápas pred výkopom. Ligová fáza sa hrá
až od septembra 2026, takže testovanie by inak nebolo možné.

Overené skriptom `tools/test_ucl_tools.cjs`, ktorý celý reťazec prejde
v transakcii a vráti ju späť.

## Súťaž v aplikácii

Oficiálny názov: **UEFA Champions League 2026/27**, slug `ucl2026`.
Migrácia `057` súťaž premenuje, doplní livescore stĺpce, indexy a **zapne ju**
v prepínači (`is_active = TRUE`) — dovtedy sa v aplikácii neponúka.

### API endpointy

| Endpoint | Účel |
|---|---|
| `GET /v1/ucl/games` | zápasy + môj tip (`?id=` detail) |
| `GET /v1/ucl/teams` | kluby účastníkov |
| `GET,POST /v1/ucl/tips` | moje tipy, zadanie tipu |
| `GET /v1/ucl/game-tips` | tipy ostatných (až po uzavretí) |
| `GET /v1/ucl/standings` | ligová tabuľka s postupovými pásmami |
| `POST /v1/admin/ucl-game-update` | výsledok + schválenie, prepočíta tabuľku a body |
| `PUT /v1/admin/ucl-game-edit` | dvojice, termín, štadión, tipovanie |
| `POST /v1/admin/ucl-recalc` | ručný prepočet |

### Obrazovky

Prepínajú sa podľa slugu `ucl2026` v `App.jsx`:
Zápasy → `UclGames`, Tabuľky → `UclStandings`, admin Výsledky aj Zápasy → `UclAdminGames`.

#### Karta zápasu

Rovnaká skladba ako vo FIFA, len namiesto reprezentácie je klub:

- **logo klubu** z `/logos/ucl2026/`
- **názov klubu** a pod ním **štát s vlajkou** z `/flags/`
- **štadión** a odkaz na **FlashScore** pod dvojicou

Štát prichádza z `admin.countries` cez krajinu klubu — zobrazuje sa slovenský
názov (`name_sk`), pri jeho absencii kód. Vlajku posiela API ako `home_flag` /
`away_flag`.

Prehľad (`UclDashboard`) zostáva kompaktný, štáty tam nie sú — je to zoznam
viacerých sekcií a údaj by ho zahustil.

### Bodovanie

Overené: maximum 5 bodov v ligovej fáze, 7 v play-off.
Góly sa hodnotia nezávisle od výsledku — tip `1:1` pri výsledku `2:1` dá 1 bod
za správny počet gólov hostí.

Tipovať sa dá len zápas, ktorý má určené oba tímy — play-off zostáva zamknuté,
kým sa nedoplnia postupujúci.
