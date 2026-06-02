import { apiFetch } from './client';

export const getFifaGames = ()       => apiFetch('v1/fifa/games');
export const saveFifaTip  = (game_id, home, away) => apiFetch('v1/fifa/tips', {
    method: 'POST',
    body: JSON.stringify({ game_id, home_score_tip: home, away_score_tip: away }),
});
