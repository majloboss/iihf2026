import { useState, useEffect } from 'react';
import { getAnnouncements, createAnnouncement, updateAnnouncementFlags } from '../../api/admin';
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

    // Rozpracovane zmeny checkboxov, kym sa neulozia. Bez toho by kazde
    // kliknutie islo na server samostatne a omylom zaskrtnute policko by sa
    // uz nedalo vziat spat.
    const [zmeny, setZmeny] = useState({});   // { [id]: { is_active, show_dashboard } }
    const [ukladam, setUkladam] = useState(null);

    const hodnota = (a, pole) => zmeny[a.id]?.[pole] ?? a[pole];
    const zmenene = (a) => {
        const z = zmeny[a.id];
        return !!z && (z.is_active !== a.is_active || z.show_dashboard !== a.show_dashboard);
    };

    const prepni = (a, pole, val) => setZmeny(prev => ({
        ...prev,
        [a.id]: {
            is_active: a.is_active, show_dashboard: a.show_dashboard,
            ...prev[a.id], [pole]: val,
        },
    }));

    const ulozOznam = async (a) => {
        const z = zmeny[a.id];
        if (!z) return;
        setUkladam(a.id); setErr(''); setOk('');
        try {
            await updateAnnouncementFlags(a.id, z);
            setList(prev => prev.map(x => x.id === a.id ? { ...x, ...z } : x));
            setZmeny(prev => { const { [a.id]: _, ...zvysok } = prev; return zvysok; });
            setOk('Oznam bol uložený.');
        } catch (e) { setErr(e.message); }
        finally { setUkladam(null); }
    };

    const naPrehlade = list.filter(a => a.is_active && a.show_dashboard).length;

    return (
        <div style={{ maxWidth: 700 }}>
            <div className={styles.header}>
                <h2>Oznamy</h2>
            </div>

            {/* Prehlad toho, co je kde vidiet. Samotne prepinanie je nizsie
                pri kazdom ozname — tlacidlo "Vypnut" tu uz netreba. */}
            {naPrehlade > 0 && (
                <div style={{
                    marginTop: 20, background: '#fffbea',
                    border: '1px solid #f0d060', borderLeft: '3px solid #e6b800',
                    borderRadius: 10, padding: '10px 16px',
                    fontSize: '0.85rem', color: '#7a5c00',
                }}>
                    Na Prehľade sa zobrazuje <strong>{naPrehlade}</strong>
                    {naPrehlade === 1 ? ' oznam' : naPrehlade < 5 ? ' oznamy' : ' oznamov'}.
                    Zaškrtávacími políčkami nižšie určíš, čo sa zobrazí na Prehľade
                    a čo v histórii.
                </div>
            )}

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
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={!!hodnota(a, 'show_dashboard')}
                                           onChange={e => prepni(a, 'show_dashboard', e.target.checked)} />
                                    Zobrazené v prehľade
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={!!hodnota(a, 'is_active')}
                                           onChange={e => prepni(a, 'is_active', e.target.checked)} />
                                    Zobrazené v histórii
                                </label>
                                <button className={styles.btnSmall} disabled={!zmenene(a) || ukladam === a.id}
                                        onClick={() => ulozOznam(a)}
                                        style={{ opacity: zmenene(a) ? 1 : 0.4 }}>
                                    {ukladam === a.id ? '…' : 'Uložiť'}
                                </button>
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
