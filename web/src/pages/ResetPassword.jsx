import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import styles from './Login.module.css';

export default function ResetPassword() {
    const [searchParams]  = useSearchParams();
    const navigate        = useNavigate();
    const token           = searchParams.get('token') || '';
    const [password,  setPassword]  = useState('');
    const [password2, setPassword2] = useState('');
    const [state,     setState]     = useState('idle'); // idle | loading | done
    const [error,     setError]     = useState('');

    if (!token) return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Reset hesla</p>
                <p className={styles.error}>Neplatný alebo chýbajúci reset link.</p>
                <Link to="/login" className={styles.forgotLink}>← Späť na prihlásenie</Link>
            </div>
        </div>
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== password2) { setError('Heslá sa nezhodujú'); return; }
        setState('loading');
        try {
            await apiFetch('v1/auth/password-reset', {
                method: 'POST',
                body: JSON.stringify({ token, password }),
            });
            setState('done');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.message);
            setState('idle');
        }
    };

    if (state === 'done') return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Reset hesla</p>
                <p style={{color:'#28a745', marginBottom:16}}>✓ Heslo bolo úspešne zmenené.</p>
                <p style={{fontSize:'0.88rem', color:'#666'}}>Presmerúvam na prihlásenie…</p>
            </div>
        </div>
    );

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Nové heslo</p>
                <form onSubmit={handleSubmit}>
                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Nové heslo (min. 6 znakov)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Zopakuj heslo"
                        value={password2}
                        onChange={e => setPassword2(e.target.value)}
                        required
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button className={styles.btn} type="submit" disabled={state === 'loading'}>
                        {state === 'loading' ? 'Ukladám…' : 'Nastaviť heslo'}
                    </button>
                </form>
                <Link to="/login" className={styles.forgotLink}>← Späť na prihlásenie</Link>
            </div>
        </div>
    );
}
