# BetClub — spoločný číselník štátov

## Stav a cieľ

Toto zadanie opisuje zjednotenie štátov a vlajok pre všetky súťaže BetClubu:

- IIHF 2026
- FIFA 2026
- Liga majstrov UEFA 2026/27 (`ucl2026`)
- budúce súťaže

Cieľom je mať **jeden spoločný číselník štátov** v schéme `admin`. Klub alebo reprezentácia nebude obsahovať vlastný názov štátu. Bude obsahovať iba odkaz na spoločný `country_code`.

Všetky zmeny sa robia výhradne v `dev_betclub` na vetve `develop`.

## Požadované údaje štátu

Každý štát v číselníku bude mať:

| Pole | Význam | Pravidlá |
|---|---|---|
| `country_code` | kód štátu | ISO 3166-1 alpha-3, presne 3 veľké písmená, primárny kľúč |
| `name_sk` | slovenský názov | povinný, zobrazovanie v slovenskom rozhraní |
| `name_en` | anglický názov | povinný |
| `name_original` | pôvodný názov | povinný alebo voliteľný podľa dostupnosti; názov v jazyku danej krajiny |
| `flag_file` | súbor vlajky | bezpečný názov súboru, napr. `svk.png`, bez cesty |
| `is_active` | aktívny štát | nevymazávať štát používaný historickými dátami, radšej deaktivovať |
| `created_at` | vytvorenie | automaticky |
| `updated_at` | posledná zmena | automaticky |

Kód štátu je stabilný identifikátor. Názvy a vlajka sú editovateľné údaje. Zmena názvu sa prejaví všade, kde sa štát používa.

## Cieľová databázová štruktúra

### `admin.countries`

```sql
country_code  VARCHAR(3) PRIMARY KEY
name_sk       VARCHAR(100) NOT NULL
name_en       VARCHAR(100) NOT NULL
name_original VARCHAR(100)
flag_file     VARCHAR(255) NOT NULL
is_active     BOOLEAN NOT NULL DEFAULT TRUE
created_at    TIMESTAMP NOT NULL DEFAULT NOW()
updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
```

Odporúčané obmedzenia:

- `country_code` iba veľké písmená A-Z, presne 3 znaky,
- všetky názvy musia byť neprázdne,
- `flag_file` môže obsahovať iba názov súboru s povolenou príponou,
- unikátny `flag_file`, ak sa jedna vlajka nemá používať pre viac kódov,
- mazanie štátu zakázať, ak ho používa tím; použiť `is_active = FALSE`.

### Väzby v súťažiach

Do tímových číselníkov doplniť `country_code` s FK na `admin.countries`:

- `iihf2026.teams.country_code`
- `fifa2026.teams.country_code`
- `"lm2026-27".teams.country_code`

Pri UCL treba odstrániť závislosť na dočasnom `"lm2026-27".countries` z migrácií `048`/`049`. Keďže tieto migrácie už boli spustené, riešenie musí byť nová migračná verzia, ktorá údaje prenesie do `admin.countries`, prepojí UCL FK a pôvodnú tabuľku ponechá iba dočasne alebo ju odstráni až po overení.

## Dôležitý rozdiel medzi tímom a štátom

- IIHF a FIFA používajú reprezentácie, preto `team_code` často vyzerá ako kód štátu.
- UCL používa kluby, preto `team_code` je kód klubu a nesmie sa používať ako kód štátu.
- Príklad: `SLOVAN` → `country_code = SVK` → zobrazenie `Slovan Bratislava (SVK)`.

Tento rozdiel musí byť rešpektovaný v API, tabuľkách, filtroch, tipoch, poradiach aj notifikáciách.

## Súčasný stav, ktorý treba zjednotiť

### Backend

