# IIHF2026 — Zadanie aplikácie

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

---

## STAV IMPLEMENTÁCIE — PREHĽAD

### ✅ V PRODUKCII (main / iihf2026.fellow.sk)
- Prihlásenie (JWT)
- Registrácia cez pozývací link (admin generuje, hráč aktivuje)
- Môj profil — avatar, meno, priezvisko, email, telefón, zmena hesla, zmazanie účtu
- Skupiny — vytvorenie, vstup (pending→schválenie), odchod, zrušenie, filter Len moje/Všetky
- Skupiny — rozbalenie skupiny → zoznam členov, klik na člena → detail (avatar, meno, email, tel)
- Admin — správa používateľov (zoznam, aktivácia, rola, edit, heslo, zmazanie)
- Admin — pozývacie linky (generovanie, zoznam, komu bol poslaný, Kopírovať URL per riadok, editácia poznámky)
- Admin — správa zápasov (úprava dátumu/času, tímov, miesta, stavu a skóre)
- Admin — zadávanie výsledkov (dedikovaná obrazovka, inline, kartový layout, efektívny stav live/finished)
- Admin — Tabuľky — samostatná stránka v hlavnom menu; skupinové poradie, sync, finalizácia
- Admin — Nástroje — test setup: 4 tlačidlá (Základná skupina / QF / SF / Finále+Bronz), každé generuje dátumy a tipy; playoff len pre hry kde admin nastavil tímy
- Admin — Nástroje — Inicializácia systému: vymaže userov/tipy/linky/skupiny/tabuľky, zápasy zostanú
- Admin — Nástroje — Spustenie súťaže: vymaže tipy/tabuľky, obnoví pôvodný rozvrh z PDF, useri/skupiny/linky zostávajú
- Výpočet bodov — automaticky po zadaní výsledku adminom; aj hromadný prepočet
- Tabuľky poradia tipujúcich — per skupina, breakdown 3-2-1-0, tiebreak
- Skupinové tabuľky A, B — filter "Tabuľky" v menu Zápasy (user) aj Výsledky (admin)
- Skupinové tabuľky — live výpočet z výsledkov; po skončení ZČ admin: Synchronizovať → upraviť poradie (len pri rovnosti bodov, ▲/▼) → Finalizovať
- Skupinové tabuľky — po finalizácii sa ukladá do DB (group_standings), šípky sa zamknú
- DB schéma — users, invites, friend_groups, group_members, teams, games, tips, scoring_config, group_standings
- Deploy pipeline — GitHub Actions → FTP → fellow.sk (dev + prod)
- PWA — favicon, title, manifest, offline SW
- Zápasy — zoznam všetkých 64 zápasov, vlajky tímov, filter podľa fázy, grupovanie podľa dátumu
- Tipovanie — zadanie presného skóre, uzavretie 5 min pred začiatkom, editácia tipa
- Tipy skupín — po začiatku zápasu viditeľné tipy členov všetkých skupín, v ktorých som

### ✅ Hotovo (nedávno doplnené)
- Admin — priradenie tímov do play-off zápasov — manuálne cez Admin → Zápasy (úprava team1/team2 pre hry 57–64)
- Dashboard — najbližšie zápasy (s tipom/bez tipu), posledné výsledky, poradie v skupinách
- Dashboard — klik na nadchádzajúci zápas → modal na zadanie/zmenu tipu
- Dashboard — klik na live/finished zápas → modal s tipmi všetkých členov skupín
- Dashboard — zápasy bez priradených tímov (TBD) nie sú tipovateľné
- Mobilná optimalizácia — bottom nav 2 riadky (3+3), sidebar skrytý pod 900px
- Pravidlá — stránka s bodovacou tabuľkou a príkladmi skupiny aj play-off
- Skupiny (Profil) — záložky Profil / Skupiny v obrazovke Profil
- Skupinové tabuľky A/B — opravená finalizácia (UPSERT, zachovanie finalized pri sync, live fallback pre nefinalizované skupiny)
- Zápasy — automatický výber aktívnej fázy pri otvorení (live → najbližší scheduled)
- Zápasy — auto-scroll na dnešný / najbližší deň so zápasmi

