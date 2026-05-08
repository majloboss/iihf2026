import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

const UA_SHORT = ua => {
    if (!ua) return '—';
    if (/Mobile|Android|iPhone/i.test(ua)) return '📱 ' + (ua.match(/\(([^)]+)\)/)?.[1]?.split(';')[0] ?? 'Mobile');
    if (/Chrome/i.test(ua))  return '🖥 Chrome';
    if (/Firefox/i.test(ua)) return '🖥 Firefox';
    if (/Safari/i.test(ua))  return '🖥 Safari';
    return '🖥 ' + ua.slice(0, 30);
};

export default function AdminLoginLogs() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [limit, setLimit]     = useState(100);

    useEffect(() => {
        setLoading(true);
        apiFetch(`v1/admin/login-logs?limit=${limit}`)
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [limit]);

    const fmt = iso => new Date(iso).toLocaleString('sk-SK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return (
        <div className={styles.wrap}>
            <div className={styles.toolbar}>
                <h2>Prihlásenia</h2>
                {data && <span className={styles.count}>Celkom: {data.total}</span>}
            </div>

            {loading && <p>Načítavam…</p>}
            {error   && <p className={styles.err}>Chyba: {error}</p>}

            {data && (
                <>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Čas</th>
                                <th>Používateľ</th>
                                <th>Rola</th>
                                <th>IP</th>
                                <th>Zariadenie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(r => (
                                <tr key={r.id}>
                                    <td className={styles.mono}>{fmt(r.logged_at)}</td>
                                    <td><strong>{r.username}</strong></td>
                                    <td>{r.role === 'admin' ? '🔑 admin' : '👤 user'}</td>
                                    <td className={styles.mono}>{r.ip_address ?? '—'}</td>
                                    <td className={styles.small}>{UA_SHORT(r.user_agent)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {data.total > limit && (
                        <button className={styles.btnMore} onClick={() => setLimit(l => l + 100)}>
                            Načítať ďalších 100 (zobrazených {data.rows.length} z {data.total})
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
