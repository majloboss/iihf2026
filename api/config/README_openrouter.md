# Livescore cez OpenRouter

## Nastavenie

```bash
cp api/config/openrouter.example.php api/config/openrouter.php
```

Do `openrouter.php` doplň kľúč z https://openrouter.ai/keys.
Súbor je v `.gitignore`, takže sa kľúč nedostane do repozitára.

## Model

Predvolený je bezplatný `meta-llama/llama-3.3-70b-instruct:free`.
Ďalšie bezplatné modely majú príponu `:free` — zoznam na https://openrouter.ai/models.

Bezplatné modely majú nižšie limity požiadaviek za minútu a menšie kontextové okno.
Preto sa vstup kráti na ~12 000 znakov (text stránky + dátový feed).

## Ako to funguje

1. Server stiahne stránku zápasu z Flashscore
2. Odstráni HTML značky a vyberie dátový feed (`AA÷id¬AE÷domáci¬AG÷skóre`)
3. Pošle to modelu s požiadavkou o JSON so stavom zápasu
4. Výsledok zobrazí v **Nástroje → Common → Test livescore**

Model je použitý zámerne namiesto pevného parsera — vie sa zorientovať aj keď
Flashscore zmení štruktúru stránky.

## Obmedzenia

- Sťahovať sa dá len z `flashscore.com` a `livescore.com` (ochrana pred zneužitím
  endpointu na dopyty do vnútornej siete)
- Flashscore dáva skóre v dátovom feede na stránke súťaže; na detaile zápasu
  je časť údajov dopĺňaná JavaScriptom a model ich nemusí nájsť
- Livescore.com vracia prázdnu kostru — model tam skóre nenájde
