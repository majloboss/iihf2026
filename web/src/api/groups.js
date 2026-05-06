import { apiFetch } from './client';

export const getGroups     = ()                     => apiFetch('v1/groups');
export const createGroup   = (name)                 => apiFetch('v1/groups', { method: 'POST',   body: JSON.stringify({ name }) });
export const disbandGroup  = (group_id)             => apiFetch('v1/groups', { method: 'DELETE', body: JSON.stringify({ group_id }) });
export const joinGroup     = (group_id)             => apiFetch('v1/group-join',    { method: 'POST', body: JSON.stringify({ group_id }) });
export const leaveGroup    = (group_id)             => apiFetch('v1/group-leave',   { method: 'POST', body: JSON.stringify({ group_id }) });
export const getMembers    = (group_id)             => apiFetch(`v1/group-members?group_id=${group_id}`);
export const memberAction  = (group_id, user_id, action) =>
    apiFetch('v1/group-members', { method: 'POST', body: JSON.stringify({ group_id, user_id, action }) });
