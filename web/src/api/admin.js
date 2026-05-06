import { apiFetch } from './client';

export const getUsers   = () => apiFetch('v1/admin/users');
export const getInvites = () => apiFetch('v1/admin/invites');
export const createInvite = () => apiFetch('v1/admin/invites', { method: 'POST' });
