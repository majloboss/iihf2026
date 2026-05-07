import { apiFetch } from './client';

export const getUsers      = () => apiFetch('v1/admin/users');
export const updateUser    = (id, data) => apiFetch('v1/admin/user-update', {
    method: 'POST', body: JSON.stringify({ id, ...data })
});
export const editUser      = (id, data) => apiFetch('v1/admin/user-edit', {
    method: 'POST', body: JSON.stringify({ id, ...data })
});
export const setUserPassword = (id, new_password) => apiFetch('v1/admin/user-password', {
    method: 'POST', body: JSON.stringify({ id, new_password })
});
export const deleteUser    = (id) => apiFetch('v1/admin/user-delete', {
    method: 'POST', body: JSON.stringify({ id })
});
export const getInvites   = () => apiFetch('v1/admin/invites');
export const createInvite = () => apiFetch('v1/admin/invites', { method: 'POST' });
export const updateGame      = (game_id, data) => apiFetch('v1/admin/game-update', {
    method: 'POST', body: JSON.stringify({ game_id, ...data })
});
export const getAdminGameTips = (game_id) => apiFetch(`v1/admin/game-tips?game_id=${game_id}`);
