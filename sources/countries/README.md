# Číselník štátov — zdrojové dáta

Sem patrí CSV so štátmi a stiahnuté vlajky.

## CSV

Súbor: `sources/countries/staty.csv`, oddeľovač `;`, kódovanie UTF-8.

```
id;state_code_2;state_code_3;state_name_origin;state_name_english;state_name_slovak;state_name_slovak_long;state_flag_big;state_flag_small;flag_check
```

| Stĺpec | DB stĺpec | Pravidlá |
|---|---|---|
| `id` | `source_id` | celé číslo, unikátne |
| `state_code_2` | `country_code2` | presne 2 veľké písmená, unikátne, môže byť prázdne |
| `state_code_3` | `country_code` | presne 3 veľké písmená, primárny kľúč |
| `state_name_origin` | `name_original` | voliteľné |
| `state_name_english` | `name_en` | povinné |
| `state_name_slovak` | `name_sk` | povinné, krátky názov |
| `state_name_slovak_long` | `name_sk_long` | voliteľné, napr. `Slovenská republika` |
| `state_flag_big` | `flag_file_big` | názov súboru bez cesty |
| `state_flag_small` | `flag_file` | názov súboru bez cesty |
| `flag_check` | `flag_check` | voliteľná kontrolná poznámka |

## Vlajky

Súbory nakopírovať do `web/public/flags/`. V CSV sa uvádza iba názov súboru, nie cesta.

## Import

```bash
node tools/import_countries_csv.cjs sources/countries/staty.csv api/migrations/053_countries_import.sql 53
```

Skript CSV najprv zvaliduje. Pri neplatnom kóde, duplicite, chýbajúcom názve alebo ceste
vo vlajke migráciu nevygeneruje a vypíše čísla chybných riadkov.

Vygenerovaná migrácia je idempotentná — opakované spustenie iba prepíše názvy a vlajky.

Poradie spustenia na DB-DEV-BET: `052` (rozšírenie štruktúry), potom `053` (import dát).

## Spúšťanie migrácií

Endpoint `/v1/admin/run-migration` (iba admin):

- `GET` — vypíše všetky migrácie a ich stav (`applied`, `untracked`, `pending`)
- `POST` — spustí čakajúce migrácie
- `POST {"dry_run": true}` — iba vypíše, čo by spustil
- `POST {"version": 53}` — spustí adresne jednu migráciu

Stav sa vyhodnocuje podľa `admin.schema_versions`. Migrácie `002`–`011`, `020` a `036`
sa do tejto tabuľky nikdy nezapisovali, preto sú označené ako `untracked` a automaticky
sa **nespúšťajú** — bežia iba migrácie novšie ako najvyššia zaznamenaná verzia.
Každá migrácia beží vo vlastnej transakcii, takže chyba nezruší už spustené.
