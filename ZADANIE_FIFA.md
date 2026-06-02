# FIFA 2026 — Zadanie aplikácie

> **Legenda:** ✅ = hotovo v `main` (produkcia) &nbsp;|&nbsp; 🟠 = hotovo v `develop`, čaká na deploy &nbsp;|&nbsp; 🔲 = nie je implementované

---

## ⚠️ PRACOVNÉ PRAVIDLÁ (vždy dodržiavať)

1. **Push iba na `develop`** — na `main` NIKDY automaticky, iba na samostatný explicitný pokyn
2. **Komunikácia v slovenčine** — všetka komunikácia s userom prebieha po slovensky
3. **Na `develop` sa nepýtam** — zmeny vykonávam priamo bez čakania na potvrdenie; pýtam sa len pri deploy na main alebo deštruktívnych operáciách

---

## STAV IMPLEMENTÁCIE — PREHĽAD

🔲 *FIFA modul zatiaľ nezačatý — plánujeme*

---

## Prehľad

Tipovačka FIFA Majstrovstiev sveta 2026 pre skupinu priateľov. Rovnaká aplikácia ako IIHF2026, nové stránky/sekcia pre FIFA. Zdieľaný používateľský systém — registrácia, prihlásenie, profil, skupiny priateľov sú spoločné pre IIHF aj FIFA.

---

## Turnaj — základné info

- **Dátumy:** 11. júna – 19. júla 2026
- **Hostiteľské krajiny:** USA, Kanada, Mexiko
- **Tímy:** 48 krajín
- **Zápasy celkom:** 104
- **Formát:**
  - Skupinová fáza: 12 skupín (A–L) po 4 tímy = 72 zápasov
  - Postup: top 2 z každej skupiny + 8 najlepších 3. miest = 32 tímov
  - Round of 32 (osemfinále?): 16 zápasov
  - Round of 16: 8 zápasov
  - Štvrťfinále: 4 zápasy
  - Semifinále: 2 zápasy
  - Zápas o 3. miesto + Finále

---

## Architektúra — čo sa zdieľa s IIHF

### ✅ Zdieľané (z IIHF — hotové, netreba robiť)

- Registrácia cez invite link (admin generuje kódy)
- Prihlásenie / odhlásenie (JWT auth)
- Profil — avatar, meno, priezvisko, email, telefón, zmena hesla, zmazanie účtu
- Skupiny priateľov — vytvorenie, vstup, odchod, zrušenie, pozvanie
- Pozvánky — odosielanie, akceptovanie
- Admin — správa používateľov, invite kódy, mail log, login logy
- Push notifikácie (web push)
- CI/CD — GitHub Actions → FTP deploy na fellow.sk
- Databáza — PostgreSQL (schema `admin` pre users/groups, nová schema pre FIFA)

---

## Čo treba vytvoriť — FIFA modul

### Backend (PHP API)

- 🔲 DB migrácia — `fifa2026` schema: tímy, skupiny, zápasy, tipy, bodovanie
- 🔲 Import 48 tímov a 104 zápasov do DB
- 🔲 API: zoznam zápasov (`/api/v1/fifa/games`)
- 🔲 API: tipy — zadanie, editácia, uzavretie pred zápasom (`/api/v1/fifa/tips`)
- 🔲 API: výsledky skupinovej fázy — tabuľky 12 skupín
- 🔲 API: poradie tipérov — celkové aj per-skupina priateľov
- 🔲 API: admin — zadanie výsledku zápasu, prepočet bodov
- 🔲 Bodovací systém (definovať — napr. presné skóre, správny víťaz, správny počet gólov)
- 🔲 Live score integrácia (voliteľné — ako pri IIHF)

### Frontend (React)

- 🔲 Navigácia — prepínač IIHF / FIFA (alebo spoločný sidebar s oboma sekciami)
- 🔲 Stránka Zápasy — 104 zápasov, filter podľa fázy/skupiny, vlajky, dátumy
- 🔲 Tipovanie — presné skóre pred zápasom, editácia, uzavretie 5 min pred štartom
- 🔲 Tipy skupín — po začiatku zápasu viditeľné tipy všetkých členov skupiny
- 🔲 Tabuľka poradia — per skupina priateľov, celkové
- 🔲 Skupinové tabuľky MS (12 skupín A–L) — priebežné výsledky tímov
- 🔲 Dashboard — najbližšie zápasy s tipom/bez, posledné výsledky, skrátené poradie
- 🔲 Admin — zadávanie výsledkov, prepočet bodov

---

## Bodovací systém (návrh — potvrdiť)

*(zatiaľ nedefinovaný — dohodnúť s používateľom)*

Možnosti:
- Presné skóre: 3 body
- Správny víťaz + rozdiel gólov: 2 body
- Správny víťaz: 1 bod
- Remíza tipovaná správne: 2 body

---

## Platforma

- 🔲 Web aplikácia — React + Vite PWA (v rovnakom webe ako IIHF)
- 🔲 Android aplikácia — Kotlin (voliteľné, neskôr)

---

## Infraštruktúra

- **Hosting:** fellow.sk (rovnaký server ako IIHF)
- **Databáza:** PostgreSQL — DB-BET, nová schema `fifa2026`
- **Backend:** PHP REST API — nový prefix `/api/v1/fifa/`
- **Deploy:** GitHub Actions → FTP (rovnaký workflow ako IIHF)
- **Web URL:** iihf2026.fellow.sk (rovnaká doména — FIFA ako sekcia)

---

## Otvorené otázky

1. **Navigácia:** Bude FIFA sekcia v rovnakej aplikácii (nové routes `/fifa/...`) alebo samostatná doména?
2. **Bodovací systém:** Aké presne sú pravidlá bodovania?
3. **Tímy:** Treba vlajky pre všetkých 48 tímov (máme len 16 z IIHF)?
4. **Live score:** Integrovať automatické výsledky (API-Sports) alebo ručne admin?
5. **Skupiny:** Rovnaké skupiny priateľov ako pri IIHF, alebo nové FIFA skupiny?
