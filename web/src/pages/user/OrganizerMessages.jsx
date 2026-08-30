import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Messages.module.css';

const dateFmt = iso => new Date(iso).toLocaleDateString('sk-SK',
    { day: '2-digit', month: '2-digit', year: 'numeric' });

// Diakritika sa pri hľadaní ignoruje — "vitaz" nájde aj "víťaz".
const norm = s => String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function OrganizerMessages() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');

    useEffect(() => {
        apiFetch('v1/announcements')
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const found = useMemo(() => {
        const q = norm(query.trim());
        if (!q) return items;
        return items.filter(a => norm(a.body).includes(q));
    }, [items, query]);

    return (
        <>
            <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Hľadať v texte správ…"
                aria-label="Hľadať v správach organizátora"
                style={{ width: '100%', padding: '9px 12px', marginBottom: 12,
                         border: '1px solid #dde3ea', borderRadius: 8, fontSize: '0.9rem' }}
            />

            {loading && <p className={styles.muted}>Načítavam…</p>}

            {!loading && items.length === 0 && (
                <p className={styles.muted}>Zatiaľ tu nie sú žiadne správy.</p>
            )}

            {!loading && items.length > 0 && found.length === 0 && (
                <p className={styles.muted}>Hľadaniu nezodpovedá žiadna správa.</p>
            )}

            {found.map(a => (
                <div key={a.id}
                     style={{ background: a.is_active ? '#fff8e1' : '#fafafa',
                              border: `1px solid ${a.is_active ? '#ffe0a3' : '#eee'}`,
                              borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                                  alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700,
                                       color: a.is_active ? '#a67c00' : '#999' }}>
                            {a.is_active ? '📢 Aktuálny oznam' : 'Archív'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                            {dateFmt(a.created_at)}
                        </span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem',
                                  color: a.is_active ? '#333' : '#666' }}>
                        {a.body}
                    </div>
                </div>
            ))}
        </>
    );
}
