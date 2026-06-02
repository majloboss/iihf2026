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

## Prehľad — BetClub platforma

Aplikácia sa volá **BetClub** — multi-turnajová tipovačka pre skupinu priateľov.

- Úvodná stránka / domov = rozcestník s kartami turnajov: **Hokej MS 2026**, **FIFA MS 2026**, atď.
- Každý turnaj má vlastnú sekciu (vlastné routes, vlastné skupiny priateľov, vlastné tipy)
- Používateľský systém (registrácia, login, profil, avatar) je spoločný pre celú platformu
- Skupiny priateľov sú per-turnaj — každá tipovačka má vlastné skupiny
- Praktická funkcia: autor skupiny v jednej tipovačke môže jedným klikom pozvať všetkých jej členov do novej skupiny v inej tipovačke

---

## Turnaj — základné info

- **Dátumy:** 11. júna – 19. júla 2026
- **Hostiteľské krajiny:** USA, Kanada, Mexiko
- **Tímy:** 48 krajín
- **Zápasy celkom:** 104
- **Formát:**
  - Skupinová fáza: 12 skupín (A–L) po 4 tímy = 72 zápasov
  - Postup: top 2 z každej skupiny + 8 najlepších 3. miest → 32 tímov
  - Round of 32: 16 zápasov
  - Round of 16: 8 zápasov
  - Štvrťfinále: 4 zápasy
  - Semifinále: 2 zápasy
  - Zápas o 3. miesto + Finále
  - **Celkom: 104 zápasov**

---

## Bodovací systém

Rovnaký princíp ako IIHF 2026:

| Situácia | Body |
|---|---|
| Presný výsledok (napr. 3:1) | **3 body** |
| Správny víťaz + správny rozdiel (napr. tip 2:0, reál 3:1) | **2 body** |
| Správny víťaz (napr. tip 2:0, reál 1:0) | **1 bod** |
| Remíza tipovaná správne (bez ohľadu na skóre) | **2 body** |
| Nesprávny výsledok | **0 bodov** |

**Play-off zápasy:** Výsledok sa porovnáva s výsledkom **po riadnom čase (90 min)**. Ak tip znie 1:1 a zápas ide do predĺženia, tip sa hodnotí ako remíza = **2 body** (správna remíza po 90 min). Skóre predĺženia a penalty sa do tipu nepočítajú.

---

## Skupiny priateľov

- Skupiny sú **per-turnaj** — pre IIHF a FIFA sú to oddelené skupiny
- Autor skupiny môže **jedným klikom pozvať všetkých členov** z existujúcej skupiny (z iného turnaja alebo rovnakého) do novej skupiny — hromadná pozvánka
- Ostatné pravidlá skupín rovnaké ako pri IIHF (pending → accepted, odchod, zrušenie)

---

## Live výsledky

- **Manuálne** — admin zadáva výsledky zápasov cez admin rozhranie
- (Automatická integrácia API-Sports nie je plánovaná)

---

## Architektúra — BetClub

### Navigácia

Menu sa **nemení** — zostáva rovnaká štruktúra ako pri IIHF (Zápasy, Skupiny, Poradie, Dashboard...).

V **Profile** pribudne nová záložka **Súťaže**:
- Zoznam dostupných turnajov (napr. „IIHF MS 2026", „FIFA MS 2026")
- User si vyberie aktívny turnaj → uloží sa do jeho profilu (napr. `localStorage` alebo DB)
- Všetky stránky (Zápasy, Skupiny, Poradie, Dashboard) sa automaticky prepínajú na kontext zvoleného turnaja
- Aktívny turnaj je viditeľný napr. v headeri/sidebari (malý badge alebo názov)

```
Profil → záložka Súťaže → výber aktívneho turnaja
                            ↓
          Zápasy / Skupiny / Poradie / Dashboard
          (zobrazujú dáta pre zvolený turnaj)
```

### Čo sa zdieľa (z IIHF — hotové)

- ✅ Registrácia cez invite link + prihlásenie (JWT)
- ✅ Profil — avatar, meno, email, telefón, zmena hesla
- ✅ Admin — správa používateľov, invite kódy
- ✅ Push notifikácie, email notifikácie
- ✅ CI/CD — GitHub Actions → FTP
- ✅ DB — PostgreSQL DB-BET (schema `admin` pre users/groups)

---

## Čo treba vytvoriť

### 1. Multi-turnaj infraštruktúra

