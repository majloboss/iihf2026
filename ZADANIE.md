# IIHF2026 — Zadanie aplikácie

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

---

## STAV IMPLEMENTÁCIE — PREHĽAD

### ✅ V PRODUKCII (main / iihf2026.fellow.sk)

**Používateľská časť**
- Prihlásenie (JWT) + registrácia cez pozývací link
- Profil — avatar, meno, priezvisko, email, telefón, zmena hesla, zmazanie účtu
- Profil — záložky: Profil / Skupiny / Notifikácie
- 🟠 Profil — záložka Pozvánky: zoznam odoslaných pozvánok, nová pozvánka s výberom skupiny
- Skupiny — vytvorenie, vstup (pending→schválenie), odchod, zrušenie, filter Len moje/Všetky
- Skupiny — rozbalenie → zoznam členov s avatarmi, klik na člena → detail
- 🟠 Skupiny — pozvanie člena zo skupiny (autocomplete, dvojklik = všetci); žltý badge „Pozvánka" pri pozvanom hráčovi; Akceptovať v detaile skupiny
- Zápasy — zoznam 64 zápasov, vlajky, filter podľa fázy, grupovanie podľa dátumu
- Zápasy — auto-scroll na dnešný deň, auto-výber aktívnej fázy (live → najbližší)
- Tipovanie — presné skóre, uzavretie 5 min pred zápasom, editácia; TBD zápasy netipovateľné
- Tipy skupín — po začiatku zápasu viditeľné tipy všetkých členov skupín
- Tabuľky poradia — per skupina, breakdown 3-2-1-0, tiebreak
- Skupinové tabuľky A/B — live výpočet + finalizácia adminom
- Dashboard — najbližšie zápasy (s tipom/bez), posledné výsledky, skrátené poradie
- Dashboard — klik na nadchádzajúci zápas → modal na zadanie/zmenu tipu
- Dashboard — klik na live/finished → modal s tipmi členov skupín
- Pravidlá — stránka s bodovacou tabuľkou a príkladmi
- Notifikácie (nastavenia) — záložka v Profile; per typ: email/push/čas pred zápasom
- Mobilná optimalizácia — bottom nav 2 riadky (3+3), sidebar skrytý pod 900px, Odhlásiť tlačidlo viditeľné na mobile
- Admin mobilná optimalizácia — hamburger menu, tabuľky → karty (data-label), UserModal → bottom-sheet, GroupStandings → horizontálny scroll
- PWA — manifest, offline SW, favicon, správne veľkosti ikon (192×192, 512×512)

**Admin časť**
- Správa používateľov — zoznam, aktivácia, rola, edit, heslo, zmazanie (vrátane FK cleanup)
- Pozvánky (dříve Pozývacie linky):
  - Generovanie linku s voliteľným adresátom (meno / email)
  - Keď je adresát email — automaticky sa odošle pozývací email cez SMTP
  - Email obsahuje registračný link + pravidlá tipovačky
  - Voliteľný výber skupiny (dropdown z adminových skupín) — nový člen sa po registrácii automaticky pridá
  - Badge "Mail odoslaný" a stĺpec "Skupina" v zozname pozvánok
