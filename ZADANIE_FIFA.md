# BetClub — Zadanie platformy (FIFA 2026 + IIHF 2026)
## LIVESCORE
https://dashboard.sportdb.dev/api-keys: 2sJeeo35xgIMNx0mNZumlDFc2YKBpiUyKmBE0VV0
> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

---

## ⚠️ PRACOVNÉ PRAVIDLÁ (vždy dodržiavať)

1. **Push iba na `develop`** — na `main` NIKDY automaticky, iba na samostatný explicitný pokyn
2. **Komunikácia v slovenčine** — všetka komunikácia s userom prebieha po slovensky
3. **Na `develop` sa nepýtam** — zmeny vykonávam priamo bez čakania na potvrdenie; pýtam sa len pri deploy na main alebo deštruktívnych operáciách

---

## STAV IMPLEMENTÁCIE — PREHĽAD

✅ *BetClub platforma + FIFA modul nasadený na produkciu (betclub.fellow.sk).*
Web funkčný: multi-turnaj, FIFA zápasy/tipy/tabuľky/poradie/tretie miesta, admin (výsledky, živé skóre, bracket, finalizácia), generovanie testovacích dát, impersonácia, token-versioning, flashscore ikony, BetClub favicon + PWA ikony, pozvánky (soft delete, BetClub text), impersonácia opravená (tv claim).
Zostáva: Android.

---

## Prehľad — BetClub platforma

Aplikácia sa volá **BetClub** — multi-turnajová tipovačka pre skupinu priateľov.

- Zdieľaný používateľský systém (registrácia, login, profil, avatar) pre všetky turnaje
- Menu sa **nemení** — rovnaká navigácia ako pri IIHF (Zápasy, Skupiny, Poradie, Dashboard...)
- V **Profile** pribudne záložka **Súťaže** — user si vyberie aktívny turnaj
- Všetky stránky zobrazujú dáta pre aktuálne zvolený turnaj
- Skupiny priateľov sú per-turnaj — každý turnaj má vlastné skupiny
- Autor skupiny môže jedným klikom pozvať všetkých členov z existujúcej skupiny do novej (iný turnaj)

---

## Navigácia — záložka Súťaže v Profile

```
Profil → záložka Súťaže → výber aktívneho turnaja
                            ↓
          Zápasy / Skupiny / Poradie / Dashboard
          (zobrazujú dáta pre zvolený turnaj)
```

- Aktívny turnaj viditeľný v sidebari — malý badge/label (napr. „🏒 IIHF 2026" alebo „⚽ FIFA 2026")
- Výber sa ukladá do DB (`users.active_competition_id`)

---

## Lokálna štruktúra projektu

