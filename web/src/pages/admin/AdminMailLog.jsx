import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

export default function AdminMailLog() {
    const [rows,    setRows]    = useState([]);
    const [total,   setTotal]   = useState(0);
    const [loading, setLoading] = useState(true);
    const [err,     setErr]     = useState('');

    const load = (offset = 0) => {
        apiFetch(`v1/admin/mail-log?limit=100&offset=${offset}`)
            .then(d => { setTotal(d.total); setRows(r => offset === 0 ? d.rows : [...r, ...d.rows]); })
            .catch(e => setErr(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    return (
        <div>
            <div className={styles.toolbar}>
                <h2>Odoslané maily</h2>
                <span className={styles.count}>{total} celkom</span>
            </div>
            {err && <p className={styles.error}>{err}</p>}
            {loading ? <p>Načítavam…</p> : (
                <>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Čas</th>
                                <th>Komu</th>
                                <th>Predmet</th>
                                <th>Stav</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr><td colSpan={4} style={{textAlign:'center',color:'#aaa',padding:20}}>Žiadne maily</td></tr>
                            )}
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td className={styles.small}>{new Date(r.sent_at).toLocaleString('sk-SK')}</td>
                                    <td className={styles.mono}>{r.to_email}</td>
                                    <td>{r.subject}</td>
                                    <td>
                                        {r.status === 'sent'
                                            ? <span className={styles.badgeProd}>✓ Odoslaný</span>
                                            : <span title={r.error_msg} className={styles.badgeLive} style={{cursor:'help'}}>✗ Chyba</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rows.length < total && (
                        <button className={styles.btnMore} onClick={() => load(rows.length)}>
                            Načítať ďalších ({total - rows.length})
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