- Správa zápasov — dátum/čas, tímy (vrátane play-off 57–64), miesto, stav, skóre, FlashScore link
- FlashScore prepojenie — každý zápas môže mať link na detail zápasu na flashscore.sk; admin zadáva manuálne; ikona zobrazená pri zápase na stránke Zápasy
- Zadávanie výsledkov — dedikovaná obrazovka `/admin/results`, inline, kartový layout
- Zadávanie výsledkov — checkbox "Po predĺžení": zadáš 3:2 + zaškrtneš → systém uloží regulárne 2:2 + konečné 3:2; validácia rozdiel = 1
- Skupinové tabuľky — sync, úprava poradia pri rovnosti bodov, finalizácia
- Skupinové tabuľky — bodový systém 3/2/1/0 (regulárna výhra=3, OT výhra=2, OT prehra=1, regulárna prehra=0)
- Výpočet bodov — automaticky po výsledku + hromadný prepočet
- Admin menu — sekcia "Správa": Pozvánky, Nástroje, Prihlásenia, Odoslané maily
- Nástroje — generovanie test dát (skupina/QF/SF/Finále), Spustenie súťaže, Inicializácia, Sync API-Sports, Test emailu (SMTP), Spustenie DB migrácií
- Prihlásenia — log všetkých prihlásení (čas, user, rola, env main/develop, IP, zariadenie)
- Odoslané maily — log všetkých odoslaných emailov (čas, komu, predmet, stav)
- SMTP email — betclub@fellow.sk, smtp.websupport.sk:465 SSL; helper send_mail + send_mail_logged
- Sync výsledkov — API-Sports (liga 111, sezóna 2026); aktualizuje skóre + stav + prepočíta body
  - ⚠️ Free plán: aktivuje sa od 15.5.2026 keď turnaj začne

### 🔲 TODO (nie je implementované)
- Notifikácie — faktické odosielanie push (Web Push API)
- Notifikácie — cron job na fellow.sk cPanel (`php api/cron/send_notifications.php` každých 5 min)
  - Skript existuje (`api/cron/send_notifications.php`), treba nastaviť v cPanel
- Admin — nastavenia bodovacieho systému (úprava scoring_config)
- Android aplikácia (Kotlin)

### ⚠️ TREBA SPUSTIŤ (DB migrácie)
- V Admin → Nástroje → kliknúť **"Spustit migracie"** — spustí run_012 + run_013 + run_014
  - `run_012.sql` — stĺpec `email_sent` v invites, tabuľka `mail_log`
  - `run_013.sql` — stĺpec `group_id` v invites (odporúčanie skupiny)
  - `run_014.sql` — stĺpec `flashscore_url` v games (FlashScore prepojenie)

---

## Prehľad
Web + Android aplikácia — tipovačka výsledkov MS v ľadovom hokeji 2026.

### Ako funguje tipovačka
Hráč pred každým zápasom (najneskôr 5 minút pred začiatkom) zadá tip na presný výsledok riadnej hracej doby (60 minút). Po skončení zápasu systém automaticky vypočíta body. Hráči súťažia v skupinách priateľov a sledujú poradie v rámci každej skupiny.

### Pravidlá udeľovania bodov
Boduje sa výsledok **riadnej hracej doby (60 minút)** — predĺženie ani samostatné nájazdy sa nezapočítavajú.

| Podmienka | Skupinová fáza | Play-off (QF / SF / Finále / O bronz) |
|-----------|:--------------:|:-------------------------------------:|
| Správny víťaz alebo remíza | **3 body** | **5 bodov** |
| Správny počet gólov domácich | 1 bod | 1 bod |
| Správny počet gólov hostí | 1 bod | 1 bod |
| **Maximum za zápas** | **5 bodov** | **7 bodov** |

**Príklady (skupinová fáza, skutočnosť FIN 3:2 GER, max 5 bodov):**
| Tip | Body | Dôvod |
|-----|:----:|-------|
| FIN 3:2 GER | 5 | víťaz ✓, góly FIN ✓, góly GER ✓ |
| FIN 3:1 GER | 4 | víťaz ✓, góly FIN ✓ |
| FIN 2:1 GER | 3 | víťaz ✓ |
| FIN 1:2 GER | 1 | góly GER ✓ |
| FIN 0:1 GER | 0 | — |

---

## Platforma
- ✅ Web aplikácia — React + Vite PWA, hosted na fellow.sk
- 🔲 Android aplikácia — Kotlin

### Poznámka — časové pásma
Systém je timezone-safe:
- `starts_at` je uložený ako UTC timestamp
- Uzávierka tipovania sa kontroluje na serveri (UTC porovnanie) — nezávisí od klienta
- Frontend zobrazuje časy v **lokálnom čase browsera** (`toLocaleString`) — používateľ v inom časovom pásme uvidí správny lokálny čas zápasu
- Prepínanie live/finished stavu funguje na absolútnych epoch timestampoch → timezone-safe

