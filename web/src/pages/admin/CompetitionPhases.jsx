import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
import styles from './Admin.module.css';

// Správa číselníka fáz a kôl súťaže.
//
// Číselník drží pre každú súťaž kód a názov fázy, kód a popis konkrétneho
// zápasu pre štatistiky, farbu a poradie. Nahrádza odvodzovanie skratiek
// z názvu regulárnymi výrazmi, ktoré sa písalo zvlášť pre každú súťaž.

// Ukážka farby priamo v tabuľke — admin vidí, ako bude tlačidlo vyzerať.
const FARBY = {
    GROUP:   { bg: '#dbeafe', fg: '#1e40af', popis: 'skupiny, ligová fáza' },
    PLAYOFF: { bg: '#dcfce7', fg: '#15803d', popis: 'osemfinále až semifinále' },
    BRONZE:  { bg: '#fde8c8', fg: '#92400e', popis: 'baráž, o 3. miesto' },
    GOLD:    { bg: '#fef9c3', fg: '#a16207', popis: 'finále' },
    NEUTRAL: { bg: '#f1f3f5', fg: '#495057', popis: 'ostatné' },
};

const PRAZDNY = {
    id: null, phase_code: '', phase_name: '', match_stat_code: '',
    match_stat_desc: '', color_code: 'GROUP', sort_order: 0, is_active: true,
};

