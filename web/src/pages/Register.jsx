import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInvite, completeRegistration } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Register() {
    const [searchParams] = useSearchParams();
    const { signIn }     = useAuth();
    const navigate       = useNavigate();
    const [step, setStep]       = useState('loading'); // loading | complete | error
    const [tempToken, setTemp]  = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) { setStep('error'); return; }
        useInvite(token)
            .then(data => { setTemp(data.temp_token); setStep('complete'); })
            .catch(err => { setError(err.message); setStep('error'); });
    }, []);

    const handleComplete = async (e) => {
        e.preventDefault();
        if (password !== password2) { setError('Heslá sa nezhodujú'); return; }
        setError(''); setLoading(true);
        try {
            localStorage.setItem('token', tempToken);
            const data = await completeRegistration(username, password);
            signIn(data.token);
            sessionStorage.setItem('just_registered', '1');
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="IIHF 2026" className={styles.logo} />
                <h1>IIHF 2026</h1>

                {step === 'loading' && <p>Overujem pozývací link…</p>}

                {step === 'error' && (
                    <p className={styles.error}>{error || 'Neplatný alebo použitý link'}</p>
                )}

                {step === 'complete' && (
                    <>
                        <p className={styles.subtitle}>Nastav si username a heslo</p>
                        <form onSubmit={handleComplete}>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Username (min. 3 znaky)"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required autoFocus
                            />
                            <input
                                className={styles.input}
                                type="password"
                                placeholder="Heslo (min. 6 znakov)"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
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
                            <button className={styles.btn} type="submit" disabled={loading}>
                                {loading ? 'Ukladám…' : 'Dokončiť registráciu'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
