import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

const POLL_MS = 60000;   // ako často sa obnoví stav sledovaného zápasu

const val = v => (v === null || v === undefined || v === '' ? '—' : String(v));
const score = (a, b) => (a === null || b === null || a === undefined || b === undefined ? '—' : `${a} : ${b}`);

// Jeden sledovaný zápas. Sám sa obnovuje, kým beží a nie je zastavený.
function Watch({ item, onUpdate, onStop, onRemove, model }) {
    const timer = useRef(null);
    // Bez tejto poistky by zmena stavu z load() spustila effect znova a zacyklila sa.
    const started = useRef(false);
    const busy = useRef(false);

    const load = async () => {
        if (busy.current) return;
        busy.current = true;
        onUpdate(item.id, { loading: true, error: '' });
        try {
            const r = await apiFetch('v1/admin/livescore-test', {
                method: 'POST', body: JSON.stringify({ url: item.url, model: model || undefined }),
            });
            onUpdate(item.id, { loading: false, result: r, checked: new Date() });
        } catch (e) {
            onUpdate(item.id, { loading: false, error: e.message });
        } finally {
            busy.current = false;
        }
    };

    // Prvé načítanie práve raz.
    useEffect(() => {
        if (started.current) return;
        started.current = true;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Obnovovanie beží, kým používateľ nedá STOP a zápas neskončil.
    useEffect(() => {
        clearInterval(timer.current);
        const finished = item.result?.data?.finished;
        if (!item.stopped && !finished) {
            timer.current = setInterval(load, POLL_MS);
        }
        return () => clearInterval(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.stopped, item.result?.data?.finished]);

    const d = item.result?.data;
    const usage = item.result?.usage;

    return (
        <div className={styles.card} style={{ padding: 14, marginTop: 10, borderLeft: '4px solid #0d6efd' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                    <a href={item.url} target="_blank" rel="noreferrer"
                       style={{ fontSize: '0.78rem', color: '#0d6efd', wordBreak: 'break-all' }}>
                        {item.url}
                    </a>
                    <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>
                        {item.loading ? 'Zisťujem…'
                            : item.stopped ? 'Sledovanie zastavené'
                            : d?.finished ? 'Zápas skončil, sledovanie ukončené'
                            : `Obnovuje sa každú minútu${item.checked ? ' · naposledy ' + item.checked.toLocaleTimeString('sk-SK') : ''}`}
                    </div>
                </div>
                <div className={styles.actions}>
                    <button className={styles.btnSmall} onClick={load} disabled={item.loading}>
                        Zistiť teraz
                    </button>
                    {!item.stopped && !d?.finished && (
                        <button className={styles.btnSmall} onClick={() => onStop(item.id)}>STOP</button>
                    )}
                    <button className={styles.btnSmallDanger} onClick={() => onRemove(item.id)}>Zmazať</button>
                </div>
            </div>

            {item.error && <p className={styles.error} style={{ marginTop: 8 }}>✗ {item.error}</p>}

            {d && (
                <>
                    <div style={{ marginTop: 10, display: 'grid',
                                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px 14px' }}>
                        {[
                            ['Zápas', d.home_team || d.away_team ? `${val(d.home_team)} — ${val(d.away_team)}` : null],
                            ['Súťaž', d.competition],
                            ['Stav', d.status],
                            ['Začal', d.started === null ? null : d.started ? 'áno' : 'nie'],
                            ['Skončil', d.finished === null ? null : d.finished ? 'áno' : 'nie'],
                            ['Minúta', d.minute],
                            ['Skóre', score(d.home_score, d.away_score)],
                            ['Polčas', score(d.home_score_halftime, d.away_score_halftime)],
                            ['Žlté karty', score(d.home_yellow_cards, d.away_yellow_cards)],
                            ['Červené karty', score(d.home_red_cards, d.away_red_cards)],
                            ['Začiatok', d.start_time],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <div style={{ fontSize: '0.68rem', color: '#999', textTransform: 'uppercase' }}>{label}</div>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{val(value)}</div>
                            </div>
                        ))}
                    </div>
                    {d.notes && (
                        <div style={{ marginTop: 8, fontSize: '0.8rem', color: '#555' }}>
                            <strong>Poznámka modelu:</strong> {d.notes}
                        </div>
                    )}
                    <div style={{ marginTop: 8, fontSize: '0.7rem', color: '#aaa' }}>
                        {item.result.model}
                        {usage && ` · ${usage.total_tokens} tokenov`}
                        {item.result.page_chars && ` · stránka ${item.result.page_chars} znakov`}
                    </div>
                </>
            )}

            {item.result?.raw && (
                <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: '#c0392b' }}>
                        Model nevrátil platný JSON — zobraziť odpoveď
                    </summary>
                    <pre style={{ background: '#f8f9fa', padding: 10, borderRadius: 6, fontSize: '0.72rem',
                                  overflowX: 'auto', marginTop: 6 }}>{item.result.raw}</pre>
                </details>
            )}
        </div>
    );
}

// Porovnanie bezplatných modelov na tej istej adrese — ukáže, ktorý je použiteľný.
function ModelCompare({ url, onClose }) {
    const [rows, setRows] = useState([]);
    const [running, setRunning] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let stop = false;
        (async () => {
            try {
                const { models } = await apiFetch('v1/admin/livescore-models');
                if (stop) return;
                setRows(models.map(m => ({ ...m, state: 'čaká' })));
                // Postupne, nie naraz — bezplatné modely majú limit požiadaviek za minútu.
                for (const m of models) {
                    if (stop) return;
                    setRows(cur => cur.map(r => r.id === m.id ? { ...r, state: 'testujem…' } : r));
                    try {
                        const r = await apiFetch('v1/admin/livescore-models', {
                            method: 'POST', body: JSON.stringify({ url, model: m.id }),
                        });
                        if (stop) return;
                        setRows(cur => cur.map(x => x.id === m.id ? { ...x, ...r, state: 'hotovo' } : x));
                    } catch (e) {
                        if (stop) return;
                        setRows(cur => cur.map(x => x.id === m.id ? { ...x, state: 'chyba', error: e.message } : x));
                    }
                }
            } catch (e) { if (!stop) setError(e.message); }
            finally { if (!stop) setRunning(false); }
        })();
        return () => { stop = true; };
    }, [url]);

    const filled = d => (d ? Object.values(d).filter(v => v !== null && v !== undefined && v !== '').length : 0);

    return (
        <div style={{ marginTop: 14, borderTop: '1px solid #e9ecef', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ fontSize: '0.88rem' }}>
                    Porovnanie modelov {running && '— prebieha, netreba čakať pri obrazovke'}
                </strong>
                <button className={styles.btnSmall} onClick={onClose}>Zavrieť</button>
            </div>
            {error && <p className={styles.error}>✗ {error}</p>}
            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                    <thead><tr>
                        <th>Model</th><th>Stav</th><th>Zápas</th><th>Skóre</th>
                        <th>Vyplnených polí</th><th>Čas</th>
                    </tr></thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={r.ok ? { background: '#f2fbf5' } : undefined}>
                                <td className={styles.mono} style={{ fontSize: '0.75rem' }}>{r.id}</td>
                                <td>{r.state === 'hotovo' ? (r.ok ? '✓ JSON' : '✗ nie JSON') : r.state}</td>
                                <td style={{ fontSize: '0.8rem' }}>
                                    {r.data?.home_team ? `${r.data.home_team} — ${r.data.away_team ?? '?'}` : '—'}
                                </td>
                                <td>{score(r.data?.home_score, r.data?.away_score)}</td>
                                <td>{r.data ? `${filled(r.data)} / 17` : '—'}</td>
                                <td>{r.ms ? `${(r.ms / 1000).toFixed(1)} s` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#888' }}>
                Model s najviac vyplnenými poľami a platným JSON je najvhodnejší —
                zapíš jeho id do <code>api/config/openrouter.php</code>.
            </p>
        </div>
    );
}

const STORE_KEY = 'livescore_watch';

// Ukladajú sa len adresy a príznak zastavenia — výsledky sa načítajú znova.
const loadStored = () => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        return Array.isArray(raw)
            ? raw.filter(i => i?.url).map(i => ({ id: i.id ?? Date.now() + Math.random(), url: i.url, stopped: !!i.stopped }))
            : [];
    } catch { return []; }
};

export default function LivescoreTest() {
    const [url, setUrl] = useState('');
    const [items, setItems] = useState(loadStored);
    const [error, setError] = useState('');
    const [compareUrl, setCompareUrl] = useState(null);
    const [models, setModels] = useState([]);
    const [model, setModel] = useState(() => localStorage.getItem('livescore_model') || '');

    useEffect(() => {
        apiFetch('v1/admin/livescore-models').then(r => setModels(r.models || [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (model) localStorage.setItem('livescore_model', model);
        else localStorage.removeItem('livescore_model');
    }, [model]);

    useEffect(() => {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(
                items.map(i => ({ id: i.id, url: i.url, stopped: i.stopped }))));
        } catch { /* plné úložisko nesmie zhodiť obrazovku */ }
    }, [items]);

    const add = (e) => {
        e.preventDefault();
        const clean = url.trim();
        if (!clean) return;
        if (!/^https:\/\/(www\.)?(flashscore|livescore)\.(com|sk)\//i.test(clean)) {
            setError('Zadaj adresu zápasu z flashscore.com alebo livescore.com');
            return;
        }
        if (items.some(i => i.url === clean)) { setError('Táto adresa sa už sleduje.'); return; }
        setError('');
        setItems(cur => [{ id: Date.now(), url: clean, stopped: false }, ...cur]);
        setUrl('');
    };

    const update = (id, patch) =>
        setItems(cur => cur.map(i => (i.id === id ? { ...i, ...patch } : i)));

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #20c997' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#20c997' }}>📡 Test livescore</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>
                Vlož adresu zápasu z Flashscore. Server stránku stiahne a nechá model vyčítať,
                v akom je zápas stave. Kým zápas beží, stav sa obnovuje každú minútu —
                tlačidlom <strong>STOP</strong> sa obnovovanie zastaví, <strong>Zmazať</strong> záznam odstráni.
            </p>

            <form onSubmit={add} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://www.flashscore.com/match/..."
                    style={{ flex: 1, minWidth: 260, padding: '7px 10px' }}
                />
                <button className={styles.btn} type="submit">Sledovať</button>
                <button className={styles.btnSmall} type="button"
                        disabled={!url.trim()}
                        onClick={() => setCompareUrl(url.trim())}>
                    Porovnať modely
                </button>
            </form>

            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#666' }}>Model:</span>
                <select value={model} onChange={e => setModel(e.target.value)}
                        style={{ padding: '5px 8px', fontSize: '0.8rem', maxWidth: 360 }}>
                    <option value="">— podľa nastavenia servera —</option>
                    {models.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.id}{m.context ? ` (${Math.round(m.context / 1000)}k)` : ''}
                        </option>
                    ))}
                </select>
                {models.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#999' }}>
                        {models.length} bezplatných modelov
                    </span>
                )}
            </div>

            {compareUrl && <ModelCompare url={compareUrl} onClose={() => setCompareUrl(null)} />}

            {error && <p className={styles.error} style={{ marginTop: 8 }}>✗ {error}</p>}

            {items.length === 0 && (
                <p style={{ marginTop: 12, fontSize: '0.82rem', color: '#888' }}>
                    Zatiaľ nesleduješ žiadny zápas.
                </p>
            )}

            {items.map(item => (
                <Watch key={item.id} item={item} model={model}
                       onUpdate={update}
                       onStop={id => update(id, { stopped: true })}
                       onRemove={id => setItems(cur => cur.filter(i => i.id !== id))} />
            ))}
        </div>
    );
}
