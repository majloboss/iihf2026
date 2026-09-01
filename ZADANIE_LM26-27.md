# BetClub — Liga majstrov UEFA 2026/27

## Stav projektu

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

- Súťaž: **Liga majstrov UEFA 2026/27**
- Organizátor: **UEFA**
- BetClub slug: `ucl2026`
- Platforma: webová aplikácia React + Vite PWA
- Android aplikácia: nebude sa robiť

**Stav:** 🟠 v `develop` funkčné a otestované. Ligová fáza je kompletne
vyžrebovaná (144 zápasov s termínmi, štadiónmi aj odkazmi na FlashScore),
tipovanie, bodovanie, ligová tabuľka aj livescore bežia. Do produkcie sa
zatiaľ nenasadzovalo. Prvý ostrý zápas: **8. 9. 2026**.

Posledná spustená migrácia: **067**.

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

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

### Databáza a číselníky

1. ✅ Migrácie `044`–`049`: schéma, kluby, štáty, oprávnenia
2. 🟠 Migrácie `060`, `062`–`067` spustené na DB-DEV-BET
3. 🟠 Kód klubu je iba informatívny (`065`) — dá sa voľne meniť
4. 🟠 Domáci štadión klubu v číselníku (`067`)
5. 🟠 Číselníky: triedenie stĺpcov, hľadanie bez diakritiky, filter sezóny

### Zápasy

6. 🟠 Referenčný rozpis zo zdrojového PDF v `games_pdf` (`062`)
7. 🟠 Ligová fáza kompletná: 144 zápasov, dvojice, kolá, termíny, URL, štadióny
8. 🟠 Vyraďovacia časť založená (45 zápasov) — zatiaľ len termíny

### Aplikácia — používateľ

9. 🟠 Karta zápasu: logo, štát s vlajkou, štadión, FlashScore, blikajúci LIVE
10. 🟠 Priebežné skóre z livescore počas zápasu
11. 🟠 Prehľad: poradie v skupinách, aktuálny oznam s odkazom na históriu
12. 🟠 Správy: záložky **Oznamy** (história + hľadanie so zvýraznením) a **Správy**
13. 🟠 Zápasy aj Tabuľky sa obnovujú samy každých 30 s
14. 🟠 Farebné filtre fáz, tipy skupín zarovnané

### Aplikácia — admin

15. 🟠 Zápasy: tabuľka s logami, filtre fáz a kôl, editácia zápasu
16. 🟠 Výsledky: karty s tipmi **všetkých** hráčov a priebežnými bodmi
17. 🟠 Ručné zadanie živého skóre + prevzatie do výsledku
18. 🟠 Tabuľky: ručné poradie pri rovnosti bodov, popis formátu súťaže
19. 🟠 Testovacie nástroje: načítanie z PDF, posun dní, tipy a výsledky LF

### Livescore

20. 🟠 Sťahovanie z Flashscore cez model (`helpers/ucl_livescore_fn.php`)
21. 🟠 Cron `api/cron/ucl_livescore.php` — pripravený, čaká na zapnutie

### Overené

22. 🟠 Ligová tabuľka sa prepočítava po schválení výsledku
23. 🟠 Bodovanie tipov sedí — maximum 5 bodov v ligovej fáze
24. 🟠 Ručné poradie prežije prepočet, čísla zápasov sa aktualizujú
25. 🔲 Otestovať celú ligovú fázu, baráž a play-off

## Čo zostáva

### Pred spustením súťaže

| Úloha | Poznámka |
|---|---|
| 🔲 Zapnúť livescore cron | volať každých 5 minút s `?token=<CRON_SECRET>` |
| 🔲 Overiť štadión Vikinga | zápas s PSV 20. 1. 2027 má MHPArena, UEFA uvádza domáci štadión |
| 🔲 Deploy na `main` | všetko je zatiaľ len v `develop` |

Kluby ligovej fázy už majú oficiálne kódy UEFA. Osem klubov s dočasným `X`
(`XAAR`, `XARA`, `XKAU`, `XHAP`, `XMJA`, `XNEC`, `XCEL`, `XLEV`) sú kvalifikanti
bez zápasov — netlačí to.

### Testovanie

| Úloha | Poznámka |
|---|---|
| 🔲 Prejsť celú ligovú fázu | posúvať kolá cez **Posunúť hrací deň**, kontrolovať body a tabuľku |
| 🔲 Overiť baráž a play-off | dvojice zostaví nástroj **Zostaviť dvojice play-off** |
| 🔲 Overiť bodovanie play-off | 5 bodov za výsledok, maximum 7 |

