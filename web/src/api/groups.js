import { apiFetch } from './client';

export const getGroups     = (competition_id)       => apiFetch(`v1/groups${competition_id ? `?competition_id=${competition_id}` : ''}`);
export const getAllMyGroups = ()                     => apiFetch('v1/groups?all_competitions=1');
export const createGroup   = (name, competition_id, description = null, visibility = 'public') => apiFetch('v1/groups', { method: 'POST',   body: JSON.stringify({ name, competition_id, description, visibility }) });
export const updateGroupDescription = (group_id, description) => apiFetch('v1/groups', { method: 'PATCH', body: JSON.stringify({ group_id, description }) });
export const updateGroupFlags = (group_id, flags) => apiFetch('v1/groups', { method: 'PATCH', body: JSON.stringify({ group_id, ...flags }) });
export const disbandGroup  = (group_id)             => apiFetch('v1/groups', { method: 'DELETE', body: JSON.stringify({ group_id }) });
export const joinGroup     = (group_id)             => apiFetch('v1/group-join',    { method: 'POST', body: JSON.stringify({ group_id }) });
export const leaveGroup    = (group_id)             => apiFetch('v1/group-leave',   { method: 'POST', body: JSON.stringify({ group_id }) });
export const getMembers    = (group_id)             => apiFetch(`v1/group-members?group_id=${group_id}`);
export const memberAction  = (group_id, user_id, action) =>
    apiFetch('v1/group-members', { method: 'POST', body: JSON.stringify({ group_id, user_id, action }) });
export const inviteMember  = (group_id, username)  =>
    apiFetch('v1/group-members', { method: 'POST', body: JSON.stringify({ group_id, username, action: 'invite' }) });
export const acceptGroupInvite = (group_id) =>
    apiFetch('v1/group-members', { method: 'POST', body: JSON.stringify({ group_id, action: 'accept_invite' }) });
export const bulkInvite    = (group_id, source_group_id) =>
    apiFetch('v1/group-invite-bulk', { method: 'POST', body: JSON.stringify({ group_id, source_group_id }) });
