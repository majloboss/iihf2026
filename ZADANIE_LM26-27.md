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
10. 🟠 Generátor rozlosovania v **Nástroje → LM 2026/27** (kostra súťaže pred žrebom)
11. 🔲 Po oficiálnom žrebe opraviť dvojice a termíny v správe zápasov
12. 🟠 Pridať UCL API endpointy
13. 🟠 Pridať UCL stránky a routing vo webovej aplikácii
14. 🔲 Otestovať ligovú tabuľku, tipovanie a bodovanie
15. 🟠 Aktivovať súťaž (migrácia 057) pre používateľov

## Pravidlá práce

- Vývoj prebieha v `dev_betclub` na vetve `develop`
- Na produkčný `main` sa neposiela nič bez explicitného pokynu
- Súťaž zostáva neaktívna, kým nebude známy oficiálny zoznam tímov a vyžrebované zápasy
- Oficiálne názvy, termíny, výsledky a postupové kritériá sa overia podľa UEFA po žrebe

## Generátor rozlosovania

**Nástroje → LM 2026/27** vygeneruje kostru súťaže ešte pred oficiálnym žrebom.
Po žrebe stačí opraviť dvojice a termíny, štruktúra zostáva.

| Fáza | Zápasov | Poznámka |
|---|---:|---|
| `LEAGUE` | 144 | 8 kôl × 18 zápasov, tímy priradené náhodne |
| `PO` | 16 | 8 dvojíc, zápas + odveta |
| `R16` | 16 | 8 dvojíc, zápas + odveta |
| `QF` | 8 | 4 dvojice, zápas + odveta |
| `SF` | 4 | 2 dvojice, zápas + odveta |
| `F` | 1 | jediný zápas, o 3. miesto sa nehrá |
| **Spolu** | **189** | |

Ligová fáza používa kruhový systém: z 35 možných kôl sa berie 8, čím je zaručené,
že sa žiadna dvojica nestretne dvakrát. Každý tím má 8 zápasov, z toho 4 doma.
Kolo sa hrá v utorok (8 zápasov) a stredu (8 zápasov), ďalšie o dva týždne.

Play-off zápasy sa zakladajú s prázdnymi tímami — dopĺňajú sa podľa výsledkov
ligovej fázy (miesta 9–24 hrajú o postup, víťazi sa pripoja k tímom z miest 1–8).

Generovanie je zablokované, keď k zápasom už existujú tipy — kostra sa robí
pred spustením tipovania.

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

### Bodovanie

Overené: maximum 5 bodov v ligovej fáze, 7 v play-off.
Góly sa hodnotia nezávisle od výsledku — tip `1:1` pri výsledku `2:1` dá 1 bod
za správny počet gólov hostí.

Tipovať sa dá len zápas, ktorý má určené oba tímy — play-off zostáva zamknuté,
kým sa nedoplnia postupujúci.