- `iihf2026.teams` používa `code`, `name` a vlajky `team_flag_<code>.png`.
- `fifa2026.teams` používa `team_code`, `team_name` a vlajky `fifa_flag_<code>.png`.
- UCL admin API používa klubové `team_code`, dočasné `country_code`, `country_name` a `logo_file`.
- `api/v1/team-names.php` dnes vracia názvy odvodené z tímov a má vetvy iba pre FIFA/IIHF.
- UCL nemá používateľské API ani zjednotený verejný endpoint tímov.
- Notifikačné cron skripty používajú kódy tímov priamo.

### Frontend

Natvrdo zostavené vlajkové URL sú minimálne v týchto miestach:

- `web/src/components/Flag.jsx`
- `web/src/pages/user/Games.jsx`
- `web/src/pages/user/Dashboard.jsx`
- `web/src/pages/user/GroupStandings.jsx`
- `web/src/pages/user/Standings.jsx`
- `web/src/pages/user/FifaGames.jsx`
- `web/src/pages/user/FifaDashboard.jsx`
- `web/src/pages/user/FifaGroupStandings.jsx`
- `web/src/pages/user/FifaThirdPlaced.jsx`
- `web/src/pages/admin/AdminGames.jsx`
- `web/src/pages/admin/AdminResults.jsx`
- `web/src/pages/admin/FifaAdminGames.jsx`
- `web/src/pages/admin/FifaAdminResults.jsx`
- `web/src/pages/admin/AdminGroupStandings.jsx`
- `web/src/pages/admin/FifaAdminGroupStandings.jsx`

Súčasné pravidlá `team_flag_*` a `fifa_flag_*` treba nahradiť jedným mapovaním na `admin.countries.flag_file`.

### Assety

- IIHF vlajky sú v `web/public/flags/team_flag_*.png`.
- FIFA vlajky sú v `web/public/flags/fifa_flag_*.png`.
- Mnohé štáty existujú iba v jednom z týchto formátov.
- Treba vybrať jeden cieľový formát, doplniť chýbajúce vlajky a pre každý záznam nastaviť `flag_file`.
- Nepriraďovať vlajku iba podľa názvu tímu; rozhodujúci je `country_code`.

Odporúčaný cieľový formát:

```text
web/public/flags/countries/<country_code lowercase>.png
```

Príklady:

```text
web/public/flags/countries/svk.png
web/public/flags/countries/cze.png
web/public/flags/countries/eng.png
```

Pôvodné súbory ponechať počas prechodného obdobia, aby sa nerozbili staré buildy a cache. Po migrácii všetkých referencií možno staré duplikáty odstrániť samostatným krokom.

## Admin rozhranie

V **Nástroje** vytvoriť spoločnú sekciu **Číselníky** nezávislú od aktívnej súťaže.

### Obrazovka Štáty

Tabuľka:

- vlajka,
- kód štátu,
- slovenský názov,
- anglický názov,
- pôvodný názov,
- počet používaných tímov,
- stav aktívny/neaktívny,
- akcie.

Editor štátu:

- kód štátu,
- slovenský názov,
- anglický názov,
- pôvodný názov,
- výber alebo názov súboru vlajky,
- náhľad vlajky,
- uložiť,
- deaktivovať/aktivovať.

Pravidlá editácie:

1. Zmena názvu aktualizuje jediný spoločný záznam a okamžite sa prejaví vo všetkých súťažiach.
2. Zmena kódu musí v transakcii prepojiť všetky tímy vo všetkých súťažiach.
3. Ak nový kód existuje, musí sa zobraziť varovanie a admin musí potvrdiť zlúčenie alebo operácia nesmie pokračovať automaticky.
4. Štát používaný tímami sa nesmie fyzicky zmazať.
5. Zmena alebo odstránenie vlajky nesmie vytvoriť nefunkčný obrázok; pred uložením overiť existenciu súboru.

### Obrazovka Kluby

UCL klubový číselník bude mať:

- logo klubu,
- kód klubu,
- názov klubu,
- výber štátu z `admin.countries` zobrazovaný ako `Slovakia (SVK)`,
- editáciu loga klubu.

Názov štátu sa už nebude editovať v obrazovke klubu.

