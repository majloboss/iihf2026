# IIHF2026 — Zadanie aplikácie

## Prehľad
Android aplikácia — tipovačka výsledkov MS v ľadovom hokeji 2026.

### Ako funguje tipovačka
Hráč pred každým zápasom (najneskôr 5 minút pred výkopom) zadá tip na presný výsledok riadnej hracej doby (60 minút). Po skončení zápasu systém automaticky vypočíta body podľa toho, ako presne hráč tipoval. Hráči súťažia v skupinách priateľov a sledujú svoje poradie v rámci každej skupiny.

### Pravidlá udeľovania bodov
Boduje sa výsledok **riadnej hracej doby (60 minút)** — predĺženie ani samostatné nájazdy sa do tipu nezapočítavajú.

| Podmienka | Skupinová fáza | Play-off (QF / SF / Finále / O bronz) |
|-----------|:--------------:|:-------------------------------------:|
| Správny víťaz alebo remíza | 1 bod | 3 body |
| Správny počet gólov domácich | 1 bod | 1 bod |
| Správny počet gólov hostí | 1 bod | 1 bod |
| **Maximum za zápas** | **3 body** | **5 bodov** |

**Príklady (skupinová fáza, skutočnosť FIN 3:2 GER):**
| Tip | Body | Dôvod |
|-----|:----:|-------|
| FIN 3:2 GER | 3 | víťaz ✓, góly FIN ✓, góly GER ✓ |
| FIN 3:1 GER | 2 | víťaz ✓, góly FIN ✓, góly GER ✗ |
| FIN 2:1 GER | 1 | víťaz ✓, góly FIN ✗, góly GER ✗ |
| GER 2:1 FIN | 0 | víťaz ✗ |

---

## Platforma
- Android aplikácia
- Web aplikácia (hosted na fellow.sk, rovnaká doména ako BookClub a Scrabble)

---

## Používatelia

### Registrácia cez pozývací link
1. Admin vygeneruje pozývací link v administrácii
2. Link zdieľa ľubovoľne — WhatsApp, email, SMS...
3. Hráč klikne na link → systém vytvorí placeholder účet s username `iihf2026_<InviteID>`
4. Hráč musí **povinne** nastaviť vlastný username a heslo
5. Po nastavení sa účet aktivuje (`is_active = TRUE`)
- Email nie je povinný pri registrácii (hráč ho môže doplniť v profile)

### Profil používateľa (upravuje hráč)
| Akcia | Podmienka |
|-------|-----------|
| Zmena username | iba raz (pri prvom prihlásení alebo kedykoľvek, ale len jedenkrát) |
| Zmena hesla | kedykoľvek |
| Nahratie avatara (fotka) | kedykoľvek |
| Doplnenie / zmena emailu | kedykoľvek |
| Doplnenie / zmena mobilu | kedykoľvek |
| Zapnúť / vypnúť push notifikácie | kedykoľvek |

### Polia používateľa
| Pole | Povinné | Popis |
|------|---------|-------|
| username | áno | placeholder `iihf2026_<ID>`, hráč musí zmeniť pri aktivácii |
| password | áno | hráč nastaví pri aktivácii |
| avatar | nie | obrázok profilu, uložený na serveri |
| meno | nie | |
| priezvisko | nie | |
| email | nie | potrebný pre email notifikácie |
| telefón | nie | |

### Roly
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

### Skupinová fáza (Games 1–56)
- Zápasy sú fixné, dané vopred
- Načítajú sa zo súboru `sources/IIHF2026.pdf`
- Dátumy: 15.–26. mája 2026
- Každý tím odohrá 7 zápasov (round-robin v rámci skupiny)

### Play-off
| Fáza | Zápasy | Dátum |
|------|--------|-------|
| Štvrťfinále | Game 57–60 (QF vs QF) | 28. mája |
| Semifinále | Game 61–62 (W(QF) vs W(QF)) | 30. mája |
| O bronz | Game 63 (L(SF) vs L(SF)) | 31. mája |
| Finále | Game 64 (W(SF) vs W(SF)) | 31. mája |

