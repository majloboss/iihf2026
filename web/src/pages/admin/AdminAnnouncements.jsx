import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, deactivateAnnouncement,
         setAnnouncementDashboard } from '../../api/admin';
import styles from './Admin.module.css';

function fmtDate(iso) {
    return new Date(iso).toLocaleString('sk-SK', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function AdminAnnouncements() {
    const [list,       setList]       = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [text,       setText]       = useState('');
    const [saving,     setSaving]     = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    const [err,        setErr]        = useState('');
    const [ok,         setOk]         = useState('');

    // PDO pgsql vracia boolean ako 't'/'f' — reťazec 'f' je v JS pravdivý.
    const naBool = v => v === true || v === 't' || v === '1' || v === 1;
    const normalize = a => ({ ...a,
        is_active: naBool(a.is_active),
        show_dashboard: naBool(a.show_dashboard) });

    useEffect(() => {
        getAnnouncements()
            .then(data => setList(data.map(normalize)))
            .catch(e => setErr(e.message))
            .finally(() => setLoading(false));
    }, []);

    const submit = async () => {
        if (!text.trim()) { setErr('Oznam nesmie byť prázdny'); return; }
        setSaving(true); setErr(''); setOk('');
        try {
            const r = await createAnnouncement(text.trim());
            setList(prev => [
                { ...r, body: text.trim(), is_active: true, show_dashboard: true },
                ...prev,
            ]);
            setText('');
            setOk('Oznam bol pridaný.');
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    const deactivate = async (id) => {
        setDeactivating(true); setErr(''); setOk('');
        try {
            await deactivateAnnouncement(id);
            setList(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a));
            setOk('Oznam bol vypnutý.');
        } catch (e) { setErr(e.message); }
        finally { setDeactivating(false); }
    };

    // Prepnutie zobrazenia na Prehlade. Oznam zostava v historii aj ked sa
    // tam neukazuje.
    const prepniZobrazenie = async (id, hodnota) => {
        setErr(''); setOk('');
        // Prepne sa hned, aby checkbox nereagoval s odstupom; pri chybe sa vrati.
        setList(prev => prev.map(a => a.id === id ? { ...a, show_dashboard: hodnota } : a));
        try {
            await setAnnouncementDashboard(id, hodnota);
        } catch (e) {
            setList(prev => prev.map(a => a.id === id ? { ...a, show_dashboard: !hodnota } : a));
            setErr(e.message);
        }
    };

    const activeAnnouncement = list.find(a => a.is_active);
    const naPrehlade = list.filter(a => a.is_active && a.show_dashboard).length;

    return (
        <div style={{ maxWidth: 700 }}>
            <div className={styles.header}>
                <h2>Oznamy</h2>
            </div>

            {activeAnnouncement && (
                <div style={{
                    marginTop: 20, background: '#fffbea',
                    border: '1px solid #f0d060', borderLeft: '3px solid #e6b800',
                    borderRadius: 10, padding: 16,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9a7200', marginBottom: 6 }}>
                                ★ Aktuálny oznam
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#222', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                {activeAnnouncement.body}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: 6 }}>
                                {activeAnnouncement.created_by_username && `${activeAnnouncement.created_by_username} · `}{fmtDate(activeAnnouncement.created_at)}
                            </div>
                        </div>
                        <button
                            className={styles.btnSmallWarn}
                            onClick={() => deactivate(activeAnnouncement.id)}
                            disabled={deactivating}
                            style={{ flexShrink: 0 }}
                        >
                            {deactivating ? '…' : 'Vypnúť'}
                        </button>
                    </div>
                </div>
            )}

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
                {list.map(a => (
                    <div key={a.id} style={{
                        background: a.is_active ? '#f0f5ff' : '#fafafa',
                        border: `1px solid ${a.is_active ? '#b6d0f5' : '#e9ecef'}`,
                        borderRadius: 8, padding: '10px 14px', marginBottom: 8,
                        opacity: a.is_active ? 1 : 0.6,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{
                                fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.05em', color: a.is_active ? '#1a3a6b' : '#aaa',
                            }}>
                                {a.is_active ? '● Aktívny' : '○ Vypnutý'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {a.is_active && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 5,
                                                    fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={!!a.show_dashboard}
                                               onChange={e => prepniZobrazenie(a.id, e.target.checked)} />
                                        Zobrazené v prehľade
                                    </label>
                                )}
                                <span style={{ fontSize: '0.75rem', color: '#aaa' }}>
                                    {a.created_by_username && `${a.created_by_username} · `}{fmtDate(a.created_at)}
                                </span>
                            </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                            {a.body}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