### ✅ Hotovo (nedávno doplnené — čaká na migráciu 008 na serveri)
- Admin — logovanie prihlásení (čas, user, rola, env main/develop, IP, zariadenie); Admin → Prihlásenia

### 🔲 TODO (nie je implementované)
- Migrácia 008 na serveri — spustiť 008_login_logs.sql
- Notifikácie — push (Web + FCM) + email
- Admin — nastavenia bodovacieho systému
- Android aplikácia (Kotlin)

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

### Správa pozývacích linkov ✅
- ✅ Generovanie pozývacieho linku
- ✅ Zobrazenie zoznamu linkov (použité / nepoužité)
- ✅ Komu bol link poslaný (editovateľné pole sent_to)
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
| status | VARCHAR(10) DEFAULT 'pending' | `pending` \| `accepted` |
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

### admin.notification_settings 🔲
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
| **Môj profil** | Avatar, meno, email, telefón, zmena hesla, zmazanie účtu | ✅ |
| **Skupiny** | Zoznam skupín, filter Len moje/Všetky, collapse/expand, detail člena | ✅ |
| **Zápasy** | Zoznam všetkých zápasov, zadávanie tipov, výsledky | 🔲 |
| **Detail zápasu** | Tip hráča, po uzavretí tipy všetkých, výsledok | 🔲 |
| **Poradie** | Tabuľka poradia v skupinách + celkové poradie | 🔲 |
| **Dashboard** | Najbližšie zápasy, posledné výsledky, skrátené poradie | 🔲 |

### Obrazovky — admin
| Obrazovka | Popis | Stav |
|-----------|-------|------|
| **Správa používateľov** | Zoznam, aktivácia, zmena roly, edit, heslo, zmazanie | ✅ |
| **Pozývacie linky** | Generovanie a zobrazenie pozývacích linkov | ✅ |
| **Zápasy** | Zoznam a úprava zápasov (dátum, čas, tímy, miesto) | ✅ |
| **Zadanie výsledku** | Výsledok riadnej doby; stav mení admin manuálne | ✅ |
| **Schválenie tabuľky** | Kontrola a schválenie po skupinovej fáze | 🔲 |
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
| `v1/groups` | GET/POST/DELETE | Zoznam, vytvorenie, zrušenie skupiny | ✅ |
| `v1/group-join` | POST | Žiadosť o vstup do skupiny | ✅ |
| `v1/group-leave` | POST | Opustenie skupiny | ✅ |
| `v1/group-members` | GET/POST | Členovia skupiny, schválenie/odmietnutie | ✅ |
| `v1/users` | GET | Zoznam hráčov / detail hráča | ✅ |
| `v1/admin/users` | GET | Zoznam všetkých používateľov (admin) | ✅ |
| `v1/admin/user-update` | POST | Aktivácia/deaktivácia, zmena roly | ✅ |
| `v1/admin/user-edit` | POST | Úprava údajov používateľa | ✅ |
| `v1/admin/user-password` | POST | Zmena hesla používateľovi | ✅ |
| `v1/admin/user-delete` | POST | Zmazanie používateľa | ✅ |
| `v1/admin/invites` | GET/POST | Zoznam a generovanie invite linkov | ✅ |

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
| `admin` | users, invites, friend_groups, group_members, notification_settings, schema_versions |
| `iihf2026` | teams, games, scoring_config, tips |

---

## Zdroje
- Rozpis zápasov: `sources/IIHF2026.pdf` (stav k 12.2.2026)
- Favicon: `sources/favicon.png`
- Logo: `sources/logo.png`
- Vlajky tímov: `sources/team_flag_<kod>.png`

---

*Posledná aktualizácia: 2026-05-08 (v1.96)*