**Postup do play-off:** Top 4 zo skupiny A + Top 4 zo skupiny B = 8 tímov v štvrťfinále

### Generovanie play-off zápasov
1. Systém vypočíta tabuľku skupín po odohraní zápasov 1–56
2. Admin skontroluje tabuľku, môže urobiť korekcie
3. Admin schváli tabuľku
4. Systém automaticky vygeneruje štvrťfinálové dvojice podľa pravidiel z PDF

---

## Admin funkcie
Admin má **samostatnú obrazovku** pre administráciu (oddelenú od bežného UI).

### Správa používateľov
- Pridanie nového používateľa (username + heslo)
- Zmena hesla používateľovi
- ❓ Ďalšie správcovské funkcie používateľov?

### Správa zápasov a výsledkov
- Zadávanie výsledkov zápasov
- Manuálne zadanie tipu za používateľa
- Schválenie tabuľky po skupinovej fáze (s možnosťou korekcie)
- Generovanie play-off zápasov po schválení

### Nastavenia
- Úprava bodovacieho systému

---

## Tipovanie
- Hráč tipuje **presný výsledok riadnej hracej doby (60 minút)**
- Tipujú sa všetky zápasy — skupinová fáza aj play-off
- Tipovanie uzavreté **5 minút pred začiatkom zápasu**
- Admin môže tip zadať alebo upraviť manuálne (napr. keď používateľ pošle tip emailom)
- Hráč tipuje **iba raz** — rovnaký tip platí vo všetkých skupinách, kde je členom

---

## Bodovanie
Admin môže hodnoty meniť. Predvolený systém:

| Podmienka | Skupinová fáza | Play-off (QF/SF/F/BM) |
|-----------|---------------|----------------------|
| Správny víťaz alebo remíza | 1 bod | 3 body |
| Správny počet gólov domácich | 1 bod | 1 bod |
| Správny počet gólov hostí | 1 bod | 1 bod |
| **Maximum** | **3 body** | **5 bodov** |

**Príklady (skupinová fáza):**
- Skutočnosť: FIN 3:2 GER
  - Tip FIN 3:2 GER → víťaz ✓ + góly FIN ✓ + góly GER ✓ = **3 body**
  - Tip FIN 2:1 GER → víťaz ✓ + góly FIN ✗ + góly GER ✗ = **1 bod**
  - Tip FIN 3:1 GER → víťaz ✓ + góly FIN ✓ + góly GER ✗ = **2 body**
  - Tip GER 2:1 FIN → víťaz ✗ + góly ✗ + góly ✗ = **0 bodov**

---

## Skupiny priateľov
- **Každý hráč môže vytvoriť skupinu** — stáva sa jej správcom (group admin)
- Názov skupiny musí byť **unikátny** a je viditeľný pre všetkých hráčov
- Hráč si prehliadne zoznam skupín a môže **požiadať o vstup**
- Group admin žiadosť **schváli** — po schválení už hráča nemôže vyhodiť
- Hráč môže skupinu **sám opustiť** kedykoľvek
- Skupinu môže vymazať **iba jej zakladateľ**
- Hráč môže byť členom **viacerých skupín**
- Hráč tipuje **iba raz** — rovnaký tip sa použije vo všetkých jeho skupinách

---

## Viditeľnosť tipov
- Po začatí zápasu (tipovanie uzavreté) sú **tipy všetkých hráčov viditeľné** pre všetkých

---

## Notifikácie
- Kanály: **Push** (FCM pre Android, Web Push API pre web) + **Email (SMTP fellow.sk)**
- Každý hráč si nastavuje notifikácie **samostatne pre každý typ**
- Pre každý typ možno zapnúť/vypnúť push a email zvlášť
- Pre časové typy si hráč nastaví **X minút pred zápasom**

| Typ | Popis | Nastaviteľný čas |
|-----|-------|-----------------|
| `game_start` | Upozornenie na začiatok zápasu | áno (X min pred) |
| `untipped_game` | Upozornenie na neopatipovaný zápas | áno (X min pred) |
| `result_entered` | Admin zadal výsledok zápasu | nie |
| `group_stage_closed` | Uzavretie základnej časti | nie |
| `new_games_added` | Pridané nové zápasy na tipovanie (play-off) | nie |