## API návrh

Verejné endpointy:

- `GET /v1/countries` — aktívne štáty pre používateľskú časť,
- `GET /v1/countries?all=1` — podľa oprávnenia aj neaktívne štáty,
- tímové endpointy vracajú `country_code`, `country_name_sk`, `country_name_en`, `country_name_original`, `flag_file`.

Admin endpointy:

- `GET /v1/admin/countries`
- `POST /v1/admin/countries`
- `PUT /v1/admin/countries`
- `DELETE /v1/admin/countries` — iba ak štát nie je použitý; inak 409 alebo deaktivácia.

Odporúčané spoločné API údaje tímu:

```json
{
  "team_code": "SLOVAN",
  "team_name": "Slovan Bratislava",
  "country_code": "SVK",
  "country_name_sk": "Slovensko",
  "country_name_en": "Slovakia",
  "country_name_original": "Slovensko",
  "flag_file": "svk.png"
}
```

## Migračný postup

1. Vytvoriť `admin.countries` a potrebné granty.
2. Zostaviť importný zoznam všetkých štátov z IIHF, FIFA a UCL CSV.
3. Zjednotiť kódy štátov na ISO alpha-3.
4. Doplniť slovenské, anglické a originálne názvy.
5. Doplniť jednu cieľovú vlajku pre každý štát.
6. Doplniť `country_code` do IIHF a FIFA tímov.
7. Migrovať UCL štáty z `"lm2026-27".countries` do `admin.countries`.
8. Prepojiť všetky tímové tabuľky FK na `admin.countries`.
9. Aktualizovať všetky backend endpointy a cron skripty.
10. Aktualizovať všetky frontend komponenty, filtre a zobrazenia.
11. Pridať spoločnú admin obrazovku Štáty.
12. Zmeniť UCL obrazovku Kluby na výber štátu z globálneho číselníka.
13. Odstrániť staré súťažné mapovania vlajok až po overení.

Migrácie musia byť idempotentné alebo bezpečne kontrolovať existujúce stĺpce, constrainty a dáta. Každá migrácia sa najprv spúšťa iba na DB-DEV-BET.

## Testovací plán

### Databáza a migrácie

- vytvorenie `admin.countries` na databáze bez dát,
- opakované spustenie každej migrácie,
- import bez duplicitných kódov,
- kontrola všetkých FK,
- kontrola, že každý tím má platný `country_code`,
- kontrola, že každý `flag_file` existuje,
- kontrola grantov pre `dbbet-admin`,
- kontrola rollback scenára pri chybe v polovici transakcie,
- kontrola migrácie existujúcej UCL tabuľky `"lm2026-27".countries`.

### Admin číselník štátov

- vytvorenie štátu,
- úprava slovenského názvu,
- úprava anglického názvu,
- úprava originálneho názvu,
- zmena vlajky,
- deaktivácia nepoužívaného štátu,
- odmietnutie zmazania používaného štátu,
- zmena kódu štátu a prepojenie tímov v IIHF, FIFA aj UCL,
- konflikt pri zmene na už existujúci kód,
- ochrana pred cestou v názve súboru vlajky,
- zobrazenie počtu tímov.

### Admin číselník klubov

- výber existujúceho štátu,
- odmietnutie neexistujúceho kódu štátu,
- zmena klubu bez zmeny štátu,
- zmena štátu klubu,
- zobrazenie loga klubu,
- neexistujúce logo zobrazí bezpečný fallback,
- dlhé názvy a úzka obrazovka,
- editor funguje na desktopoch aj mobiloch.

### Používateľská časť

- IIHF zápas zobrazuje správnu vlajku a slovenský názov štátu,
- FIFA zápas zobrazuje správnu vlajku a slovenský názov štátu,
- UCL klub zobrazuje logo klubu a štát ako `Názov klubu (KÓD)`,
- tooltip vlajky zobrazuje slovenský názov,
- filtre tímov ostanú funkčné,
- tabuľky, poradie, dashboard a rozklik tipov používajú rovnaký štát,
- žiadny komponent nepoužíva staré `team_flag_`/`fifa_flag_` URL po migrácii,
- neznámy kód má fallback bez rozbitia layoutu.

