const BASE = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${BASE}/${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {})
        }
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? 'Chyba servera');
    return json.data;
}
