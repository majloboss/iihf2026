// Token helper — impersonácia cez sessionStorage (per-tab), inak localStorage.
// V tabe s impersonáciou má prednosť sessionStorage 'imp_token',
// takže adminovo prihlásenie v pôvodnom tabe (localStorage) ostáva nedotknuté.

export const getToken = () =>
    sessionStorage.getItem('imp_token')
    || sessionStorage.getItem('token')
    || localStorage.getItem('token');

export const isImpersonating = () => !!sessionStorage.getItem('imp_token');

export const clearToken = () => {
    if (sessionStorage.getItem('imp_token')) sessionStorage.removeItem('imp_token');
    else if (sessionStorage.getItem('token')) sessionStorage.removeItem('token');
    else localStorage.removeItem('token');
};

// Tab, ktory vznikol impersonaciou, si to pamata aj po odhlaseni. Prihlasenie
// v nom preto zostava v sessionStorage — inak by prepisalo adminov token v
// localStorage a admin by v povodnom tabe stratil prava.
export const markImpersonationTab = () => sessionStorage.setItem('imp_tab', '1');
export const isImpersonationTab = () => !!sessionStorage.getItem('imp_tab');
