// Token helper — impersonácia cez sessionStorage (per-tab), inak localStorage.
// V tabe s impersonáciou má prednosť sessionStorage 'imp_token',
// takže adminovo prihlásenie v pôvodnom tabe (localStorage) ostáva nedotknuté.

export const getToken = () =>
    sessionStorage.getItem('imp_token') || localStorage.getItem('token');

export const isImpersonating = () => !!sessionStorage.getItem('imp_token');

export const clearToken = () => {
    if (sessionStorage.getItem('imp_token')) sessionStorage.removeItem('imp_token');
    else localStorage.removeItem('token');
};
