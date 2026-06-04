import { apiFetch } from './client';

export const getFifaTeams      = () => apiFetch('v1/fifa/teams');
export const getFifaAdminTips  = (game_id) => apiFetch(`v1/admin/fifa-game-tips?game_id=${game_id}`);

export const updateFifaResult  = (data) => apiFetch('v1/admin/fifa-game-update', {
    method: 'POST', body: JSON.stringify(data)
});
export const setFifaGameTeams  = (game_id, home_team_id, away_team_id) => apiFetch('v1/admin/fifa-game-teams', {
    method: 'POST', body: JSON.stringify({ game_id, home_team_id, away_team_id })
});
export const recalcFifa        = (game_id = null) => apiFetch('v1/admin/fifa-recalc', {
    method: 'POST', body: JSON.stringify(game_id ? { game_id } : {})
});
