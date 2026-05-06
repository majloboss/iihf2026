import { apiFetch } from './client';

export const getProfile    = ()       => apiFetch('v1/profile');
export const updateProfile = (data)   => apiFetch('v1/profile', { method: 'POST', body: JSON.stringify(data) });
export const changePassword = (data)  => apiFetch('v1/profile-password', { method: 'POST', body: JSON.stringify(data) });
export const deleteAccount  = (data)  => apiFetch('v1/profile-delete', { method: 'POST', body: JSON.stringify(data) });
