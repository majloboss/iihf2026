import { useEffect, useState } from 'react';
import { getUsers, updateUser, deleteUser } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import UserModal from './UserModal';
import styles from './Admin.module.css';

export default function Users() {
    const { user: me }          = useAuth();
    const [users, setUsers]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [saving, setSaving]   = useState(null);
    const [editing, setEditing] = useState(null);

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
        } catch (err) { setError(err.message); }
        finally { setSaving(null); }
    };

    const remove = async (u) => {
        if (!confirm(`Zmazať usera „${u.username}"? Táto akcia je nevratná.`)) return;
        setSaving(u.id);
        try {
            await deleteUser(u.id);
            setUsers(prev => prev.filter(x => x.id !== u.id));
        } catch (err) { setError(err.message); }
        finally { setSaving(null); }
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
                        const busy        = saving === u.id;
                        const isMe        = me?.user_id === u.id;
                        const isExclusive = u.username === 'admin';
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
                                    <button
                                        className={styles.btnSmall}
                                        disabled={busy}
                                        onClick={() => setEditing(u)}
                                    >✏️ Upraviť</button>

                                    {/* Zmena roly: nie pre exkluzívneho admina */}
                                    {!isExclusive && (
                                        <button
                                            className={styles.btnSmall}
                                            disabled={busy}
                                            onClick={() => toggle(u, 'role', u.role === 'admin' ? 'user' : 'admin')}
                                        >
                                            {u.role === 'admin' ? '👤 User' : '🔑 Admin'}
                                        </button>
                                    )}

                                    {/* Deaktivovať/zmazať: nie pre seba ani exkluzívneho admina */}
                                    {!isMe && !isExclusive && (<>
                                        <button
                                            className={u.is_active ? styles.btnSmallWarn : styles.btnSmall}
                                            disabled={busy}
                                            onClick={() => toggle(u, 'is_active', !u.is_active)}
                                        >
                                            {u.is_active ? 'Deaktivovať' : 'Aktivovať'}
                                        </button>
                                        <button
                                            className={styles.btnSmallDanger}
                                            disabled={busy}
                                            onClick={() => remove(u)}
                                        >🗑️</button>
                                    </>)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {editing && (
                <UserModal
                    user={editing}
                    onClose={() => setEditing(null)}
                    onSaved={updated => {
                        setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
                        setEditing(null);
                    }}
                />
            )}
        </div>
    );
}