---

## Používatelia

### Registrácia cez pozývací link ✅
1. Admin vygeneruje pozývací link v administrácii
2. Link zdieľa ľubovoľne — WhatsApp, email, SMS...
3. Hráč klikne na link → systém vytvorí placeholder účet s username `iihf2026_<InviteID>`
4. Hráč musí **povinne** nastaviť vlastný username a heslo
5. Po nastavení sa účet aktivuje (`is_active = TRUE`)
- Email nie je povinný pri registrácii (hráč ho môže doplniť v profile)

### Profil používateľa
| Akcia | Podmienka | Stav |
|-------|-----------|------|
| Zmena hesla | kedykoľvek | ✅ |
| Nahratie avatara (fotka) | kedykoľvek | ✅ |
| Doplnenie / zmena mena, priezviska | kedykoľvek | ✅ |
| Doplnenie / zmena emailu | kedykoľvek | ✅ |
| Doplnenie / zmena mobilu | kedykoľvek | ✅ |
| Zmazanie účtu | kedykoľvek (vyžaduje heslo) | ✅ |
| Zapnúť / vypnúť push notifikácie | kedykoľvek | 🔲 |

### Polia používateľa ✅
| Pole | Povinné | Popis |
|------|---------|-------|
| username | áno | placeholder `iihf2026_<ID>`, hráč musí zmeniť pri aktivácii |
| password | áno | hráč nastaví pri aktivácii |
| avatar | nie | obrázok profilu, uložený na serveri (`/uploads/avatars/`) |
| meno | nie | |
| priezvisko | nie | |
| email | nie | potrebný pre email notifikácie |
| telefón | nie | |

### Roly ✅
- **User** — tipuje zápasy, sleduje výsledky a poradie
- **Admin** — vytvára používateľov, zadáva výsledky, spravuje bodovanie, schvaľuje tabuľky, generuje play-off zápasy

---

## Turnaj — štruktúra

### Miesto konania
- Švajčiarsko: Zürich (Swiss Life Arena) a Fribourg (BCF Arena)
- Dátumy: 15. mája – 31. mája 2026

### Skupiny
| Skupina A | Skupina B |
|-----------|-----------|
| FIN | CAN |
| GER | SWE |
| USA | CZE |
| SUI | DEN |
| GBR | SVK |
| AUT | NOR |
| HUN | ITA |
| LAT | SLO |

---

## Zápasy

### Skupinová fáza (Games 1–56) ✅ DB
- Zápasy sú fixné, dané vopred
- Načítané zo súboru `sources/IIHF2026.pdf` do tabuľky `iihf2026.games`
- Dátumy: 15.–26. mája 2026
- Každý tím odohrá 7 zápasov (round-robin v rámci skupiny)

### Play-off
| Fáza | Zápasy | Dátum |
|------|--------|-------|
| Štvrťfinále | Game 57–60 | 28. mája |
| Semifinále | Game 61–62 | 30. mája |
| O bronz | Game 63 | 31. mája |
| Finále | Game 64 | 31. mája |

**Postup do play-off:** Top 4 zo skupiny A + Top 4 zo skupiny B = 8 tímov v štvrťfinále

### Priradenie play-off zápasov 🔲
1. Admin finalizuje skupinové tabuľky (sync → úprava poradia → finalizovať)
2. Admin manuálne priradí tímy do zápasov 57–64 (QF, SF, Bronz, Finále) cez správu zápasov

---

## Admin funkcie

Admin má **samostatnú obrazovku** (oddelenú od bežného UI).

### Správa používateľov ✅
- ✅ Zobrazenie zoznamu všetkých používateľov
- ✅ Aktivácia / deaktivácia účtu
- ✅ Zmena roly (user ↔ admin)
- ✅ Úprava údajov používateľa
- ✅ Zmena hesla používateľovi
- ✅ Zmazanie používateľa

