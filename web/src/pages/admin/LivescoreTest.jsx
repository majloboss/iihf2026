import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

const POLL_MS = 60000;   // ako často sa obnoví stav sledovaného zápasu

const val = v => (v === null || v === undefined || v === '' ? '—' : String(v));
const score = (a, b) => (a === null || b === null || a === undefined || b === undefined ? '—' : `${a} : ${b}`);

// Jeden sledovaný zápas. Sám sa obnovuje, kým beží a nie je zastavený.
function Watch({ item, onUpdate, onStop, onRemove }) {
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
                method: 'POST', body: JSON.stringify({ url: item.url }),
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

export default function LivescoreTest() {
    const [url, setUrl] = useState('');
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');

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
            </form>

            {error && <p className={styles.error} style={{ marginTop: 8 }}>✗ {error}</p>}

            {items.length === 0 && (
                <p style={{ marginTop: 12, fontSize: '0.82rem', color: '#888' }}>
                    Zatiaľ nesleduješ žiadny zápas.
                </p>
            )}

            {items.map(item => (
                <Watch key={item.id} item={item}
                       onUpdate={update}
                       onStop={id => update(id, { stopped: true })}
                       onRemove={id => setItems(cur => cur.filter(i => i.id !== id))} />
            ))}
        </div>
    );
}