---

## Návrh databázových tabuliek

### iihf.users
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| username | VARCHAR(50) NOT NULL UNIQUE | admin nastaví, hráč môže zmeniť raz |
| password | VARCHAR(255) NOT NULL | bcrypt hash |
| username_changed | BOOLEAN DEFAULT FALSE | či už hráč zmenil username |
| first_name | VARCHAR(100) | voliteľné |
| last_name | VARCHAR(100) | voliteľné |
| email | VARCHAR(150) UNIQUE | voliteľné, potrebný pre email notif. |
| phone | VARCHAR(30) | voliteľné |
| avatar | VARCHAR(255) | názov súboru avatara na serveri |
| role | VARCHAR(10) DEFAULT 'user' | 'user' \| 'admin' |
| is_active | BOOLEAN DEFAULT FALSE | TRUE po nastavení username + hesla |
| fcm_token | VARCHAR(255) | Firebase FCM token (Android) |
| web_push_sub | TEXT | Web Push subscription JSON (PWA) |
| created_at | TIMESTAMP | |

### iihf.teams (číselník tímov)
| Pole | Typ | Popis |
|------|-----|-------|
| team_id | SERIAL PK | |
| team_code | VARCHAR(3) NOT NULL UNIQUE | FIN, GER, SVK... |
| team_name | VARCHAR(100) NOT NULL | Finland, Germany... |
| group_name | VARCHAR(1) NOT NULL | 'A' \| 'B' |

### iihf.games (zápasy)
| Pole | Typ | Popis |
|------|-----|-------|
| game_id | INT PK | číslo zápasu z PDF (1–64) |
| home_team_id | FK → teams | NULL kým sa nevie (playoff) |
| away_team_id | FK → teams | NULL kým sa nevie (playoff) |
| start_time | TIMESTAMP NOT NULL | dátum a čas zápasu |
| venue | VARCHAR(100) NOT NULL | miesto konania |
| tips_open | BOOLEAN DEFAULT TRUE | tipovanie otvorené/zatvorené |
| home_score_regular | INT | skóre domáci — riadna hracia doba |
| away_score_regular | INT | skóre hostia — riadna hracia doba |
| home_score_final | INT | konečné skóre domáci |
| away_score_final | INT | konečné skóre hostia |
| home_points | INT | body do tabuľky — domáci |
| away_points | INT | body do tabuľky — hostia |
| result_approved | BOOLEAN DEFAULT FALSE | výsledok schválený adminom |
| game_type_code | VARCHAR(10) NOT NULL | GROUP_A \| GROUP_B \| QF \| SF \| BM \| F |
| game_type_name | VARCHAR(50) NOT NULL | Skupinová fáza A/B \| Štvrťfinále \| Semifinále \| O bronz \| Finále |

### iihf.tips (tipy používateľov)
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| user_id | FK → users NOT NULL | |
| game_id | FK → games NOT NULL | |
| home_score_tip | INT NOT NULL | tip skóre domáci |
| away_score_tip | INT NOT NULL | tip skóre hostia |
| points_earned | INT | NULL kým zápas nie je odohraný |
| entered_by_admin | BOOLEAN DEFAULT FALSE | admin zadal tip manuálne za používateľa |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| UNIQUE(user_id, game_id) | | jeden tip na zápas |

### iihf.notification_settings
| Pole | Typ | Popis |
|------|-----|-------|
| user_id | FK → users | |
| notif_type | VARCHAR(30) | game_start \| untipped_game \| result_entered \| group_stage_closed \| new_games_added |
| push_enabled | BOOLEAN DEFAULT TRUE | |
| email_enabled | BOOLEAN DEFAULT TRUE | |
| minutes_before | INT | len pre game_start a untipped_game |
| PK(user_id, notif_type) | | |