### Pozvánky ✅
- ✅ Generovanie pozývacieho linku s adresátom (meno alebo email)
- ✅ Ak je adresát platná emailová adresa — automaticky sa odošle pozývací email
- ✅ Email obsahuje registračný link + odkaz na pravidlá tipovačky
- ✅ Výber skupiny pri vytváraní pozvánky — nový člen pridaný automaticky po registrácii
- ✅ Zobrazenie zoznamu linkov (použité / nepoužité), stĺpce: Adresát / Skupina / Mail badge
- ✅ Editovateľné pole Adresát (inline klik)
- ✅ Kopírovanie celej URL per riadok
- ✅ Klik na username hráča → detail/úprava profilu (UserModal)

### Správa zápasov a výsledkov
- ✅ Úprava zápasu — dátum/čas (lokálny), tímy, miesto
- ✅ Zadávanie výsledkov — dedikovaná obrazovka `/admin/results`, inline bez modálu
- ✅ Životný cyklus zápasu: `scheduled` → `live` → `finished` + skóre; **admin mení manuálne**
  - ⚠️ Systém nevie kedy zápas skončí — pozná len čas začiatku. Admin musí zápas uzavrieť a zapísať výsledok ručne.
- 🔲 Výpočet bodov tipujúcich po zadaní výsledku
- 🔲 Manuálne zadanie tipu za používateľa
- 🔲 Schválenie tabuľky po skupinovej fáze (s možnosťou korekcie)
- 🔲 Generovanie play-off zápasov po schválení

### Nastavenia bodovanie 🔲
- 🔲 Úprava hodnôt v `scoring_config`

---

## Tipovanie 🔲
- Hráč tipuje **presný výsledok riadnej hracej doby (60 minút)**
- Tipujú sa všetky zápasy — skupinová fáza aj play-off
- Tipovanie uzavreté **5 minút pred začiatkom zápasu**
- Admin môže tip zadať alebo upraviť manuálne
- Hráč tipuje **iba raz** — rovnaký tip platí vo všetkých skupinách, kde je členom

---

## Skupiny priateľov ✅
- ✅ Každý hráč môže vytvoriť skupinu — stáva sa jej zakladateľom
- ✅ Názov skupiny musí byť unikátny a je viditeľný pre všetkých
- ✅ Hráč si prehliadne zoznam skupín a môže požiadať o vstup (status `pending`)
- ✅ Zakladateľ žiadosť schváli alebo odmietne
- ✅ Hráč môže skupinu sám opustiť kedykoľvek
- ✅ Skupinu môže vymazať iba jej zakladateľ
- ✅ Hráč môže byť členom viacerých skupín
- ✅ Klik na skupinu → rozbalí sa zoznam členov s avatarmi
- ✅ Klik na člena → detail profilu (avatar, meno, email, telefón)
- ✅ Filter „Len moje" / „Všetky"
- 🟠 Člen skupiny môže pozvať iného hráča priamo (status `invited`); pozvaný vidí žltý badge a akceptuje v detaile skupiny
- 🔲 Hráč tipuje iba raz — rovnaký tip sa použije vo všetkých jeho skupinách

---

## Viditeľnosť tipov 🔲
- Po začatí zápasu (tipovanie uzavreté) sú tipy všetkých hráčov viditeľné pre všetkých

---

## Notifikácie 🔲
- Kanály: **Push** (FCM pre Android, Web Push API pre web) + **Email (SMTP fellow.sk)**
- Každý hráč si nastavuje notifikácie samostatne pre každý typ

| Typ | Popis | Nastaviteľný čas |
|-----|-------|-----------------|
| `game_start` | Upozornenie na začiatok zápasu | áno (X min pred) |
| `untipped_game` | Upozornenie na netipovaný zápas | áno (X min pred) |
| `result_entered` | Admin zadal výsledok zápasu | nie |
| `group_stage_closed` | Uzavretie základnej časti | nie |
| `new_games_added` | Pridané nové zápasy (play-off) | nie |

