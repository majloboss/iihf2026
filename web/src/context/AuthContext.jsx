import { createContext, useContext, useState } from 'react';

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
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const user = token ? parseToken(token) : null;

    const signIn = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const signOut = () => {
        localStorage.removeItem('token');
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
