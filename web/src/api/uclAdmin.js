import { apiFetch } from './client';

export const getUclTeams = () => apiFetch('v1/admin/ucl-teams');
export const createUclTeam = (data) => apiFetch('v1/admin/ucl-teams', {
    method: 'POST', body: JSON.stringify(data)
});
export const updateUclTeam = (data) => apiFetch('v1/admin/ucl-teams', {
    method: 'PUT', body: JSON.stringify(data)
});
export const deleteUclTeam = (team_id) => apiFetch('v1/admin/ucl-teams', {
    method: 'DELETE', body: JSON.stringify({ team_id })
});
