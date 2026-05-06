import { apiFetch } from './client';

export const login = (username, password) =>
    apiFetch('v1/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const useInvite = (token) =>
    apiFetch('v1/admin/invite-use', { method: 'POST', body: JSON.stringify({ token }) });

export const completeRegistration = (username, password) =>
    apiFetch('v1/auth/complete', { method: 'POST', body: JSON.stringify({ username, password }) });
