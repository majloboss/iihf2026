import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement } from '../../api/admin';
import styles from './Admin.module.css';

function fmtDate(iso) {
    return new Date(iso).toLocaleString('sk-SK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AdminAnnouncements() {
    const [list,    setList]    = useState([]);
    const [loading, setLoading] = useState(true);
    const [text,    setText]    = useState('');
    const [saving,  setSaving]  = useState(false);
    const [err,     setErr]     = useState('');
    const [ok,      setOk]      = useState('');

    useEffect(() => {
        getAnnouncements()
            .then(setList)
            .catch(e => setErr(e.message))
            .finally(() => setLoading(false));
    }, []);

    const submit = async () => {
        if (!text.trim()) { setErr('Oznam nesmie byť prázdny'); return; }
        setSaving(true); setErr(''); setOk('');
        try {
            const r = await createAnnouncement(text.trim());
            setList(prev => [{ ...r, body: text.trim() }, ...prev]);
            setText('');
            setOk('Oznam bol pridaný.');
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div style={{ maxWidth: 700 }}>
            <div className={styles.header}>
                <h2>Oznamy</h2>
            </div>

            <div style={{ marginTop: 20, background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: 20 }}>
                <h4 style={{ margin: '0 0 10px', color: '#1a3a6b' }}>Nový oznam</h4>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={4}
                    placeholder="Napíš oznam pre hráčov…"
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '10px', border: '1px solid #ddd',
                        borderRadius: 8, fontSize: '0.92rem',
                        resize: 'vertical', fontFamily: 'inherit',
                    }}
                />
                <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className={styles.btn} onClick={submit} disabled={saving || !text.trim()}>
                        {saving ? 'Ukladám…' : 'Pridať oznam'}
                    </button>
                    {err && <span className={styles.error} style={{ marginTop: 0 }}>{err}</span>}
                    {ok  && <span className={styles.success} style={{ marginTop: 0 }}>{ok}</span>}
                </div>
            </div>

            <div style={{ marginTop: 24 }}>
                <h4 style={{ margin: '0 0 12px', color: '#1a3a6b' }}>História oznamov</h4>
                {loading && <p style={{ color: '#aaa' }}>Načítavam…</p>}
                {!loading && list.length === 0 && <p style={{ color: '#aaa' }}>Žiadne oznamy</p>}
                {list.map((a, i) => (
                    <div key={a.id} style={{
                        background: i === 0 ? '#f0f5ff' : '#fff',
                        border: `1px solid ${i === 0 ? '#b6d0f5' : '#e9ecef'}`,
                        borderRadius: 8, padding: '12px 16px', marginBottom: 10,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: i === 0 ? '#1a3a6b' : '#aaa',
                            }}>
                                {i === 0 ? '★ Aktuálny oznam' : `#${a.id}`}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                {a.created_by_username && `${a.created_by_username} · `}{fmtDate(a.created_at)}
                            </span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {a.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
