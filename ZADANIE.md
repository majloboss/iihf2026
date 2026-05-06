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
- **Bežný používateľ** — tipuje zápasy, sleduje výsledky a poradie
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
- ❓ Tipuje sa iba výsledok (kto vyhrá), alebo aj presné skóre?
- ❓ Tipujú sa všetky zápasy (skupiny aj play-off)?
- ❓ Dokedy možno zmeniť tip? (napr. do začiatku zápasu)

---

## Bodovanie
- Systém bodov nastavuje a môže meniť admin
- ❓ Aký je predvolený bodovací systém?

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
1. Tipovanie — výsledok vs. presné skóre
2. Ktoré zápasy sa tipujú
3. Deadline na tip
4. Predvolený bodovací systém
5. Jedna vs. viac skupín priateľov
6. Spôsob pozvania do skupiny
7. Notifikácie
8. História tipov

---

## Zdroje
- Rozpis zápasov: `sources/IIHF2026.pdf` (stav k 12.2.2026)

---

*Posledná aktualizácia: 2026-05-06*