---

## Databázové tabuľky ✅

### admin.users
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| username | VARCHAR(50) NOT NULL UNIQUE | |
| password | VARCHAR(255) NOT NULL | bcrypt hash |
| username_changed | BOOLEAN DEFAULT FALSE | |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| email | VARCHAR(150) UNIQUE | |
| phone | VARCHAR(30) | |
| avatar | VARCHAR(255) | URL nahratého súboru |
| role | VARCHAR(10) DEFAULT 'user' | `user` \| `admin` |
| is_active | BOOLEAN DEFAULT FALSE | TRUE po aktivácii |
| fcm_token | VARCHAR(255) | Firebase FCM (Android) |
| web_push_sub | TEXT | Web Push subscription JSON |
| created_at | TIMESTAMP | |

### admin.invites ✅
| Pole | Typ | Popis |
|------|-----|-------|
| id | INT PK (SEQ) | InviteID v placeholder username |
| invite_token | VARCHAR(100) UNIQUE | URL token |
| created_by | FK → users | |
| created_at | TIMESTAMP | |
| used_at | TIMESTAMP | NULL = nepoužitý |
| user_id | FK → users | NULL = nepoužitý |
| sent_to | VARCHAR(150) | meno alebo email adresáta |
| email_sent | BOOLEAN DEFAULT FALSE | TRUE ak bol odoslaný email (run_012) |
| group_id | FK → friend_groups | odporúčaná skupina (run_013) |

### admin.mail_log ✅ (run_012)
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| to_email | VARCHAR(150) NOT NULL | |
| subject | VARCHAR(255) NOT NULL | |
| status | VARCHAR(10) DEFAULT 'sent' | `sent` \| `failed` |
| error_msg | TEXT | chybová správa pri failed |
| sent_at | TIMESTAMP DEFAULT NOW() | |

### admin.login_logs ✅
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| user_id | FK → users ON DELETE SET NULL | |
| username | VARCHAR(50) NOT NULL | |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| env | VARCHAR(10) DEFAULT 'main' | `main` \| `develop` |
| logged_at | TIMESTAMP DEFAULT NOW() | |

### admin.friend_groups ✅
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| name | VARCHAR(100) NOT NULL UNIQUE | |
| created_by | FK → users | zakladateľ |
| created_at | TIMESTAMP | |

### admin.group_members ✅
| Pole | Typ | Popis |
|------|-----|-------|
| group_id | FK → friend_groups | |
| user_id | FK → users | |
| status | VARCHAR(10) DEFAULT 'pending' | `pending` \| `accepted` \| `invited` |
| joined_at | TIMESTAMP | |
| PK(group_id, user_id) | | |

### iihf2026.teams ✅
| Pole | Typ | Popis |
|------|-----|-------|
| team_id | SERIAL PK | |
| team_code | VARCHAR(3) NOT NULL UNIQUE | FIN, GER, SVK... |
| team_name | VARCHAR(100) NOT NULL | |
| group_name | VARCHAR(1) NOT NULL | `A` \| `B` |

### iihf2026.games ✅
| Pole | Typ | Popis |
|------|-----|-------|
| game_id | INT PK | číslo zápasu z PDF (1–64) |
| home_team_id | FK → teams | NULL kým sa nevie (playoff) |
| away_team_id | FK → teams | NULL kým sa nevie (playoff) |
| start_time | TIMESTAMP NOT NULL | |
| venue | VARCHAR(100) NOT NULL | |
| tips_open | BOOLEAN DEFAULT TRUE | FALSE = 5 min pred zápasom |
| home_score_regular | INT | skóre riadna hracia doba |
| away_score_regular | INT | |
| home_score_final | INT | konečné skóre |
| away_score_final | INT | |
| home_points | INT | body do tabuľky |
| away_points | INT | |
| result_approved | BOOLEAN DEFAULT FALSE | |
| game_type_code | VARCHAR(10) NOT NULL | `GROUP_A` \| `GROUP_B` \| `QF` \| `SF` \| `BM` \| `F` |
| game_type_name | VARCHAR(50) NOT NULL | |