- 🔲 DB: tabuľka `competitions` — zoznam turnajov (id, name, slug, season, active)
- 🔲 DB: `users.active_competition_id` — ktorý turnaj má user aktuálne nastavený
- 🔲 Backend: API endpoint na zoznam turnajov + nastavenie aktívneho
- 🔲 Frontend: záložka **Súťaže** v Profile — výber aktívneho turnaja
- 🔲 Frontend: `CompetitionContext` — globálny kontext aktívneho turnaja, všetky stránky ho čítajú
- 🔲 Frontend: badge/label aktívneho turnaja v sidebari (napr. „🏒 IIHF 2026" alebo „⚽ FIFA 2026")

### 2. Skupiny — hromadná pozvánka

- 🔲 Backend: endpoint „pozvať všetkých z inej skupiny" — vytvorí pozvánky pre všetkých členov naraz
- 🔲 Frontend: tlačidlo „Pozvať skupinu" pri zakladaní novej skupiny — výber existujúcej skupiny → potvrdenie

### 3. FIFA backend (PHP API)

- 🔲 DB migrácia — schema `fifa2026`: tímy (48), skupiny (A–L), zápasy (104), tipy, bodovanie
- 🔲 Import 48 tímov a 104 zápasov do DB
- 🔲 API: zoznam zápasov (`/api/v1/fifa/games`)
- 🔲 API: tipy — zadanie, editácia, uzavretie 5 min pred zápasom (`/api/v1/fifa/tips`)
- 🔲 API: poradie tipérov — celkové aj per-skupina priateľov
- 🔲 API: skupinové tabuľky MS (12 skupín A–L) — priebežné výsledky tímov
- 🔲 API: admin — zadanie výsledku zápasu, prepočet bodov
- 🔲 API: admin — finalizácia postupu zo skupín (kto postúpil)

### 4. FIFA frontend (React)

- 🔲 Stránka Zápasy — 104 zápasov, filter podľa fázy/skupiny, vlajky, dátumy
- 🔲 Tipovanie — presné skóre pred zápasom, editácia, uzavretie 5 min pred štartom
- 🔲 Tipy skupín — po začiatku zápasu viditeľné tipy všetkých členov skupiny
- 🔲 Tabuľka poradia — per skupina priateľov, celkové
- 🔲 Skupinové tabuľky MS (12 skupín A–L) — živé výsledky tímov
- 🔲 Dashboard FIFA — najbližšie zápasy s tipom/bez, posledné výsledky, skrátené poradie
- 🔲 Admin — zadávanie výsledkov, prepočet bodov

---

## Platforma

- 🔲 Web aplikácia — React + Vite PWA (rozšírenie existujúceho webu)
- 🔲 Android aplikácia — Kotlin (voliteľné, neskôr)

---

## Infraštruktúra

- **Hosting:** fellow.sk (rovnaký server ako IIHF)
- **Databáza:** PostgreSQL — DB-BET, nová schema `fifa2026`
- **Backend:** PHP REST API — nový prefix `/api/v1/fifa/`
- **Deploy:** GitHub Actions → FTP (nový workflow pre betclub.fellow.sk)
- **Web URL (prod):** betclub.fellow.sk *(nová subdoména — treba nastaviť na fellow.sk)*
- **Web URL (dev):** dev_betclub.fellow.sk *(alebo dev_iihf2026.fellow.sk zostáva ako dev)*

---

## Postup zo skupín a play-off zápasy

**Problém:** Na rozdiel od IIHF, v play-off FIFA nie sú zápasy vopred definované — závisia od skupinových výsledkov.

**Riešenie:**
1. Skupinová fáza prebehne, systém automaticky vypočíta poradie v 12 skupinách
2. Systém automaticky navrhne 8 postupujúcich 3. miest (podľa FIFA pravidiel: body → skóre → strelené góly → abeceda)
3. Admin skontroluje návrh a **potvrdí** postup (môže upraviť)
4. Admin **ručne zadá** zápasy Round of 32 (kto hrá s kým) — systém vie len tímové kódy, nie bracket
5. Rovnaký postup pre Round of 16, QF, SF — admin zakladá zápasy po skončení predchádzajúceho kola
6. Tipéri tipujú play-off zápasy rovnako ako skupinové

---

## Otvorené otázky

1. **Vlajky:** Treba vlajky pre všetkých 48 FIFA tímov (máme len 16 z IIHF — iný set krajín, treba stiahnuť/pripraviť)
2. **Dev subdoména:** dev_betclub.fellow.sk alebo zostáva dev_iihf2026.fellow.sk pre dev prostredie?
