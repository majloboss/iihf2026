import { apiFetch } from './client';

// Pavúk vyraďovacej časti; spoločný endpoint pre všetky súťaže.
export const getBracket = (competitionId) =>
    apiFetch(`v1/bracket?competition_id=${competitionId}`);