| Adresár | Vetva | Účel |
|---|---|---|
| `D:\AI\Claudecode\betclub\` | `main` | Produkčná verzia — zdrojáky pre betclub.fellow.sk |
| `D:\AI\Claudecode\dev_betclub\` | `develop` | Vývojová verzia — zdrojáky pre dev_betclub.fellow.sk |

Implementácia: **git worktree** — jeden `.git` adresár v `betclub\`, `dev_betclub\` je worktree.

**Postup nastavenia (po manuálnom premenovani v Prieskumníkovi):**
```
# 1. Premenuj D:\AI\Claudecode\iihf2026 → betclub  (manuálne, VSCode musí byť zatvorený)
# 2. V betclub — prepni na main
cd D:\AI\Claudecode\betclub
git checkout main
# 3. Pridaj worktree pre develop
git worktree add ..\dev_betclub develop
# 4. Nakopíruj db.php do dev_betclub\api\config\db.php  (nie je v gite)
```

Po nastavení: vždy pracuj v `dev_betclub\` (vetva `develop`).

---

## Infraštruktúra

| | Dev (`develop` vetva) | Prod (`main` vetva) |
|---|---|---|
| **Lokálny adresár** | `D:\AI\Claudecode\dev_betclub\` | `D:\AI\Claudecode\betclub\` |
| **Web URL** | dev_betclub.fellow.sk | betclub.fellow.sk |
| **API** | dev_betclub.fellow.sk/api | betclub.fellow.sk/api |
| **Databáza** | DB-DEV-BET | DB-BET |
| **db.php** | manuálne na dev serveri + lokálne | manuálne na prod serveri |
| **Deploy** | GitHub Actions → FTP (develop push, automaticky) | GitHub Actions → FTP (main push, iba na pokyn) |

> **Pravidlo:** Všetko vyvíjame v `dev_betclub\` (develop) → deploy do DB-DEV-BET / dev_betclub.fellow.sk. Na `betclub\` (main) / DB-BET nikdy automaticky.

**db.php pre dev_betclub:**
```php
define('DB_NAME',    'DB-DEV-BET');
define('DB_USER',    'dbbet-admin');
define('APP_URL',    'https://dev_betclub.fellow.sk');
// ostatné (host, port, pass, JWT, cron) rovnaké ako prod
```

---

## DB architektúra — záväzné pravidlo

> **Každá súťaž má vlastnú DB schému. Spoločné tabuľky sú výhradne v schéme `admin`.**

| Schema | Obsah |
|---|---|
| `admin` | users, invites, friend_groups, group_members, notification_settings, notification_log, login_logs, mail_log, announcements, user_push_subscriptions, **competitions** |
| `iihf2026` | teams, games, tips, scoring_config, group_standings, livescore_daily, games_pdf |
| `fifa2026` | teams, games, tips, scoring_config, group_standings *(+ FIFA-špecifické)* |
| *(budúce súťaže)* | každá dostane vlastnú schému |

---

## FIFA 2026 — základné info

- **Dátumy:** 11. júna – 19. júla 2026
- **Hostiteľské krajiny:** USA, Kanada, Mexiko
- **Tímy:** 48 krajín
- **Zápasy celkom:** 104
- **Formát:**
  - Skupinová fáza: 12 skupín (A–L) po 4 tímy = 72 zápasov
  - Postup: top 2 z každej skupiny + 8 najlepších 3. miest → 32 tímov
  - Round of 32: 16 zápasov → Round of 16: 8 zápasov → ŠF: 4 → SF: 2 → Finále + Bronze

---

## Bodovací systém FIFA

Hodnotí sa vždy **90-minútový výsledok** (výhra/remíza/prehra). Predĺženie a penalty sa do tipu nepočítajú.

### Skupinová fáza

| Situácia | Body |
|---|---|
| Správny výsledok (V / R / P) | **3 body** |
| Správny počet gólov domácich | **+1 bod** |
| Správny počet gólov hostí | **+1 bod** |
| **Maximum za zápas** | **5 bodov** |

### Play-off (R32, R16, QF, SF, Bronz, Finále)

| Situácia | Body |
|---|---|
| Správny výsledok (V / R / P po 90 min) | **5 bodov** |
| Správny počet gólov domácich (90 min) | **+1 bod** |
| Správny počet gólov hostí (90 min) | **+1 bod** |
| **Maximum za zápas** | **7 bodov** |

> **Poznámka k play-off:** Admin zadáva dva výsledky — skóre po 90 min (základ pre vyhodnotenie tipu) a finálny výsledok po ET/penalties (len informačne). V predĺžení nie je zlatý gól — môže byť napr. 0:0 po 90 min a 2:1 po ET.

---

## Skupiny priateľov

- Skupiny sú **per-turnaj** (competition_id v DB)
- Autor skupiny môže **hromadne pozvať** všetkých členov z inej existujúcej skupiny
- Ostatné pravidlá rovnaké ako pri IIHF

---

## Postup zo skupín a play-off zápasy

1. Systém automaticky vypočíta poradie v 12 skupinách po skupinovej fáze
2. Systém navrhne 8 postupujúcich 3. miest (podľa FIFA pravidiel: body → skóre → góly → abeceda)
3. Admin skontroluje návrh a **potvrdí** postup (môže upraviť)
4. Admin **ručne zadá** zápasy Round of 32 (kto hrá s kým) — bracket závisí od výsledkov
5. Rovnaký postup pre každé ďalšie kolo (R16, QF, SF)
6. Tipéri tipujú play-off zápasy rovnako ako skupinové

---

## Live výsledky

- **Manuálne** — admin zadáva výsledky cez admin rozhranie (automatické API nie je plánované)

---

## Čo treba vytvoriť — plán implementácie

### FÁZA 1 — Nastavenie projektu (pred kódovaním)

- ✅ Premenovať `iihf2026` → `betclub` (manuálne v Prieskumníkovi)
- ✅ `git checkout main` v `betclub\`
- ✅ `git worktree add ..\dev_betclub develop`
- ✅ Nakopírovať `db.php` (DB-DEV-BET) do `dev_betclub\api\config\`
- ✅ Manuálne nahrať `db.php` (DB-DEV-BET) na dev server `/sub/dev_betclub/api/config/`

### FÁZA 2 — Multi-turnaj DB migrácia (024_competitions.sql)

Cieľ: pridať `competitions` vrstvu bez straty IIHF dát. Existujúce záznamy dostanú `competition_id = 1`.

| Tabuľka | Zmena |
|---|---|
| `admin.competitions` | **NOVÁ** — id, slug, name, sport, season, is_active |
| `admin.users` | `+ active_competition_id` FK → competitions, DEFAULT 1 |
| `admin.friend_groups` | `+ competition_id` FK → competitions, DEFAULT 1 |
| `admin.notification_log` | `+ competition_id INT DEFAULT 1`, zrušiť hard FK na `iihf2026.games` |
| `iihf2026.*` | bez zmeny — všetky dáta ostávajú |
| `fifa2026.*` | **NOVÁ schema** — teams, games, tips, scoring_config, group_standings |

Poradie migrácie:
1. CREATE `admin.competitions`, INSERT IIHF 2026 (id=1), FIFA 2026 (id=2)
2. ALTER `admin.friend_groups` ADD `competition_id` DEFAULT 1
3. ALTER `admin.users` ADD `active_competition_id` DEFAULT 1
4. ALTER `admin.notification_log` — drop FK, add `competition_id` DEFAULT 1
5. CREATE SCHEMA `fifa2026` + tabuľky

- ✅ Napísať a spustiť `api/migrations/024–034` na DB-DEV-BET — hotovo
  - 024 competitions, 025 FIFA dáta, 026 standings seed, 027 rename IIHF, 028 scoring,
    029 flashscore, 030 renumber, 031 games_pdf master, 032 knockout fix, 033 renumber po fix, 034 livescore

### FÁZA 3 — Backend API

- ✅ `GET /api/v1/competitions` — zoznam turnajov (aktívna vždy prvá)
- ✅ `POST /api/v1/competitions/active` — nastavenie aktívneho turnaja usera
- ✅ `GET /api/v1/profile` — vracia aj `active_competition_id`
- ✅ IIHF endpointy zostávajú IIHF-only (rozhodnuté)
- ✅ FIFA endpointy: `/api/v1/fifa/games`, `/api/v1/fifa/tips`, `/api/v1/fifa/standings`, `/api/v1/fifa/teams`
- ✅ Admin FIFA backend: `fifa-game-update`, `fifa-game-edit`, `fifa-game-teams`, `fifa-game-tips`, `fifa-game-live`, `fifa-recalc`, `fifa-group-standings`, `fifa-test-setup`, scoring_config
- ✅ Import 48 tímov a 104 zápasov FIFA do DB
- ✅ Knockout rozpis opravený podľa oficiálneho rozpisu (časy/štadióny), zápasy prečíslované podľa dátumu
- ✅ Pozvánky: kontrola duplikátov (čakajúce aj použité, s menom hráča), zrušenie pozvánky
- ✅ Impersonácia: `/api/v1/admin/impersonate` (admin prihlásenie ako iný user)

### FÁZA 4 — Frontend React

- ✅ `CompetitionContext` — globálny kontext aktívneho turnaja
- ✅ Záložka **Súťaže** v Profile — loga turnajov, aktívna vždy prvá
- ✅ Loga BetClub + turnaja v sidebari, názov turnaja pod nimi
- ✅ Dispatcher pre všetky stránky (Zápasy, Skupiny, Poradie, Dashboard, Tabuľky, admin)
- ✅ FIFA stránky: Zápasy (filtre GRP/A–L/knockout, vlajky, vlajkový filter, default kolo podľa dátumu, LIVE bar), Tabuľky A–L + tabuľka tretích miest, Prehľad (tip modal), Poradie
- ✅ Dashboard: nearest games + standings len pre aktívny turnaj, tip modal po kliknutí
- ✅ Poradie: per-competition, bodovanie FIFA (group 3+1+1, playoff 5+1+1)
- ✅ Admin FIFA UI: Zápasy (jednotná tabuľka, Upraviť modal s tímami/stavom/výsledkom/flashscore), Výsledky (90 min + ET, bracket výber, živé skóre, Prevziať Livescore, priebežné body), Tabuľky (sync/reset/finalizácia/presúvanie + tabuľka tretích miest + globálna tabuľka všetkých tipérov), Skupiny
- ✅ Admin Nástroje: záložky (Prihlasovanie/FIFA/IIHF/Common), FIFA generovanie základnej časti + Načítať master + Spustenie súťaže

### FÁZA 5 — Skupiny — hromadná pozvánka

- ✅ Backend: `group-invite-bulk` — status=invited, refresh po pozvaní
- ✅ Frontend: Pozvať zo skupiny (cross-competition), Zrušiť pozvánku, per-competition filter skupín

### Tabuľka tretích miest (8 najlepších postupuje)

- ✅ User: Tabuľky aj Zápasy → TAB
- ✅ Admin: presúvanie + samostatná finalizácia (povolená až po finalizácii všetkých skupín), uloženie ako phase `3P`

### Tipy skupín so živými bodmi (parita s IIHF)

- ✅ Zápasy (live + uzavreté) → ▼ Tipy skupín; Prehľad → klik na zápas otvorí modal
- ✅ Priebežné body z livescore (group 3+1+1 / playoff 5+1+1); len skupiny daného turnaja

### Bodovanie / validácie FIFA

- ✅ Predĺženie len pri remíze po 90 min; konečný výsledok musí mať víťaza, nesmie byť nižší ako 90 min (FE+BE)
- ✅ Zákaz zadania výsledku pred začiatkom zápasu
- ✅ Zarovnaný rozpad bodov 7–0 (mriežka) v Poradí aj admin Skupinách
- ✅ Zobrazenie konečného výsledku po predĺžení userom (`X:Y (A:B pp)`) v Zápasoch aj Prehľade

### Migrácie spustené

| Migrácia | DB-DEV-BET | DB-BET (prod) |
|---|---|---|
| 024–036 | ✅ | ✅ |
| 037 FIFA flashscore URL | ✅ | ✅ |
| 038 group description 1000 | ✅ | ✅ |
| 039 invites cancelled_at | ✅ | ✅ |
| 040 password_reset_tokens | ✅ | ✅ |
| 041 group invite flags (allow_member_invite + is_closed) | ✅ | ✅ |
| 042 admin.messages (chat user↔admin) + GRANT | ✅ | ✅ |
| 043 messages.image_url + body nullable | ✅ | ✅ |

---

## Platforma

- ✅ Web aplikácia — React + Vite PWA — betclub.fellow.sk (prod) + dev_betclub.fellow.sk (dev)
- 🔲 Android aplikácia — Kotlin (neskôr, nie je priorita)

---

## Čo zostáva (TODO)

1. ✅ **Notifikácie pre FIFA** — `send_notifications_fifa.php` (game_start/untipped/result_entered), zdielané nastavenia, dedup `fifa_` prefix
2. ✅ **Deploy na produkciu** — betclub.fellow.sk, DB-BET, migrácie 024–038 spustené, db.php nastavený
3. ✅ **Token-versioning** — `token_version` per user; inkrement pri zmene hesla aj admin-revoke; tokeny bez `tv` odmietnuté; migrácia 036
4. ✅ **BetClub favicon** — kruhové logo z betclub_logo_source.png
5. ✅ **FIFA flashscore URL** — skupinová fáza (game_id 1–72), migrácia 037; R32+ doplniť po zostavení parov
6. ✅ **Admin Skupiny** — klik na názov zobrazí popis skupiny (▼/▲)
7. ✅ **Popis skupiny 1000 znakov** — migrácia 038, frontend maxLength
8. ✅ **Text pozvánky** — aktualizovaný na BetClub (všeobecný, vykanie), admin aj user, text kopírovania
9. ✅ **Všetci useri** — active_competition_id nastavené na FIFA (id=2)
10. ✅ **PWA manifest** — BetClub názov, ikony 192/512 (prod + dev variant)
11. ✅ **Impersonácia opravená** — chýbajúci `tv` claim spôsoboval okamžitý logout (v4.11)
12. ✅ **Pozvánky soft delete** — cancelled_at, stav Zrušená, duplicita ignoruje zrušené, admin aj user môže zrušiť (migrácia 039)
13. ✅ **Skupiny default filter** — Všetky namiesto Moje
14. ✅ **Migrácia 039** — spustená na DB-DEV-BET aj DB-BET
15. ✅ **Menu ikony** — vlastné obrázkové ikony navigácie z `sources/menu/` (Prehľad/Zápasy/Tabuľky/Skupiny/Profil/Pravidlá), transparentné rohy, sidebar 34px + bottom nav 30px; profil v mobile zobrazí avatar ak ho má
16. ✅ **Mobil Zápasy filtre** — menšie tlačidlá filtrov (≤480px) aby sa TAB zmestil na obrazovku
17. ✅ **Rozklik tipov v Skupinách** — flex layout (nie vnorená tabuľka), body vždy viditeľné aj na mobile; vlajka1/tím1/:/vlajka2/tím2 zarovnané stĺpce; mobil zápas pevných 110px
18. 🟠 **História správ organizátora na Prehľade (FIFA)** — FifaDashboard doplnený o sekciu „História správ organizátora" (archív neaktívnych oznamov), rovnako ako v IIHF Dashboarde; predtým futbal zobrazoval len aktuálny oznam
18c. 🟠 **Admin štart → Výsledky** — admin po prihlásení/štarte appky padá na obrazovku Výsledky (`/admin/results`) namiesto Users (App.jsx: HomeRedirect, admin index, redirect z user rout).
18d. 🟠 **Skupiny — oprava zobrazenia bodov** — dlhé mená hráčov tlačili stĺpce rozpadu bodov (1 a 0) mimo obrazovku. Meno sa teraz skracuje (ellipsis, `playerName`/`playerCell`), mobilné buckety 19→17px, tesnejšie paddingy, súčet Body posunutý kúsok doľava. Standings.jsx + Standings.module.css.
18b. 🟠 **Auto-prepočet tabuliek skupín** — skupinové tabuľky boli nulové, lebo `group_standings` sa prepočítaval len manuálnym POST sync-om. Logika presunutá do `helpers/fifa_standings_fn.php::fifa_recalc_standings()` a volá sa teraz automaticky v `fifa_game_edit.php` pri každej zmene stavu výsledku skupinového zápasu (schválenie aj zrušenie). POST admin endpoint volá tú istú funkciu (fallback). **Pozn.:** existujúce odohrané zápasy treba raz manuálne presynchronizovať (POST /v1/admin/fifa-group-standings), potom už beží samo.
19. 🔲 **Android aplikácia** (Kotlin) — neskôr, nie priorita
20. 🟡 *Nice-to-have:* automatické párovanie knockout bracketu z víťazov skupín (teraz manuálne)

---

## Nápady na vylepšenia (backlog)

| # | Nápad | Priorita |
|---|---|---|
| 1 | **Email pri registrácii** — uvítací mail po úspešnej registrácii. Email z pozvánky sa uloží do profilu. | ✅ otestované |
| 2 | **Zabudnuté heslo** — odkaz na prihlasovacej obrazovke, reset link cez email (1h), migrácia 040. Pravidlá: červená poznámka o emaili. | ✅ otestované |
| 3 | **Skupinové udalosti (notifikácie)** — push + email pri pozvánke do skupiny a schválení vstupu. | ✅ otestované |
| 4 | **Upozornenie pred uzavretím tipu** — push 30 min pred zápasom, rozlíši tip/bez tipu. IIHF aj FIFA cron. | 🟠 implementované, otestuje sa počas turnaja |
| 5 | **Dashboard — nezatipovaný zápas** — sekcia nezatipovaných zápasov na dnes a zajtra. | ✅ už implementované |
| 6 | **História tipov + graf vývoja** — accordion tipov hráča v Poradí + line chart vývoja bodov (Recharts). Vlajky, dátum, zarovnané skóre. | ✅ otestované |
| 7 | **Hromadné zadanie výsledkov** — nie je potrebné, futbalové zápasy nejdu naraz, admin zadáva po jednom cez livescore. | ❌ nepotrebné |
| 8 | **Export výsledkov** — CSV export poradia skupiny. | ❌ nepotrebné |
| 9 | **Správy/chat** — správa adminovi + jednoduchý chat pre tipérov v skupine. Nie sociálna sieť. Riešiť ako úplne posledné. | ✅ chat s adminom v produkcii (text+obrázky); user↔user neimplementované (zámerne) |
| 10 | **Štatistiky usera** — úspešnosť, najlepší/najhorší zápas, streak. | 🔲 dlhodobé |
| 11 | **Sieň slávy** — po skončení každého turnaja sa uloží finálne globálne poradie. Top 10 dostane body (1.=10, 2.=9, ... 10.=1, od 11.=0). Tri tabuľky: (a) Globálna (všetky turnaje), (b) Futbalová (FIFA, LM, ME, Olympiáda...), (c) Hokejová (MS, Olympiáda...). Body sa kumulujú naprieč turnajmi v rámci športu — tipér súťaží len v tom športe ktorý tipuje. Klik na hráča rozroluje turnaje kde získal body (accordion). | ✅ produkcia (naplní sa po skončení 1. turnaja) |

### Obrazovka Skupiny — záložky ✅ (main/prod)

Obrazovka **Skupiny** má 3 záložky (ako Profil):
- **\<názov turnaja\>** — ✅ pôvodná funkcionalita (prvá záložka nesie názov aktuálneho turnaja): skupiny pre zvolený turnaj, poradie hráčov, body, rozklik tipov + graf. Názov roztiahnutý po tlačidlo Graf.
- **Global** — ✅ všetci tipéri po turnajoch (každý turnaj = jedna „skupina"), zoradené podľa dátumu turnaja (najnovší prvý → FIFA, potom IIHF). Endpoint `GET /v1/global-standings`. Rozklik tipov + graf fungujú per-turnaj.
- **Sieň slávy** — ✅ implementované. Endpoint `GET /v1/hall-of-fame`. **Dynamický** výpočet (žiadna tabuľka): turnaj je „skončený" ak majú všetky jeho zápasy zadaný výsledok → finálne poradie tipérov → body top 10 (1.=10b … 10.=1b, pevná pozícia + tiebreak 7/6/5...). Pri zmene výsledku sa prepočíta automaticky. Šport z `competitions.sport`. 3 pod-záložky: Globálna / Futbal / Hokej. Klik na hráča = accordion s turnajmi a získanými bodmi. *(Naplní sa až po skončení 1. turnaja — IIHF máj / FIFA jún 2026.)*
- **Graf tooltip** — ✅ zoradené poradie podľa bodov v danom bode grafu (najvyšší navrchu, s číslom pozície).

### Skupiny — príznaky pozvánok ✅ (produkcia, migrácia 041)

- **allow_member_invite** (default zapnuté) — keď zakladateľ vypne, bežní členovia nevidia pole „Pozvať" a skupina sa neobjaví ako **zdroj** v bulk invite (nikoho z nej nemožno hromadne prevziať inam). Zakladateľ pozýva vždy.
- **is_closed** (default vypnuté) — uzavretá skupina: žiadne pozvánky (ani zakladateľ), žiadne žiadosti o vstup. V zozname badge „🔒 Uzavretá", tlačidlo Vstúpiť skryté.
- Zakladateľ prepína oba príznaky checkboxmi v rozbalenej skupine (vedľa úpravy popisu).
- BE kontroly: `group-members invite`, `group-join`, `group-invite-bulk` rešpektujú oba príznaky.
- **Pozvánky dropdown** ✅ — v Profile → Pozvánky sa zobrazia len skupiny **aktuálneho turnaja**, **nie uzavreté** a kde člen smie pozývať (alebo je zakladateľ). Endpoint `v1/invites?competition_id=X`.

### Chat s adminom ✅ (produkcia, migrácie 042+043)

Súkromné vlákno každý tipér ↔ admin tím (žiadne user↔user — zámerne). Tabuľka `admin.messages` (user_id, sender 'user'|'admin', body, image_url, read_at, deleted_at).
- **User** `/spravy` — bublinové vlákno, písanie, soft-delete vlastnej správy, „✓ prečítané", polling 7s.
- **Admin** `/admin/messages` — zoznam vlákien (neprečítané navrchu s počtom) + detail vlákna s odpoveďou, soft-delete.
- **Badge** ✅ červená bodka s počtom neprečítaných: na ikone Správy (user sidebar+bottom nav) aj v admin menu. Obnova 30s + pri zmene obrazovky.
- **Obrázky** ✅ — copy-paste (Ctrl+V), výber z galérie/fotoaparátu (📎), náhľad pred odoslaním + v bubline, klik = lightbox. Pole je `contentEditable` (kvôli klávesnicovému „Prilepiť" na mobile). Upload `POST /v1/message-image` → `uploads/messages/`, max 5 MB. Text + obrázok naraz, body nullable.
- **Notifikácie:** user píše → push+email všetkým adminom; admin odpovie → push+email userovi. Identita admina jednotná („Admin").
- Endpointy: `GET/POST/DELETE /v1/messages` (+`?unread=1`), `GET/POST/DELETE /v1/admin/messages` (+`?user_id=X`, `?unread=1`), `POST /v1/message-image`.
- **Bottom nav** ✅ 6 položiek, Profil vycentrovaný (2 vľavo flex 1.5 + Profil + 3 vpravo flex 1).

### Vlajky — názov krajiny ✅ (produkcia)

Zdieľaný komponent `web/src/components/Flag.jsx` + endpoint `GET /v1/team-names?competition_id=X` ({code:name} z DB, anglické názvy). Cache per turnaj.
- **Zápasy (IIHF+FIFA):** pod skratkou štátu je menším písmom **celý názov štátu** (web aj mobil) — `.teamName`. Hlavné miesto s plnými názvami.
- **Ostatné obrazovky** (Prehľad, Tabuľky, Tretie miesta, Skupiny→rozklik tipov): vlajka má `title` → názov pri hover na webe. Long-press na mobile zrušený (otváral natívne menu obrázka).
- FIFA Zápasy vlajkový filter: krátky tap = filter tímu (zachované). Admin obrazovky bez zmeny.

> Login token expirácia: **7 dní** (`time() + 86400 * 7`). Test expirácie + auto-redirect na /login overený (✅).
