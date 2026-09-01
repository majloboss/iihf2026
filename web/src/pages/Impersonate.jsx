import { useEffect } from 'react';
import { markImpersonationTab } from '../api/token';

// /impersonate#<token> — uloží token do sessionStorage (per-tab) a presmeruje.
// Beží v novom okne; adminov localStorage token ostáva nedotknutý.
export default function Impersonate() {
    useEffect(() => {
        const token = window.location.hash.slice(1);
        if (token) {
            sessionStorage.setItem('imp_token', token);
            // Tab si impersonaciu pamata aj po odhlaseni, aby sa pripadne
            // dalsie prihlasenie neulozilo adminovi do localStorage.
            markImpersonationTab();
            window.location.replace('/');
        } else {
            window.location.replace('/login');
        }
    }, []);
    return <p style={{ padding: 40, textAlign: 'center', color: '#888' }}>Prihlasujem…</p>;
}
