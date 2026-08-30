// Token helper.
//
// Prihlásenie žije v sessionStorage, teda per-tab. Vďaka tomu môže byť v jednom
// tabe admin a v druhom hráč (impersonácia alebo bežné prihlásenie) a odhlásenie
// v jednom tabe druhý neovplyvní — localStorage je zdieľaný, takže by ho
// odhlásenie kdekoľvek zhodilo všade.
//
// localStorage zostáva ako záloha, aby prihlásenie prežilo zatvorenie tabu:
// nový tab si token z neho prevezme do svojej session.

const IMP = 'imp_token';      // impersonácia — má vždy prednosť
const TAB = 'token';          // prihlásenie v tomto tabe
const ULOZENE = 'token';      // localStorage, prežije zatvorenie prehliadača

export const getToken = () => {
    const imp = sessionStorage.getItem(IMP);
    if (imp) return imp;

    const tab = sessionStorage.getItem(TAB);
    if (tab) return tab;

    // Nový tab prevezme uložené prihlásenie, ale ďalej si ho drží sám.
    const ulozene = localStorage.getItem(ULOZENE);
    if (ulozene) sessionStorage.setItem(TAB, ulozene);
    return ulozene;
};

export const isImpersonating = () => !!sessionStorage.getItem(IMP);

/**
 * Odhlásenie sa týka iba tohto tabu. Zdieľanú zálohu zmaže len vtedy, keď sa
 * odhlasuje ten istý účet — inak by hráč odhlásil admina vo vedľajšom tabe.
 */
export const clearToken = () => {
    if (sessionStorage.getItem(IMP)) {
        sessionStorage.removeItem(IMP);
        return;
    }
    const tab = sessionStorage.getItem(TAB);
    sessionStorage.removeItem(TAB);
    if (tab && tab === localStorage.getItem(ULOZENE)) localStorage.removeItem(ULOZENE);
};

/** Prihlásenie platí pre tento tab; do zálohy ide, len ak nejde o impersonačný tab. */
export const setToken = (token) => {
    sessionStorage.setItem(TAB, token);
    if (!sessionStorage.getItem(IMP) && !isImpersonationTab()) {
        localStorage.setItem(ULOZENE, token);
    }
};

// Tab, ktorý vznikol impersonáciou, si to pamätá aj po odhlásení, aby sa
// prípadné ďalšie prihlásenie nedostalo do zdieľanej zálohy.
export const markImpersonationTab = () => sessionStorage.setItem('imp_tab', '1');
export const isImpersonationTab = () => !!sessionStorage.getItem('imp_tab');
