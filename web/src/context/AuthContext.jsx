import { createContext, useContext, useState } from 'react';
import { getToken, isImpersonating } from '../api/token';

const AuthContext = createContext(null);

function parseToken(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => getToken());
    const user = token ? parseToken(token) : null;
    const impersonating = isImpersonating();

    const signIn = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const signOut = () => {
        if (sessionStorage.getItem('imp_token')) {
            // Impersonačný tab — ukonči impersonáciu
            sessionStorage.removeItem('imp_token');
        } else {
            localStorage.removeItem('token');
        }
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, impersonating, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
