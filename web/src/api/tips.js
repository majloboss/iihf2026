import { apiFetch } from './client';

export const getMyTips     = () => apiFetch('v1/tips');
export const saveTip       = (game_id, tip1, tip2) =>
    apiFetch('v1/tips', { method: 'POST', body: JSON.stringify({ game_id, tip1, tip2 }) });
export const getGameTips   = (game_id) => apiFetch(`v1/game-tips?game_id=${game_id}`);
