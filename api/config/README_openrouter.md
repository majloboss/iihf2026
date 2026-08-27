# Livescore cez OpenRouter

## Nastavenie

```bash
cp api/config/openrouter.example.php api/config/openrouter.php
```

Do `openrouter.php` doplň kľúč z https://openrouter.ai/keys.
Súbor je v `.gitignore`, takže sa kľúč nedostane do repozitára.

## Model

Predvolený je bezplatný `google/gemma-4-31b-it:free`.

**Ktoré modely sú bezplatné, sa v čase mení.** Model, ktorý bol včera zadarmo,
môže dnes vrátiť `This model is unavailable for free`. Preto je v rozhraní
tlačidlo **Porovnať modely** — načíta aktuálny zoznam `:free` modelov,
otestuje ich na zadanej adrese a ukáže, ktorý vráti najviac údajov.

Víťaza zapíš do `OPENROUTER_MODEL`.

Bezplatné modely majú nižšie limity požiadaviek za minútu, preto sa v porovnaní
testujú postupne, nie naraz. Vstup sa kráti na ~12 000 znakov.

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
