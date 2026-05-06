# IIHF2026 — Zadanie aplikácie

## Prehľad
Android aplikácia — tipovačka výsledkov MS v ľadovom hokeji 2026 pre skupinu priateľov.

---

## Platforma
- Android aplikácia

---

## Používatelia

### Registrácia
| Pole | Povinné |
|------|---------|
| username | áno |
| password | áno |
| meno | nie |
| priezvisko | nie |
| email | nie |
| telefón | nie |

### Roly
- **User** — bežný používateľ, tipuje zápasy, sleduje výsledky a poradie
- **Admin** — zadáva výsledky, spravuje bodovanie, schvaľuje tabuľky, generuje play-off zápasy

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
- Zadávanie výsledkov zápasov
- Nastavenie a úprava bodovacieho systému
- Schválenie tabuľky po skupinovej fáze (s možnosťou korekcie)
- Generovanie play-off zápasov po schválení

---

## Tipovanie
- Hráč tipuje **presný výsledok riadnej hracej doby (60 minút)**
- Tipujú sa všetky zápasy — skupinová fáza aj play-off
- ❓ Dokedy možno zmeniť tip? (napr. do začiatku zápasu)

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
- ❓ Jedna skupina, alebo môže existovať viac skupín?
- ❓ Ako sa pozýva do skupiny? (link, kód, admin pridáva ručne)

---

## Ďalšie funkcie
- ❓ Tabuľka poradia používateľov?
- ❓ Notifikácie (pripomienka pred zápasom, oznámenie výsledku)?
- ❓ História tipov?

---

## Otvorené otázky
1. Deadline na tip — dokedy možno zmeniť tip pred zápasom?
2. Jedna vs. viac skupín priateľov
3. Spôsob pozvania do skupiny
4. Notifikácie
5. História tipov

---

## Návrh databázových tabuliek

### iihf.users
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| username | VARCHAR(50) NOT NULL UNIQUE | |
| password | VARCHAR(255) NOT NULL | bcrypt hash |
| first_name | VARCHAR(100) | voliteľné |
| last_name | VARCHAR(100) | voliteľné |
| email | VARCHAR(150) UNIQUE | voliteľné |
| phone | VARCHAR(30) | voliteľné |
| role | VARCHAR(10) DEFAULT 'user' | 'user' \| 'admin' |
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
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| UNIQUE(user_id, game_id) | | jeden tip na zápas |

### iihf.scoring_config (bodovanie — nastavuje admin)
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| key | VARCHAR(50) NOT NULL UNIQUE | 'correct_winner_group' \| 'correct_winner_playoff' \| 'correct_goals_per_team' |
| value | INT NOT NULL | počet bodov |
| updated_by | FK → users | |
| updated_at | TIMESTAMP | |

### iihf.friend_groups (skupiny priateľov) ❓
| Pole | Typ | Popis |
|------|-----|-------|
| id | SERIAL PK | |
| name | VARCHAR(100) NOT NULL | názov skupiny |
| invite_code | VARCHAR(20) NOT NULL UNIQUE | kód na pozvanie |
| created_by | FK → users | |
| created_at | TIMESTAMP | |

### iihf.group_members ❓
| Pole | Typ | Popis |
|------|-----|-------|
| group_id | FK → friend_groups | |
| user_id | FK → users | |
| joined_at | TIMESTAMP | |
| PK(group_id, user_id) | | |

---

## Infraštruktúra
- **Databáza:** PostgreSQL na hostingu fellow.sk (rovnaký hosting ako BookClub a Scrabble)
- **Backend:** PHP (REST API)
- **Android app:** komunikuje s backendom cez API

---

## Zdroje
- Rozpis zápasov: `sources/IIHF2026.pdf` (stav k 12.2.2026)

---

*Posledná aktualizácia: 2026-05-06*
