# Číselník štátov — zdrojové dáta

Zdroj: `sources/flags/state_flag_list.csv` (254 štátov) + vlajky v `sources/flags/`.

## CSV

Oddeľovač `;`, kódovanie UTF-8 s BOM. Hodnota `-` znamená **chýbajúci údaj** a ukladá sa ako `NULL`.

```
id;state_code_2;state_code_3;state_name_origin;state_name_english;state_name_slovak;state_name_slovak_long;state_flag_big;state_flag_small;flag_check
```

| Stĺpec | DB stĺpec | Poznámka |
|---|---|---|
| `id` | `source_id` | unikátne |
| `state_code_2` | `country_code2` | ISO alpha-2, pri britských krajinách `GB-ENG` |
| `state_code_3` | `country_code` | ISO alpha-3, primárny kľúč |
| `state_name_origin` | `name_original` | v zdroji zatiaľ všade `-` → `NULL` |
| `state_name_english` | `name_en` | ak chýba, použije sa slovenský názov |
| `state_name_slovak` | `name_sk` | povinné |
| `state_name_slovak_long` | `name_sk_long` | napr. `Slovenská republika` |
| `state_flag_big` | `flag_file_big` | 240 px |
| `state_flag_small` | `flag_file` | 24 px |
| `flag_check` | `flag_check` | kontrolná poznámka |

## Kódy štátov vs športové kódy

Číselník je **ISO 3166**. Súťaže používajú vlastné športové kódy, ktoré sa od ISO
líšia v 21 prípadoch a **navzájom aj medzi sebou**:

| Štát | ISO | FIFA | IIHF | UEFA |
|---|---|---|---|---|
| Slovinsko | `SVN` | — | `SLO` | `SVN` |
| Lotyšsko | `LVA` | — | `LAT` | `LVA` |
| Nemecko | `DEU` | `GER` | `GER` | `GER` |
| Anglicko | `GB-ENG` | `ENG` | — | `ENG` |
| Spojené kráľovstvo | `GBR` | — | `GBR` | — |

Posledné dva riadky nie sú len iný kód, ale **iný subjekt**: IIHF má jeden britský tím,
futbal má štyri samostatné krajiny.

Preto má každá súťaž vlastný stĺpec `sport_code_fifa`, `sport_code_iihf`, `sport_code_uefa`.
Aplikácia si pri každom športe povie, ktorý kód zobrazuje.

## Vlajky

`sources/flags/*.png` → skopírované do `web/public/flags/`.
Formát `flag_<code2 lowercase>_24.png` (malá) a `_240.png` (veľká), napr. `flag_sk_24.png`.

## Migrácie

| Verzia | Súbor | Čo robí |
|---|---|---|
| `052` | `052_admin_countries_csv_struct.sql` | stĺpce `source_id`, `country_code2`, `name_sk_long`, `flag_file_big`, `flag_check` |
| `053` | `053_admin_countries_sport_codes.sql` | športové kódy + uvoľnenie formátu kódu na `GB-ENG` |
| `054` | `054_countries_import.sql` | **vyprázdni** číselník, nahrá 254 štátov, premapuje UCL kluby na ISO |
| `055` | `055_admin_countries_reorder.sql` | prestavia tabuľku do logického poradia stĺpcov |

Poradie stĺpcov bolo dané históriou migrácií, nie logikou (`country_code2` až za
`updated_at`, `flag_file` ďaleko od `flag_file_big`). Postgres poradie existujúcich
stĺpcov meniť nevie, preto `055` tabuľku prestavia cez dočasnú kópiu. Názvy, typy ani
obmedzenia sa nemenia — iba poradie, takže PHP kód netreba upravovať.

Cieľové poradie: identifikátory → kódy → názvy → vlajky → metadáta.

Migrácia `054` beží v jednej transakcii: odpojí FK klubov, vyprázdni číselník, nahrá dáta,
premapuje kluby z UEFA kódov na ISO (`GER`→`DEU`, `ENG`→`GB-ENG`), overí, že žiadny klub
nemá neplatný kód, a až potom FK znova napojí. Pri akejkoľvek chybe sa nezmení nič.

## Spúšťanie migrácií

Endpoint `/v1/admin/run-migration` (iba admin):

- `GET` — stav všetkých migrácií (`applied`, `untracked`, `pending`)
- `POST {"dry_run": true}` — čo by spustil
- `POST` — spustí čakajúce
- `POST {"version": 54}` — adresne jednu

Migrácie `002`–`011`, `020` a `036` sa do `admin.schema_versions` nikdy nezapisovali,
preto sú `untracked` a automaticky sa **nespúšťajú**.

## Opätovné vygenerovanie importu

Ak sa CSV zmení, migráciu `054` prepíš skriptami zo scratchpadu
(`build_sport_map.cjs` → `gen_import.cjs` → `verify_import.cjs`).
Overovací skript kontroluje počet štátov, existenciu všetkých vlajok, pokrytie
UCL kódov, unikátnosť športových kódov a uzavretosť transakcie.
