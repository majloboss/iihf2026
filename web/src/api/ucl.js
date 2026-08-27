import { apiFetch } from './client';

// Používateľská časť
export const getUclGames = () => apiFetch('v1/ucl/games');
export const getUclGame = (id) => apiFetch(`v1/ucl/games?id=${id}`);
export const getUclPlayingTeams = () => apiFetch('v1/ucl/teams');
export const getUclTips = () => apiFetch('v1/ucl/tips');
export const saveUclTip = (game_id, home_score_tip, away_score_tip) =>
    apiFetch('v1/ucl/tips', {
        method: 'POST',
        body: JSON.stringify({ game_id, home_score_tip, away_score_tip }),
    });
export const getUclGameTips = (game_id) => apiFetch(`v1/ucl/game-tips?game_id=${game_id}`);
export const getUclStandings = () => apiFetch('v1/ucl/standings');

// Admin
export const updateUclGameResult = (data) =>
    apiFetch('v1/admin/ucl-game-update', { method: 'POST', body: JSON.stringify(data) });
export const editUclGame = (data) =>
    apiFetch('v1/admin/ucl-game-edit', { method: 'PUT', body: JSON.stringify(data) });
export const recalcUcl = () => apiFetch('v1/admin/ucl-recalc', { method: 'POST' });
export const editUclTie = (data) =>
    apiFetch('v1/admin/ucl-tie-edit', { method: 'PUT', body: JSON.stringify(data) });
export const getUclLivescore = () => apiFetch('v1/admin/ucl-livescore');
export const refreshUclLivescore = () => apiFetch('v1/admin/ucl-livescore', { method: 'POST' });
