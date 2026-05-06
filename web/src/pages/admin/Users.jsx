import { useEffect, useState } from 'react';
import { getUsers, updateUser } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import styles from './Admin.module.css';

export default function Users() {
    const { user: me }           = useAuth();
    const [users, setUsers]      = useState([]);
    const [loading, setLoading]  = useState(true);
    const [error, setError]      = useState('');
    const [saving, setSaving]    = useState(null); // id práve ukladaného usera

    const load = () => getUsers()
        .then(setUsers)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const toggle = async (u, field, value) => {
        setSaving(u.id);
        try {
            await updateUser(u.id, { [field]: value });
            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, [field]: value } : x));
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(null);
        }
    };

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
                        <th>Akcie</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => {
                        const isSaving = saving === u.id;
                        const isMe     = me?.user_id === u.id;
                        return (
                            <tr key={u.id}>
                                <td>{u.id}</td>
                                <td>{u.username}</td>
                                <td>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}</td>
                                <td>{u.email || '—'}</td>
                                <td>
                                    <span className={u.role === 'admin' ? styles.badgeAdmin : styles.badge}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>{u.is_active ? '✅' : '⏳'}</td>
                                <td>{new Date(u.created_at).toLocaleDateString('sk-SK')}</td>
                                <td className={styles.actions}>
                                    {!isMe && (
                                        <>
                                            <button
                                                className={styles.btnSmall}
                                                disabled={isSaving}
                                                onClick={() => toggle(u, 'role', u.role === 'admin' ? 'user' : 'admin')}
                                                title={u.role === 'admin' ? 'Degradovať na usera' : 'Povýšiť na admina'}
                                            >
                                                {u.role === 'admin' ? '👤 User' : '🔑 Admin'}
                                            </button>
                                            <button
                                                className={u.is_active ? styles.btnSmallDanger : styles.btnSmall}
                                                disabled={isSaving}
                                                onClick={() => toggle(u, 'is_active', !u.is_active)}
                                            >
                                                {u.is_active ? 'Deaktivovať' : 'Aktivovať'}
                                            </button>
                                        </>
                                    )}
                                    {isMe && <span className={styles.unused}>—</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