### Notifikácie a ostatné procesy

- email/push notifikácie obsahujú správny názov tímu a nemenia sa podľa typu súťaže,
- cron joby fungujú pre IIHF, FIFA aj UCL,
- admin výsledky a výber tímov používajú správne klubové logo/reprezentačnú vlajku,
- globálne poradie a história tipov nemenia existujúce dáta,
- PWA cache po deployi načíta nové vlajky.

### Regresné testy

- FIFA obrazovky a filtre,
- IIHF obrazovky a filtre,
- UCL admin číselník,
- mobilné breakpointy,
- prihlásenie a oprávnenia admin/user,
- API 401/403/404/409 odpovede,
- build frontend,
- syntax všetkých nových PHP súborov,
- produkčný `main` zostane bez zmien.

## Akceptačné kritériá

Práca je hotová, keď:

- existuje jeden `admin.countries` číselník,
- každý štát má kód, slovenský, anglický a originálny názov a funkčnú vlajku,
- IIHF, FIFA aj UCL tímy používajú spoločný `country_code`,
- admin upravuje štáty na jednom mieste,
- zmena štátu sa prejaví vo všetkých súťažiach,
- používateľské rozhranie nepoužíva súťažné hardcoded mapovanie vlajok,
- všetky migračné a regresné testy prejdú na develop,
- zmeny sú pushnuté iba na `develop`.

## Import zdrojového CSV štátov

Zdroj: `sources/flags/state_flag_list.csv` (254 štátov) + 508 vlajok v `sources/flags/`.
Detaily formátu: `sources/countries/README.md`.

### Kódy štátov vs športové kódy

Číselník je **ISO 3166**. Súťaže používajú vlastné športové kódy, ktoré sa od ISO líšia
v 21 prípadoch a navzájom aj medzi sebou:

| Štát | ISO | FIFA | IIHF | UEFA |
|---|---|---|---|---|
| Slovinsko | `SVN` | — | `SLO` | `SVN` |
| Lotyšsko | `LVA` | — | `LAT` | `LVA` |
| Nemecko | `DEU` | `GER` | `GER` | `GER` |
| Anglicko | `GB-ENG` | `ENG` | — | `ENG` |
| Spojené kráľovstvo | `GBR` | — | `GBR` | — |

Posledné dva riadky nie sú len iný kód, ale iný subjekt: IIHF má jeden britský tím,
futbal má štyri samostatné krajiny.

Preto má `admin.countries` stĺpce `sport_code_fifa`, `sport_code_iihf`, `sport_code_uefa`.
Aplikácia si pri každom športe povie, ktorý kód zobrazuje.

### Stav

1. ✅ Migrácia `052` — rozšírenie tabuľky (spustená na DB-DEV-BET)
2. 🟠 Migrácia `053` — športové kódy a uvoľnený formát kódu (`GB-ENG`)
3. 🟠 Migrácia `054` — vyprázdnenie číselníka a import 254 štátov
4. 🟠 508 vlajok skopírovaných do `web/public/flags/`
5. 🟠 Admin API a obrazovka Štáty rozšírené o športové kódy a vyhľadávanie
6. 🔲 Spustiť `053` a `054` na DB-DEV-BET
7. 🔲 Prepnúť IIHF/FIFA/UCL zobrazenia na `flag_file` a športové kódy z číselníka
8. 🔲 Odstrániť pozostatok `"lm2026-27".teams.country_name` a tabuľku `"lm2026-27".countries`

Migrácia `054` beží v jednej transakcii: odpojí FK klubov, vyprázdni číselník, nahrá dáta,
premapuje kluby z UEFA kódov na ISO, overí platnosť a až potom FK znova napojí.
Pri chybe sa nezmení nič.
