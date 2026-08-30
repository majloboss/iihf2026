import { apiFetch } from './client';

export const getUclTeams = () => apiFetch('v1/admin/ucl-teams');
export const getUclCountries = () => apiFetch('v1/admin/ucl-countries');
export const createUclCountry = (data) => apiFetch('v1/admin/ucl-countries', {
    method: 'POST', body: JSON.stringify(data)
});
export const updateUclCountry = (data) => apiFetch('v1/admin/ucl-countries', {
    method: 'PUT', body: JSON.stringify(data)
});
export const deleteUclCountry = (country_code) => apiFetch('v1/admin/ucl-countries', {
    method: 'DELETE', body: JSON.stringify({ country_code })
});
export const createUclTeam = (data) => apiFetch('v1/admin/ucl-teams', {
    method: 'POST', body: JSON.stringify(data)
});
export const updateUclTeam = (data) => apiFetch('v1/admin/ucl-teams', {
    method: 'PUT', body: JSON.stringify(data)
});
export const deleteUclTeam = (team_id) => apiFetch('v1/admin/ucl-teams', {
    method: 'DELETE', body: JSON.stringify({ team_id })
});

// Vsetky tipy na zapas — admin vidi aj hracov, ktori netipovali.
export const getUclAdminTips = (game_id) => apiFetch(`v1/admin/ucl-game-tips?game_id=${game_id}`);

// Rucne nastavenie priebezneho skore — livescore feed vie vypadnut.
export const setUclLive = (game_id, ls_home, ls_away) => apiFetch('v1/admin/ucl-game-live', {
    method: 'POST', body: JSON.stringify({ game_id, ls_home, ls_away })
});
export const clearUclLive = (game_id) => apiFetch('v1/admin/ucl-game-live', {
    method: 'POST', body: JSON.stringify({ game_id, clear: true })
});

// --- Testovacie nástroje ---
export const getUclPdfStatus = () => apiFetch('v1/admin/ucl-load-pdf');
export const loadUclGamesFromPdf = (data) => apiFetch('v1/admin/ucl-load-pdf', {
    method: 'POST', body: JSON.stringify(data)
});

export const getUclTipsStatus = () => apiFetch('v1/admin/ucl-generate-tips');
export const generateUclTips = (data) => apiFetch('v1/admin/ucl-generate-tips', {
    method: 'POST', body: JSON.stringify(data)
});

export const getUclDays = () => apiFetch('v1/admin/ucl-shift-day');
export const shiftUclDay = (data) => apiFetch('v1/admin/ucl-shift-day', {
    method: 'POST', body: JSON.stringify(data)
});

export const getUclResultsStatus = () => apiFetch('v1/admin/ucl-generate-results');
export const generateUclResults = (data) => apiFetch('v1/admin/ucl-generate-results', {
    method: 'POST', body: JSON.stringify(data)
});
