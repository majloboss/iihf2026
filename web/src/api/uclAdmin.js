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

// --- Testovacie nástroje ---
export const getUclPdfStatus = () => apiFetch('v1/admin/ucl-load-pdf');
export const loadUclGamesFromPdf = (data) => apiFetch('v1/admin/ucl-load-pdf', {
    method: 'POST', body: JSON.stringify(data)
});

export const getUclTipsStatus = () => apiFetch('v1/admin/ucl-generate-tips');
export const generateUclTips = (data) => apiFetch('v1/admin/ucl-generate-tips', {
    method: 'POST', body: JSON.stringify(data)
});

export const getUclResultsStatus = () => apiFetch('v1/admin/ucl-generate-results');
export const generateUclResults = (data) => apiFetch('v1/admin/ucl-generate-results', {
    method: 'POST', body: JSON.stringify(data)
});
