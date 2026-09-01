import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Messages.module.css';

const dateFmt = iso => new Date(iso).toLocaleDateString('sk-SK',
    { day: '2-digit', month: '2-digit', year: 'numeric' });

// Diakritika sa pri hľadaní ignoruje — "vitaz" nájde aj "víťaz".
const bezDiakritiky = s => String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Normalizácia mení dĺžku textu ("ť" sa rozloží na dva znaky), takže index
// v porovnávanom reťazci neukazuje na to isté miesto v pôvodnom. Prevádza sa
// preto znak po znaku a ku každému sa pamätá pôvodná pozícia.
function normalizujSMapou(text) {
    let norm = '';
    const mapa = [];
    for (let i = 0; i < text.length; i++) {
        const prevedeny = bezDiakritiky(text[i]);
        for (let j = 0; j < prevedeny.length; j++) mapa.push(i);
        norm += prevedeny;
    }
    mapa.push(text.length);   // zarážka pre koniec posledného výskytu
    return { norm, mapa };
}

// Rozdelí text na úseky a označí tie, ktoré zodpovedajú hľadanému výrazu.
function rozdelPodlaHladania(text, dopyt) {
    const q = bezDiakritiky(dopyt.trim());
    if (!q) return [{ text, zvyraznene: false }];

    const { norm, mapa } = normalizujSMapou(text);
    const useky = [];
    let od = 0;
    let i = norm.indexOf(q);

    while (i !== -1) {
        const zaciatok = mapa[i];
        const koniec = mapa[i + q.length];
        if (zaciatok > od) useky.push({ text: text.slice(od, zaciatok), zvyraznene: false });
        useky.push({ text: text.slice(zaciatok, koniec), zvyraznene: true });
        od = koniec;
        i = norm.indexOf(q, i + q.length);
    }
    if (od < text.length) useky.push({ text: text.slice(od), zvyraznene: false });
    return useky;
}

function Zvyraznene({ text, dopyt }) {
    return rozdelPodlaHladania(text, dopyt).map((u, i) => (
        u.zvyraznene
            ? <mark key={i} style={{ background: '#ffe066', color: 'inherit', padding: '0 1px', borderRadius: 2 }}>{u.text}</mark>
            : <span key={i}>{u.text}</span>
    ));
}

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
        const q = bezDiakritiky(query.trim());
        if (!q) return items;
        return items.filter(a => bezDiakritiky(a.body).includes(q));
    }, [items, query]);

    return (
        <>
            <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Hľadať v texte správ…"
                aria-label="Hľadať v správach organizátora"
                style={{ width: '100%', padding: '9px 12px', marginBottom: 8,
                         border: '1px solid #dde3ea', borderRadius: 8, fontSize: '0.9rem' }}
            />

            {query.trim() && !loading && (
                <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: '#888' }}>
                    {found.length === 0
                        ? 'Žiadna zhoda'
                        : `Nájdené: ${found.length} z ${items.length}`}
                </p>
            )}

            {loading && <p className={styles.muted}>Načítavam…</p>}

            {!loading && items.length === 0 && (
                <p className={styles.muted}>Zatiaľ tu nie sú žiadne správy.</p>
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
                        <Zvyraznene text={a.body} dopyt={query} />
                    </div>
                </div>
            ))}
        </>
    );
}