### iihf.scoring_config (bodovanie — nastavuje admin)
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| key | VARCHAR(50) NOT NULL UNIQUE | 'correct_winner_group' \| 'correct_winner_playoff' \| 'correct_goals_per_team' |
| value | INT NOT NULL | počet bodov |
| updated_by | FK → users | |
| updated_at | TIMESTAMP | |

### admin.invites
| Pole | Typ | Popis |
|------|-----|-------|
| id | INT PK (SEQ_INVITE) | InviteID — použije sa v placeholder username |
| invite_token | VARCHAR(100) UNIQUE | náhodný URL token |
| created_by | FK → users | admin ktorý vygeneroval link |
| created_at | TIMESTAMP | |
| used_at | TIMESTAMP | NULL = link ešte nepoužitý |
| user_id | FK → users | NULL = ešte nepoužitý, po kliknutí = vytvorený user |

### admin.friend_groups
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| name | VARCHAR(100) NOT NULL UNIQUE | názov skupiny (unikátny, verejne viditeľný) |
| created_by | FK → users | zakladateľ = group admin |
| created_at | TIMESTAMP | |

### iihf.group_members
| Pole | Typ | Popis |
|------|-----|-------|
| group_id | FK → friend_groups | |
| user_id | FK → users | |
| status | VARCHAR(10) DEFAULT 'pending' | 'pending' \| 'approved' |
| joined_at | TIMESTAMP | |
| PK(group_id, user_id) | | |

---

## Web aplikácia

### Technológia
- **React + Vite** (PWA)
- Builduje sa na statické súbory (`dist/`), uploaduje sa na fellow.sk
- Komunikuje s PHP REST API backendom
- **Web Push API** pre push notifikácie v prehliadači
- Inštalovateľná ako PWA (Add to Home Screen na mobile aj desktop)
- **URL:** ❓ (napr. iihf2026.fellow.sk)

### Obrazovky — bežný hráč
| Obrazovka | Popis |
|-----------|-------|
| **Prihlásenie** | Login formulár |
| **Dashboard** | Najbližšie zápasy, posledné výsledky, skrátené poradie |
| **Zápasy** | Zoznam všetkých zápasov, zadávanie tipov, zobrazenie výsledkov |
| **Detail zápasu** | Tip hráča, po uzavretí tipy všetkých hráčov, výsledok |
| **Poradie** | Tabuľka poradia v rámci skupiny, celkové poradie |
| **Skupiny** | Zoznam skupín, žiadosť o vstup, vytvorenie skupiny |
| **Môj profil** | Zmena username (raz), hesla, avatara, emailu, mobilu, notifikácie |

### Obrazovky — admin
| Obrazovka | Popis |
|-----------|-------|
| **Správa používateľov** | Pridanie usera, zmena hesla |
| **Zadanie výsledku** | Výsledok riadnej hracej doby + konečný výsledok |
| **Schválenie tabuľky** | Kontrola a schválenie po skupinovej fáze |
| **Nastavenia bodovanie** | Úprava scoring_config hodnôt |

### Responzívnosť
- Primárne desktop, ale použiteľné aj na mobile

---

## Infraštruktúra
- **Hosting:** fellow.sk (rovnaký ako BookClub a Scrabble)
- **Databáza:** PostgreSQL — `DB-BET` na fellow.sk
- **Backend:** PHP (REST API) — zdieľaný pre web aj Android
- **Web:** React + Vite PWA, statický build uploadovaný na fellow.sk
- **Android:** Kotlin, komunikuje s PHP API
- **URL:** ❓ (napr. iihf2026.fellow.sk)
- **Deploy heslo (FTP):** uložené v GitHub Secrets ako `FTP_PASSWORD`

### DB schémy v DB-BET
| Schéma | Obsah |
|--------|-------|
| `admin` | users, friend_groups, group_members, notification_settings, schema_versions — zdieľané pre všetky budúce turnaje |
| `iihf2026` | teams, games, scoring_config, tips — špecifické pre IIHF 2026 |
| `public` | zatiaľ prázdne |

---

## Zdroje
- Rozpis zápasov: `sources/IIHF2026.pdf` (stav k 12.2.2026)

---

*Posledná aktualizácia: 2026-05-06*