### Po žrebe vyraďovacej časti

| Úloha | Poznámka |
|---|---|
| 🔲 Doplniť dvojice play-off | nástrojom **Zostaviť dvojice play-off**, po overení losu UEFA |
| 🔲 Doplniť štadióny a URL | do `games_pdf`, rovnako ako pri ligovej fáze |
| 🔲 Overiť postupový kľúč | súčet gólov z oboch zápasov, predĺženie až v odvete |

### Nice to have

| Úloha | Poznámka |
|---|---|
| 🟠 Zjednotiť históriu oznamov | hotové — všetky tri súťaže majú históriu v Správach → Oznamy |

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

### Domáci štadión klubu

Klub má v číselníku `home_venue` (migrácia `067`, naplnená z rozpisu podľa
najčastejšieho dejiska). Zápas si drží skutočné dejisko, takže keď sa líšia,
karta zápasu to označí ako **(iný štadión)**.

V ligovej fáze je taký zápas jediný — Viking hostí PSV 20. 1. 2027 na MHPArena
v Stuttgarte namiesto Lyse Arena.

### Livescore

Priebežné výsledky ťahá `api/cron/ucl_livescore.php` z Flashscore cez model.
Volať každých 5 minút:

```
https://dev_betclub.fellow.sk/api/cron/ucl_livescore.php?token=<CRON_SECRET>
```

Skript sám rozhodne, či má zmysel volať model — sťahuje iba zápasy, ktoré môžu
práve bežať (od 5 minút pred výkopom do 3 hodín po ňom). Mimo toho okna skončí
hneď a nič nestojí, takže cron môže bežať stále.

Zapisujú sa iba `ls_*` stĺpce a polčasové skóre. **Konečný výsledok schvaľuje
admin ručne** — body sa nepočítajú z neoverených údajov. Rovnakú prácu robí aj
tlačidlo v admine, logika je spoločná v `helpers/ucl_livescore_fn.php`.

Vyžaduje `api/config/openrouter.php` (kľúč nie je v repozitári).

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
| `tools/test_ucl_shift_day.cjs` | overí presun hracieho dňa |
| `tools/test_home_venue.cjs` | overí naplnenie domácich štadiónov |
| `tools/test_ucl_live.cjs` | overí ručné živé skóre a prevzatie do výsledku |
| `tools/test_ucl_manual_rank.cjs` | overí, že ručné poradie prežije prepočet |
| `tools/test_ucl_bracket.cjs` | overí zostavenie dvojíc a určenie víťazov |
| `tools/test_group_visibility.cjs` | overí viditeľnosť skrytých skupín |
| `tools/test_ucl_playoff_gen.cjs` | overí generovanie tipov a výsledkov v play-off |
| `tools/test_ucl_recalc_bulk.cjs` | overí, že hromadný prepočet dáva rovnaké body |
| `tools/test_ucl_bracket_view.cjs` | overí súčet gólov a víťazov v pavúku |
| `tools/test_ucl_freeze90.cjs` | overí zmrazenie 90 min a okno pre nočné zápasy |

### Odveta: prvý zápas a súčet

Pri odvete sa nad zápasom zobrazí **výsledok prvého zápasu a priebežný súčet**
za dvojicu — inak nie je vidieť, o čo sa vlastne hrá. Vidí to admin vo
Výsledkoch aj používateľ v Zápasoch a Prehľade.

Góly prvého zápasu vracia API už prehodené (`first_leg_home` patrí domácemu
tímu odvety), takže sa dajú rovno spočítať. Do súčtu ide zadaný výsledok,
a kým nie je, priebežné skóre z livescore.

Pri rovnosti súčtu sa píše *rozhodne predĺženie*; keď je zadané, rovno
*postupujú domáci/hostia po predĺžení*.

### Predĺženie a penalty

Livescore posiela **jediné skóre**. Keď zápas prejde do predĺženia, začne v ňom
hlásiť stav po predĺžení a 90-minútový výsledok by sa stratil — pritom práve
z neho sa počítajú body.

Pri prvom hlásení stavu *predĺženie* alebo *penaltový rozstrel* sa preto
doterajšie skóre odloží do `home_score_regular`. Zapisuje sa iba raz, takže
ďalší beh cronu ani ručný zásah admina neprepíše.

