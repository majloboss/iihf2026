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

Tímy pri vytváraní zápasov môžu zostať dočasne prázdne, aby bolo možné pripraviť zápasy pred dokončením žrebu.

### Číselník klubov

Zdrojový zoznam klubov a štátov je v `sources/lm2026-27/kluby_loga_staty.csv`.
Obsahuje 81 klubov vrátane účastníkov kvalifikácie. Každý klub bude mať:

- presný názov klubu,
- názov štátu,
- trojpísmenný kód štátu,
- súbor loga.

Admin bude tieto údaje upravovať na samostatnej obrazovke číselníka klubov. V používateľskej časti sa klub zobrazí napríklad ako **Slovan Bratislava (SVK)** a logo sa načíta z jeho priradeného súboru.

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
5. 🟠 Pripraviť a spustiť import 81 klubov, názvov štátov a kódov štátov z CSV (`046`)
6. ✅ Pridať admin číselník klubov s editáciou názvu, štátu, kódu a loga
7. 🔲 Doplniť vyžrebované zápasy do `"lm2026-27".games`
8. 🔲 Pridať UCL API endpointy
9. 🔲 Pridať UCL stránky a routing vo webovej aplikácii
10. 🔲 Otestovať ligovú tabuľku, tipovanie a bodovanie
11. 🔲 Aktivovať súťaž pre používateľov

## Pravidlá práce

- Vývoj prebieha v `dev_betclub` na vetve `develop`
- Na produkčný `main` sa neposiela nič bez explicitného pokynu
- Súťaž zostáva neaktívna, kým nebude známy oficiálny zoznam tímov a vyžrebované zápasy
- Oficiálne názvy, termíny, výsledky a postupové kritériá sa overia podľa UEFA po žrebe
