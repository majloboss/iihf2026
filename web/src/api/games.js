import { apiFetch } from './client';

export const getGames = () => apiFetch('v1/games');
export const getGame  = (id) => apiFetch(`v1/games?id=${id}`);