Zápasy sa nesledujú podľa dňa, ale v okne **−8 až +12 hodín** od aktuálneho
času. Večerný zápas s penaltami môže skončiť po polnoci a podľa dátumu by
z výberu vypadol práve vtedy, keď sa rozhoduje.

**Penalty sa rátajú ako jeden gól** pre víťaza: pri súčte 2:2 končí dvojica
3:2 alebo 2:3. Konečný výsledok preto nemôže byť remíza a nemôže byť nižší
ako po 90 minútach — server oboje kontroluje.

### Pavúk vyraďovacej časti

Obrazovka **Tabuľky** má dve záložky: *Ligová tabuľka* a *Vyraďovacia časť*.
Kým beží ligová fáza, zaujíma tabuľka; v play-off skôr pavúk.

Pavúk zobrazuje fázy vedľa seba (baráž → osemfinále → … → finále) a v každej
dvojice so **súčtom gólov** a zvýrazneným víťazom. Pod dvojicou sú výsledky
jednotlivých zápasov, prípadné predĺženie s poznámkou `pp`.

Súčet sa počíta **krížom** — domáci prvého zápasu je v odvete hosťom. Pri
rovnosti rozhoduje predĺženie alebo penalty v odvete (`home_score_final`).
Lepšie umiestnený tím hrá odvetu doma, preto sa v pavúku zobrazuje ako prvý.

Fáza bez zostavených dvojíc sa ukáže ako prázdna kostra, takže je vidieť, čo
súťaž ešte čaká. Dáta vracia `GET /v1/ucl/bracket`, pavúk sa obnovuje sám
každých 30 s.

### Ligová tabuľka

Poradie počíta `ucl_recalc_standings` podľa bodov, rozdielu skóre a strelených
gólov; pri úplnej rovnosti rozhoduje názov klubu.

Skutočné kritériá UEFA (vzájomné zápasy, disciplinárne body, koeficient)
aplikácia nepozná, preto **admin môže poradie prestaviť ručne** — v Tabuľkách
šípkami pri každom klube. Vymeniť sa dajú iba kluby s **rovnakým počtom bodov**;
poradie medzi rôznymi bodmi určujú výsledky. Stráži to rozhranie aj server.

Uložené poradie dostane príznak `finalized` a prepočet ho zachová — aktualizujú
sa iba čísla zápasov a gólov.

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

## Skryté skupiny

Skupiny boli verejné — v zozname ich videl každý a každý mohol požiadať o vstup.
Pri skupinách, kde sa hrá o peniaze, si zakladateľ nevedel vybrať, kto sa vôbec
dozvie, že skupina existuje.

| Viditeľnosť | Správanie |
|---|---|
| `public` (predvolená) | vidí každý, môže požiadať o vstup |
| `invite` | v zozname ju vidia **iba vymenovaní** |

**Vymenovanie nie je pozvánka.** Pozvánka je zároveň vstupenka — pozvaný ju len
prijme a je vnútri bez splnenia podmienky. Vymenovaný sa o skupine iba dozvie:
vidí ju v zozname aj s podmienkou vstupu, ale vstup si musí vypýtať žiadosťou
a zakladateľ ho schvaľuje ako doteraz.

Zoznam žije v `admin.group_viewers` (migrácia `069`) a spravuje ho zakladateľ
v detaile skupiny — vyberá zo šepkára používateľov. Pri každom mene vidí, či
už je členom alebo o vstup požiadal.

Skrytú skupinu okrem vymenovaných vidí zakladateľ a ten, kto v nej už figuruje
(prijatý, pozvaný aj čakajúci). **Prepnutie verejnej skupiny na skrytú teda
nikoho z nej nevyhodí.**

Žiadosť o vstup server odmietne tomu, kto v zozname nie je — inak by stačilo
uhádnuť `id` a viditeľnosť by nič neriešila.

### Ostatné prepínače skupiny

| Prepínač | Význam |
|---|---|
| **Členovia môžu pozývať** | člen smie pozvať ďalšieho; pre otvorené skupiny |
| **Uzavretá skupina** | zamkne zostavu — nikto nemôže požiadať o vstup ani poslať pozvánku, ani zakladateľ. Hodí sa po rozbehnutí súťaže. |
| **Skrytá skupina** | vidia ju len vymenovaní (vyššie) |

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

### 🕒 Posunúť hrací deň

