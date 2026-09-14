#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Vyrobi DEV variantu favicony: to iste logo, ale na zelenom pozadi.

Na dev a produkcii je otvorena ta ista appka a v zalozkach prehliadaca sa
nedali rozoznat. Zelena je rovnaka ako v dev PWA ikone (#28A745), aby to
vyzeralo ako jedna rodina.

Pri 64 px by bol napis "DEV" necitatelny, preto sa nekresli — rozoznavacim
znakom je samotna farba pozadia.

Pouzitie: python tools/gen_favicon_dev.py
"""

import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Chyba kniznica Pillow. Spusti: pip install Pillow")

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VEREJNE = os.path.join(BASE, "web", "public")

# Zelena z dev PWA ikony (icon-192-dev.png) — aby dev favicon a dev ikona
# sedeli spolu.
ZELENA = (0x28, 0xA7, 0x45, 255)

# Kolko z obrazka zaberie zeleny ram. Samotne podlozenie nestaci: logo ma
# vlastne biele koliesko a priesvitnych je len okolo 20 % plochy, takze
# zelena by sa v zalozke stratila. Zmensenim loga vznikne po obvode pruh,
# ktory je vidiet aj pri 16 px.
RAM_PODIEL = 0.16


def dev_variant(zdroj, ciel):
    if not os.path.isfile(zdroj):
        print("  preskakujem, nenaslo sa: %s" % os.path.basename(zdroj))
        return False

    logo = Image.open(zdroj).convert("RGBA")
    w, h = logo.size

    ram = max(2, int(round(min(w, h) * RAM_PODIEL)))
    zmensene = logo.resize((w - 2 * ram, h - 2 * ram), Image.LANCZOS)

    # alpha_composite, nie paste — logo ma priesvitne okraje a tvrde
    # vlozenie by ich orezalo do zubov.
    pozadie = Image.new("RGBA", (w, h), ZELENA)
    vrstva = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vrstva.paste(zmensene, (ram, ram))
    vysledok = Image.alpha_composite(pozadie, vrstva)
    vysledok.save(ciel)

    print("  %s (%dx%d, ram %d px)" % (os.path.basename(ciel), w, h, ram))
    return True


def main():
    print("DEV varianty ikon so zelenym pozadim:")
    urobene = 0

    for nazov in ("favicon.png", "apple-touch-icon.png", "favicon-32.png",
                  "favicon-16.png"):
        zdroj = os.path.join(VEREJNE, nazov)
        ciel = os.path.join(VEREJNE, nazov.replace(".png", "-dev.png"))
        if dev_variant(zdroj, ciel):
            urobene += 1

    if urobene == 0:
        sys.exit("Nenasla sa ziadna predloha vo web/public/")
    print("\nHotovo: %d suborov" % urobene)


if __name__ == "__main__":
    main()