export default function CompetitionPhases() {
    const { competitions, activeCompetition } = useCompetition();
    const [zvolena, setZvolena] = useState(null);
    const cid = zvolena ?? activeCompetition?.id ?? null;

    const [fazy, setFazy]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [chyba, setChyba]     = useState('');
    const [sprava, setSprava]   = useState('');
    const [uprava, setUprava]   = useState(null);   // rozpracovaný riadok
    const [uklada, setUklada]   = useState(false);

    const nacitaj = (comp) => {
        if (!comp) return;
        apiFetch(`v1/admin/competition-phases?competition_id=${comp}`)
            .then(d => { setFazy(d.phases); setChyba(''); })
            .catch(e => setChyba(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!cid) return;
        let zive = true;
        apiFetch(`v1/admin/competition-phases?competition_id=${cid}`)
            .then(d => { if (zive) { setFazy(d.phases); setChyba(''); } })
            .catch(e => { if (zive) setChyba(e.message); })
            .finally(() => { if (zive) setLoading(false); });
        return () => { zive = false; };
    }, [cid]);

    const uloz = async () => {
        setUklada(true); setChyba(''); setSprava('');
        try {
            await apiFetch('v1/admin/competition-phases', {
                method: 'POST',
                body: JSON.stringify({ ...uprava, competition_id: cid }),
            });
            setSprava(uprava.id ? 'Uložené.' : 'Pridané.');
            setUprava(null);
            nacitaj(cid);
        } catch (e) { setChyba(e.message); }
        finally { setUklada(false); }
    };

    const zmaz = async (f) => {
        if (!window.confirm(`Zmazať „${f.match_stat_desc}"?`)) return;
        setChyba(''); setSprava('');
        try {
            await apiFetch('v1/admin/competition-phases', {
                method: 'DELETE', body: JSON.stringify({ id: f.id }),
            });
            setSprava('Zmazané.');
            nacitaj(cid);
        } catch (e) { setChyba(e.message); }
    };

    const pole = (kluc, sirka) => (
        <input value={uprava?.[kluc] ?? ''} disabled={uklada}
               onChange={e => setUprava(u => ({ ...u, [kluc]: e.target.value }))}
               style={{ width: sirka, padding: '4px 6px', fontSize: '0.82rem' }} />
    );

    if (loading) return <p style={{ color: '#888' }}>Načítavam…</p>;

    return (
        <div>
            <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 12px', maxWidth: 780 }}>
                Kód a názov fázy sa opakuje pre všetky kolá tej istej fázy
                (Ligová fáza → LF1…LF8). Kód zápasu musí byť v rámci súťaže
                jedinečný — používa sa vo filtroch a štatistikách. Poradie určuje,
                ako idú tlačidlá za sebou.
            </p>

            <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={cid ?? ''} onChange={e => { setZvolena(Number(e.target.value)); setUprava(null); }}
                        style={{ padding: '5px 8px', fontSize: '0.85rem' }}>
                    {(competitions ?? []).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                <button className={styles.btnSmall} disabled={!!uprava}
                        onClick={() => setUprava({ ...PRAZDNY,
                            sort_order: (fazy.at(-1)?.sort_order ?? 0) + 10 })}>
                    + Pridať fázu
                </button>
            </div>

            {chyba  && <p className={styles.error}>✗ {chyba}</p>}
            {sprava && <p className={styles.success}>{sprava}</p>}

            {uprava && (
                <div style={{ background: '#f8f9fb', border: '1px solid #e9ecef',
                              borderRadius: 8, padding: 12, marginBottom: 14 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Kód fázy<br />{pole('phase_code', 70)}
                        </label>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Názov fázy<br />{pole('phase_name', 160)}
                        </label>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Kód zápasu<br />{pole('match_stat_code', 80)}
                        </label>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Popis zápasu<br />{pole('match_stat_desc', 220)}
                        </label>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Farba<br />
                            <select value={uprava.color_code} disabled={uklada}
                                    onChange={e => setUprava(u => ({ ...u, color_code: e.target.value }))}
                                    style={{ padding: '4px 6px', fontSize: '0.82rem',
                                             background: FARBY[uprava.color_code]?.bg,
                                             color: FARBY[uprava.color_code]?.fg }}>
                                {Object.entries(FARBY).map(([k, v]) => (
                                    <option key={k} value={k}>{k} — {v.popis}</option>
                                ))}
                            </select>
                        </label>
                        <label style={{ fontSize: '0.75rem', color: '#666' }}>
                            Poradie<br />
                            <input type="number" value={uprava.sort_order} disabled={uklada}
                                   onChange={e => setUprava(u => ({ ...u, sort_order: Number(e.target.value) }))}
                                   style={{ width: 70, padding: '4px 6px', fontSize: '0.82rem' }} />
                        </label>
                        <label style={{ fontSize: '0.8rem', color: '#666', display: 'flex',
                                        alignItems: 'center', gap: 4 }}>
                            <input type="checkbox" checked={uprava.is_active} disabled={uklada}
                                   onChange={e => setUprava(u => ({ ...u, is_active: e.target.checked }))} />
                            aktívna
                        </label>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <button className={styles.btnSmall} onClick={uloz} disabled={uklada}>
                            {uklada ? 'Ukladám…' : 'Uložiť'}
                        </button>
                        <button className={styles.btnSmall} onClick={() => setUprava(null)} disabled={uklada}>
                            Zrušiť
                        </button>
                    </div>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Kód</th><th>Fáza</th><th>Kód zápasu</th><th>Popis</th>
                            <th>Farba</th><th>Poradie</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {fazy.map(f => (
                            <tr key={f.id} style={{ opacity: f.is_active ? 1 : 0.5 }}>
                                <td>{f.phase_code}</td>
                                <td>{f.phase_name}</td>
                                <td>
                                    <span style={{ display: 'inline-block', padding: '2px 8px',
                                                   borderRadius: 5, fontSize: '0.78rem', fontWeight: 600,
                                                   background: FARBY[f.color_code]?.bg,
                                                   color: FARBY[f.color_code]?.fg }}>
                                        {f.match_stat_code}
                                    </span>
                                </td>
                                <td>{f.match_stat_desc}</td>
                                <td style={{ fontSize: '0.75rem', color: '#888' }}>{f.color_code}</td>
                                <td style={{ textAlign: 'right', color: '#888' }}>{f.sort_order}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                    <button className={styles.btnSmall} disabled={!!uprava}
                                            onClick={() => setUprava(f)}>Upraviť</button>
                                    {' '}
                                    <button className={styles.btnSmall} disabled={!!uprava}
                                            onClick={() => zmaz(f)}>Zmazať</button>
                                </td>
                            </tr>
                        ))}
                        {fazy.length === 0 && (
                            <tr><td colSpan={7} style={{ color: '#aaa', padding: 12 }}>
                                Táto súťaž zatiaľ nemá fázy.
                            </td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