Presunie všetky zápasy vybraného dňa na nový dátum. Prvý začne v zadanom čase
a každý ďalší o zvolený krok neskôr (predvolene 15 minút), takže sa dajú
odbavovať postupne a sledovať, ako pribúdajú body a mení sa tabuľka. Poradie
zápasov zostáva zachované.

Bez tohto by sa testovať nedalo — súťaž sa hrá od septembra 2026 do júna 2027.
Presun do budúcnosti zároveň znova otvorí tipovanie.

### 🏆 Zostaviť dvojice play-off

Doplní tímy do zápasov vyraďovacej časti — pri ostrej súťaži aj pri testovaní.

| Fáza | Účastníci | Nasadenie |
|---|---|---|
| Baráž | 9.–24. miesto tabuľky | 9. proti 24., 10. proti 23. … |
| Osemfinále | 1.–8. miesto + víťazi baráže | prvá osmička je nasadená |
| Štvrťfinále, semifinále, finále | víťazi predchádzajúcej fázy | najlepší proti najhoršiemu |

**Lepšie umiestnený tím hrá odvetu doma**, takže v prvom zápase je hosťom.

Víťaz dvojice sa určí zo **súčtu gólov oboch zápasov**; pri rovnosti rozhoduje
predĺženie alebo penalty v odvete (`home_score_final`). Kým výsledky nie sú
schválené, fáza sa tvári ako *čaká na výsledky* a tlačidlo je neaktívne.

Prestavenie fázy, na ktorej už sú tipy, si vyžiada potvrdenie — tipy sa viažu
na konkrétne dvojice.

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
- **LIVE** — blikajúci odznak nad skóre, kým zápas beží a výsledok nie je
  schválený; trieda `.liveBadge` je v `index.css`, spoločná pre prehľad
  aj zápasy. Pri zapnutom `prefers-reduced-motion` nebliká.

Rozklik **Tipy skupín** má pevné šírky stĺpcov (`table-layout: fixed`), inak sa
tabuľka roztiahne podľa najdlhšieho mena a skóre každej skupiny končí inde.
Číslice sú `tabular-nums`, takže tipy sedia pod sebou.

Štát prichádza z `admin.countries` cez krajinu klubu — zobrazuje sa slovenský
názov (`name_sk`), pri jeho absencii kód. Vlajku posiela API ako `home_flag` /
`away_flag`.

Prehľad (`UclDashboard`) zostáva kompaktný, štáty tam nie sú — je to zoznam
viacerých sekcií a údaj by ho zahustil.

#### Prehľad

Okrem zápasov a tipov obsahuje rovnaké sekcie ako FIFA:

- **Poradie v skupinách** — prvé tri miesta každej tipovacej skupiny a k nim
  vlastný riadok, keď je hráč nižšie. Dáta z `GET /v1/standings?competition_id=`,
  ktorý bodovanie UCL už pozná (`points_earned`, maximum 7).
- **Oznam organizátora** — iba aktuálny, s odkazom `História →` na
  `/spravy?tab=organizator`. Celý archív by prehľad zahltil.

Skupiny patria ku konkrétnej súťaži, preto sa načítajú až keď je známe
`activeCompetition.id`.

#### Správy

Obrazovka `/spravy` má dve záložky:

| Záložka | Obsah |
|---|---|
| **Oznamy** (prvá) | história oznamov organizátora s vyhľadávaním v texte |
| **Správy** | pôvodné vlákno s adminom |

Záložka sa dá otvoriť priamo odkazom cez `?tab=` — `organizator` alebo `admin`.
Aktuálny oznam je v zozname odlíšený žltým podkladom.

Hľadanie ignoruje diakritiku, takže „vitaz“ nájde aj „víťaz“ — a nájdený text
sa v správe **zvýrazní**. Normalizácia mení dĺžku textu (`ť` sa rozloží na dva
znaky), preto sa pozície prevádzajú znak po znaku a mapujú späť na pôvodný
reťazec; vďaka tomu zvýraznenie zachová písmená s diakritikou.

Obrazovka je spoločná pre všetky súťaže, oznamy nie sú viazané na ročník.

### Bodovanie

Overené: maximum 5 bodov v ligovej fáze, 7 v play-off.
Góly sa hodnotia nezávisle od výsledku — tip `1:1` pri výsledku `2:1` dá 1 bod
za správny počet gólov hostí.

Tipovať sa dá len zápas, ktorý má určené oba tímy — play-off zostáva zamknuté,
kým sa nedoplnia postupujúci.
