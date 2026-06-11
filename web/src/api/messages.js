import { apiFetch } from './client';

// User
export const getMessages       = ()      => apiFetch('v1/messages');
export const getUnreadCount    = ()      => apiFetch('v1/messages?unread=1');
export const sendMessage       = (body)  => apiFetch('v1/messages', { method: 'POST', body: JSON.stringify({ body }) });
export const deleteMessage     = (id)    => apiFetch('v1/messages', { method: 'DELETE', body: JSON.stringify({ id }) });

// Admin
export const getAdminThreads   = ()           => apiFetch('v1/admin/messages');
export const getAdminThread    = (user_id)    => apiFetch(`v1/admin/messages?user_id=${user_id}`);
export const getAdminUnread    = ()           => apiFetch('v1/admin/messages?unread=1');
export const adminReply        = (user_id, body) => apiFetch('v1/admin/messages', { method: 'POST', body: JSON.stringify({ user_id, body }) });
export const adminDeleteMessage = (id)        => apiFetch('v1/admin/messages', { method: 'DELETE', body: JSON.stringify({ id }) });
