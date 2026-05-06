import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
    const { signIn } = useAuth();
    const navigate   = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
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
                <img src="/logo.png" alt="IIHF 2026" className={styles.logo} />
                <h1>IIHF 2026</h1>
                <p className={styles.subtitle}>Tipovačka MS v hokeji</p>
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
                        type="password"
                        placeholder="Heslo"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button className={styles.btn} type="submit" disabled={loading}>
                        {loading ? 'Prihlasovanie…' : 'Prihlásiť sa'}
                    </button>
                </form>
            </div>
        </div>
    );
}