### iihf2026.tips 🔲
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| user_id | FK → users NOT NULL | |
| game_id | FK → games NOT NULL | |
| home_score_tip | INT NOT NULL | |
| away_score_tip | INT NOT NULL | |
| points_earned | INT | NULL kým zápas nie je odohraný |
| entered_by_admin | BOOLEAN DEFAULT FALSE | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| UNIQUE(user_id, game_id) | | jeden tip na zápas |

### iihf2026.scoring_config ✅ DB
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| key | VARCHAR(50) NOT NULL UNIQUE | `correct_winner_group` \| `correct_winner_playoff` \| `correct_goals_per_team` |
| value | INT NOT NULL | počet bodov |
| updated_by | FK → users | |
| updated_at | TIMESTAMP | |

### admin.notification_settings ✅
| Pole | Typ | Popis |
|------|-----|-------|
| user_id | FK → users | |
| notif_type | VARCHAR(30) | |
| push_enabled | BOOLEAN DEFAULT TRUE | |
| email_enabled | BOOLEAN DEFAULT TRUE | |
| minutes_before | INT | len pre game_start a untipped_game |
| PK(user_id, notif_type) | | |

---

## Web aplikácia

### Technológia ✅
- React + Vite PWA
- PHP REST API backend (`api/`)
- PostgreSQL cez PDO
- GitHub Actions → FTP deploy na fellow.sk
- **dev:** https://dev_iihf2026.fellow.sk (branch `develop`)
- **prod:** https://iihf2026.fellow.sk (branch `main`)

### Obrazovky — bežný hráč
| Obrazovka | Popis | Stav |
|-----------|-------|------|
| **Prihlásenie** | Login formulár | ✅ |
| **Registrácia** | Cez pozývací link (invite token) | ✅ |
| **Dashboard** | Najbližšie zápasy s tipom, posledné výsledky, skrátené poradie | ✅ |
| **Zápasy** | 64 zápasov, filter fázy, tipovanie, skupinové tabuľky | ✅ |
| **Tabuľky** | Poradie tipujúcich per skupina | ✅ |
| **Môj profil** | Avatar, údaje, heslo, zmazanie; záložky Profil/Skupiny/Notifikácie | ✅ |
| **Pravidlá** | Bodovacia tabuľka s príkladmi | ✅ |

### Obrazovky — admin
| Obrazovka | Popis | Stav |
|-----------|-------|------|
| **Správa používateľov** | Zoznam, aktivácia, zmena roly, edit, heslo, zmazanie | ✅ |
| **Pozvánky** | Generovanie, email, odporúčanie skupiny, zoznam | ✅ |
| **Zápasy** | Zoznam a úprava zápasov (dátum, čas, tímy, miesto) | ✅ |
| **Zadanie výsledku** | Inline zadávanie skóre + stavu; prepočet bodov; OT checkbox | ✅ |
| **Skupinové tabuľky** | Sync, úprava poradia, finalizácia | ✅ |
| **Nástroje** | Test dáta, súťaž, inicializácia, sync API-Sports, test email, DB migrácie | ✅ |
| **Prihlásenia** | Log prihlásení (čas, user, rola, env, IP, zariadenie) | ✅ |
| **Odoslané maily** | Log všetkých emailov (čas, komu, predmet, stav) | ✅ |
| **Nastavenia bodovanie** | Úprava scoring_config hodnôt | 🔲 |

