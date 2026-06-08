import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import styles from './Login.module.css';

export default function ForgotPassword() {
    const [username, setUsername] = useState('');
    const [email,    setEmail]    = useState('');
    const [state,    setState]    = useState('idle'); // idle | loading | sent | no_email
    const [error,    setError]    = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setState('loading');
        try {
            const res = await apiFetch('v1/auth/password-reset-request', {
                method: 'POST',
                body: JSON.stringify({ username: username.trim(), email: email.trim() }),
            });
            setState(res.sent ? 'sent' : 'no_email');
        } catch (err) {
            setError(err.message);
            setState('idle');
        }
    };

    if (state === 'sent') return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Resetovanie hesla</p>
                <p style={{color:'#28a745', marginBottom:16}}>✓ Email s odkazom na reset hesla bol odoslaný.</p>
                <p style={{fontSize:'0.88rem', color:'#666', marginBottom:20}}>Skontroluj si schránku (aj spam). Link platí 1 hodinu.</p>
                <Link to="/login" className={styles.forgotLink}>← Späť na prihlásenie</Link>
            </div>
        </div>
    );

    if (state === 'no_email') return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Resetovanie hesla</p>
                <p style={{color:'#c0392b', marginBottom:16}}>Username alebo email nesedí, alebo tento účet nemá vyplnený email.</p>
                <p style={{fontSize:'0.88rem', color:'#666', marginBottom:20}}>Kontaktuj administrátora na <strong>betclub@fellow.sk</strong></p>
                <Link to="/login" className={styles.forgotLink}>← Späť na prihlásenie</Link>
            </div>
        </div>
    );

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="BetClub" className={styles.logo} />
                <p className={styles.appTitle}>Zabudnuté heslo</p>
                <form onSubmit={handleSubmit}>
                    <input
                        className={styles.input}
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        autoFocus
                    />
                    <input
                        className={styles.input}
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button className={styles.btn} type="submit" disabled={state === 'loading'}>
                        {state === 'loading' ? 'Odosielam…' : 'Odoslať reset link'}
                    </button>
                </form>
                <Link to="/login" className={styles.forgotLink}>← Späť na prihlásenie</Link>
            </div>
        </div>
    );
}
