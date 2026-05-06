import { apiFetch } from './client';

export const getUsers = ()    => apiFetch('v1/users');
export const getUser  = (id)  => apiFetch(`v1/users?id=${id}`);
