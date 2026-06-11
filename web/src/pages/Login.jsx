import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
    const { signIn } = useAuth();
    const navigate   = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await login(username, password);
            signIn(data.token);
            navigate(data.role === 'admin' ? '/admin' : '/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <img src="/logo.png" alt="Klub priateľov tipovania" className={styles.logo} />
                <p className={styles.appTitle}>Klub priateľov tipovania</p>
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
                    <div className={styles.passWrap}>
                        <input
                            className={styles.input}
                            type={showPass ? 'text' : 'password'}
                            placeholder="Heslo"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className={styles.eyeBtn}
                            onClick={() => setShowPass(v => !v)}
                            tabIndex={-1}
                            aria-label={showPass ? 'Skryť heslo' : 'Zobraziť heslo'}
                        >
                            {showPass ? '🙈' : '👁️'}
                        </button>
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <button className={styles.btn} type="submit" disabled={loading}>
                        {loading ? 'Prihlasovanie…' : 'Prihlásiť sa'}
                    </button>
                </form>
                <Link to="/forgot-password" className={styles.forgotLink}>Zabudnuté heslo?</Link>
            </div>
        </div>
    );
}
