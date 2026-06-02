import { apiFetch } from './client';

export const getCompetitions  = ()    => apiFetch('v1/competitions');
export const setActiveCompetition = (id) => apiFetch('v1/competitions/active', {
    method: 'POST',
    body: JSON.stringify({ competition_id: id }),
});
