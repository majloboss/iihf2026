import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';
import mailStyles from './AdminMailLog.module.css';

function MailModal({ row, onClose }) {
    return (
        <div className={mailStyles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={mailStyles.modal}>
                <div className={mailStyles.header}>
                    <div>
                        <div className={mailStyles.subject}>{row.subject}</div>
                        <div className={mailStyles.meta}>
                            Komu: <strong>{row.to_email}</strong>
                            {' · '}
                            {new Date(row.sent_at).toLocaleString('sk-SK')}
                            {' · '}
                            {row.status === 'sent'
                                ? <span className={styles.badgeProd}>✓ Odoslaný</span>
                                : <span className={styles.badgeLive}>✗ Chyba</span>}
                        </div>
                    </div>
                    <button className={mailStyles.close} onClick={onClose}>✕</button>
                </div>
                {row.error_msg && (
                    <div className={mailStyles.errBox}>{row.error_msg}</div>
                )}
                <pre className={mailStyles.body}>{row.body || '(obsah nie je uložený)'}</pre>
            </div>
        </div>
    );
}

export default function AdminMailLog() {
    const [rows,    setRows]    = useState([]);
    const [total,   setTotal]   = useState(0);
    const [loading, setLoading] = useState(true);
    const [err,     setErr]     = useState('');
    const [detail,  setDetail]  = useState(null);

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
                                <tr key={r.id} className={mailStyles.row} onClick={() => setDetail(r)}>
                                    <td data-label="Čas" className={styles.small}>{new Date(r.sent_at).toLocaleString('sk-SK')}</td>
                                    <td data-label="Komu" className={styles.mono}>{r.to_email}</td>
                                    <td data-label="Predmet">{r.subject}</td>
                                    <td data-label="Stav">
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
            {detail && <MailModal row={detail} onClose={() => setDetail(null)} />}
        </div>
    );
}
