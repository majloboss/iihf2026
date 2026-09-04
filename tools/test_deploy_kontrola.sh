#!/usr/bin/env bash
# Overi logiku overovacieho kroku z .github/workflows/deploy.yml nanecisto:
# ci sa pri nesulade naozaj nahra znova a ci deploy spadne az po druhom
# neuspesnom pokuse.
#
# Nesiaha na server ani na FTP — curl aj lftp su nahradene.
set -u

zlyhalo=0
skontroluj() {
    if [ "$2" = "$3" ]; then echo "OK    $1"; else echo "CHYBA $1 (čakalo $3, prišlo $2)"; zlyhalo=1; fi
}

# Skrátená podoba kroku: SPRAVANIE riadi, čo „server" vracia.
spusti() {
    local SPRAVANIE="$1"
    OCAKAVANY="index-NEW.js"
    NAHRATI=0
    POKUSY=0

    curl_html() {
        case "$SPRAVANIE" in
            ok)        echo "index-NEW.js" ;;
            po_znovu)  [ "$NAHRATI" -ge 1 ] && echo "index-NEW.js" || echo "index-NEW.js" ;;
            nikdy)     echo "index-NEW.js" ;;
        esac
    }
    curl_sw() {
        case "$SPRAVANIE" in
            ok)        echo "index-NEW.js" ;;
            po_znovu)  [ "$NAHRATI" -ge 1 ] && echo "index-NEW.js" || echo "index-OLD.js" ;;
            nikdy)     echo "index-OLD.js" ;;
        esac
    }

    skus_overit() {
        for _ in 1 2; do
            POKUSY=$((POKUSY + 1))
            JS_HTML=$(curl_html); JS_SW=$(curl_sw)
            if [ -n "$JS_HTML" ] && [ "$JS_HTML" = "$JS_SW" ] \
               && { [ -z "$OCAKAVANY" ] || [ "$JS_HTML" = "$OCAKAVANY" ]; }; then
                return 0
            fi
        done
        return 1
    }

    if skus_overit; then
        VYSLEDOK="hned"
    else
        NAHRATI=$((NAHRATI + 1))          # zastupuje opakovane lftp
        if skus_overit; then VYSLEDOK="po_opakovani"; else VYSLEDOK="chyba"; fi
    fi
    echo "$VYSLEDOK|$NAHRATI"
}

r=$(spusti ok)
skontroluj "zhoda hneď: neopakuje sa nahrávanie" "${r%|*}" "hned"
skontroluj "zhoda hneď: žiadne opakované nahratie" "${r#*|}" "0"

r=$(spusti po_znovu)
skontroluj "nesúlad: nahrá sa znova a prejde" "${r%|*}" "po_opakovani"
skontroluj "nesúlad: nahralo sa práve raz" "${r#*|}" "1"

r=$(spusti nikdy)
skontroluj "trvalý nesúlad: deploy spadne" "${r%|*}" "chyba"

if [ "$zlyhalo" = "0" ]; then echo; echo "Vsetky kontroly presli"; else echo; echo "NIEKTORE KONTROLY ZLYHALI"; fi
exit "$zlyhalo"
