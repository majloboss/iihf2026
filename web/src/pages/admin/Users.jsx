import { useEffect, useState } from 'react';
import { getUsers } from '../../api/admin';
import styles from './Admin.module.css';

export default function Users() {
    const [users, setUsers]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState('');

    useEffect(() => {
        getUsers()
            .then(setUsers)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p className={styles.error}>{error}</p>;

    return (
        <div>
            <h2>Používatelia</h2>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Meno</th>
                        <th>Email</th>
                        <th>Rola</th>
                        <th>Aktívny</th>
                        <th>Registrovaný</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                            <td>{u.email || '—'}</td>
                            <td><span className={u.role === 'admin' ? styles.badgeAdmin : styles.badge}>{u.role}</span></td>
                            <td>{u.is_active ? '✅' : '⏳'}</td>
                            <td>{new Date(u.created_at).toLocaleDateString('sk-SK')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