### API endpointy
| Endpoint | Metóda | Popis | Stav |
|----------|--------|-------|------|
| `v1/auth/login` | POST | Prihlásenie, vracia JWT | ✅ |
| `v1/auth/complete` | POST | Aktivácia účtu cez invite | ✅ |
| `v1/admin/invite-use` | POST | Použitie invite tokenu | ✅ |
| `v1/profile` | GET/POST | Čítanie a uloženie profilu | ✅ |
| `v1/profile-avatar` | POST | Nahranie avatara | ✅ |
| `v1/profile-password` | POST | Zmena hesla | ✅ |
| `v1/profile-delete` | POST | Zmazanie účtu | ✅ |
| `v1/notifications` | GET/POST | Nastavenia notifikácií per používateľ | ✅ |
| `v1/groups` | GET/POST/DELETE | Zoznam, vytvorenie, zrušenie skupiny | ✅ |
| `v1/group-join` | POST | Žiadosť o vstup do skupiny | ✅ |
| `v1/group-leave` | POST | Opustenie skupiny | ✅ |
| `v1/group-members` | GET/POST | Členovia skupiny, schválenie/odmietnutie/pozvanie/akceptovanie | ✅ |
| `v1/users` | GET | Zoznam hráčov / detail hráča | ✅ |
| `v1/games` | GET | Zoznam zápasov s tipmi | ✅ |
| `v1/tips` | POST | Uloženie tipu | ✅ |
| `v1/game-tips` | GET | Tipy členov skupín pre daný zápas | ✅ |
| `v1/standings` | GET | Poradie tipujúcich | ✅ |
| `v1/group-standings` | GET | Skupinové tabuľky A/B | ✅ |
| `v1/admin/users` | GET | Zoznam všetkých používateľov | ✅ |
| `v1/admin/user-update` | POST | Aktivácia/deaktivácia, zmena roly | ✅ |
| `v1/admin/user-edit` | POST | Úprava údajov používateľa | ✅ |
| `v1/admin/user-password` | POST | Zmena hesla používateľovi | ✅ |
| `v1/admin/user-delete` | POST | Zmazanie používateľa | ✅ |
| `v1/admin/invites` | GET/POST | Zoznam a generovanie invite linkov | ✅ |
| `v1/admin/game-update` | POST | Úprava zápasu | ✅ |
| `v1/admin/game-tips` | GET | Tipy pre zápas (admin) | ✅ |
| `v1/admin/recalc-points` | POST | Hromadný prepočet bodov | ✅ |
| `v1/admin/standings` | GET | Poradie (admin) | ✅ |
| `v1/admin/group-standings` | GET/POST | Skupinové tabuľky — sync, úprava, finalizácia | ✅ |
| `v1/admin/test-setup` | POST | Generovanie test dát | ✅ |
| `v1/admin/run-migration` | POST | Spustenie DB migrácií | ✅ |
| `v1/admin/login-logs` | GET | Log prihlásení | ✅ |
| `v1/admin/sync-scores` | POST | Sync výsledkov z API-Sports | ✅ |
| `v1/admin/test-mail` | POST | Odoslanie testovacieho emailu | ✅ |
| `v1/admin/mail-log` | GET | Log odoslaných mailov | ✅ |

---

## Infraštruktúra ✅
- **Hosting:** fellow.sk
- **Databáza:** PostgreSQL — `DB-BET` na fellow.sk
- **Backend:** PHP REST API (`api/`) — zdieľaný pre web aj Android
- **Web:** React + Vite PWA, build uploadovaný cez FTP (GitHub Actions)
- **Android:** Kotlin — 🔲 nespustené
- **Deploy:** GitHub Actions pri push na `develop` → dev, `main` → prod
- **FTP heslo:** GitHub Secret `FTP_PASSWORD`

### DB schémy v DB-BET
| Schéma | Obsah |
|--------|-------|
| `admin` | users, invites, friend_groups, group_members, notification_settings, notification_log, login_logs, mail_log |
| `iihf2026` | teams, games, scoring_config, tips |

---

## Zdroje
- Rozpis zápasov: `sources/IIHF2026.pdf` (stav k 12.2.2026)
- Favicon: `sources/favicon.png`
- Logo: `sources/logo.png`
- Vlajky tímov: `sources/team_flag_<kod>.png`

---

*Posledná aktualizácia: 2026-05-10 (v2.14)*
