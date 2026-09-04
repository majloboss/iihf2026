import { apiFetch } from './client';

export const getUsers      = () => apiFetch('v1/admin/users');
export const impersonate   = (user_id) => apiFetch('v1/admin/impersonate', {
    method: 'POST', body: JSON.stringify({ user_id })
});
export const updateUser    = (id, data) => apiFetch('v1/admin/user-update', {
    method: 'POST', body: JSON.stringify({ id, ...data })
});
export const editUser      = (id, data) => apiFetch('v1/admin/user-edit', {
    method: 'POST', body: JSON.stringify({ id, ...data })
});
export const setUserPassword = (id, new_password) => apiFetch('v1/admin/user-password', {
    method: 'POST', body: JSON.stringify({ id, new_password })
});
export const revokeUserTokens = (id) => apiFetch('v1/admin/user-revoke', {
    method: 'POST', body: JSON.stringify({ id })
});
export const deleteUser    = (id) => apiFetch('v1/admin/user-delete', {
    method: 'POST', body: JSON.stringify({ id })
});
export const getInvites        = () => apiFetch('v1/admin/invites');
export const createInvite      = (sent_to, group_id = null) => apiFetch('v1/admin/invites', {
    method: 'POST', body: JSON.stringify({ sent_to, group_id })
});
export const updateInviteSentTo = (id, sent_to) => apiFetch('v1/admin/invites', {
    method: 'PUT', body: JSON.stringify({ id, sent_to })
});
export const updateGame      = (game_id, data) => apiFetch('v1/admin/game-update', {
    method: 'POST', body: JSON.stringify({ game_id, ...data })
});
export const getAdminGameTips = (game_id) => apiFetch(`v1/admin/game-tips?game_id=${game_id}`);
export const recalcPoints        = () => apiFetch('v1/admin/recalc-points', { method: 'POST' });
export const syncGroupStandings  = () => apiFetch('v1/admin/group-standings', { method: 'POST' });
export const updateGroupStanding = (data) => apiFetch('v1/admin/group-standings', {
    method: 'PUT', body: JSON.stringify(data)
});
export const resetGroupStandings = (phase) => apiFetch(
    phase ? `v1/admin/group-standings/${phase}` : 'v1/admin/group-standings',
    { method: 'DELETE' }
);
export const getAnnouncements  = () => apiFetch('v1/admin/announcements');
export const createAnnouncement = (body) => apiFetch('v1/admin/announcements', {
    method: 'POST', body: JSON.stringify({ body })
});
export const deactivateAnnouncement = (id) => apiFetch('v1/admin/announcements', {
    method: 'PATCH', body: JSON.stringify({ id })
});

// Zobrazenie oznamu na Prehľade a v histórii. Sú nezávislé — keď sú vypnuté
// obe, oznam nie je vidieť nikde, ale nič sa nemaže a dá sa zapnúť späť.
export const updateAnnouncementFlags = (id, { is_active, show_dashboard }) =>
    apiFetch('v1/admin/announcements', {
        method: 'PATCH', body: JSON.stringify({ id, is_active, show_dashboard })
    });
