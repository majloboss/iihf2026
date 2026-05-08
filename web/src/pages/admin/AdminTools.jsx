import { useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

const ACTIONS = [
    { key: 'group', label: 'Základná skupina', warn: 'Prepíše VŠETKY zápasy, výsledky a tipy. Pokračovať?' },
    { key: 'qf',    label: 'Štvrťfinále',      warn: 'Vygeneruje QF zápasy a tipy. Pokračovať?' },
    { key: 'sf',    label: 'Semifinále',        warn: 'Vygeneruje SF zápasy a tipy. Pokračovať?' },
    { key: 'final', label: 'Finále + Bronz',    warn: 'Vygeneruje Finále a zápas o bronz. Pokračovať?' },
];

export default function AdminTools() {
    const [running, setRunning] = useState(null);
    const [results, setResults] = useState({});
    const [errors,  setErrors]  = useState({});

    const run = async (action, warn) => {
        if (!window.confirm(warn)) return;
        setRunning(action);
        setResults(p => ({ ...p, [action]: null }));
        setErrors(p => ({ ...p, [action]: '' }));
        try {
            const r = await apiFetch('v1/admin/test-setup', {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
            setResults(p => ({ ...p, [action]: r }));
        } catch (e) {
            setErrors(p => ({ ...p, [action]: e.message }));
        } finally {
            setRunning(null);
        }
    };

    return (
        <div style={{ maxWidth: 600, padding: 24 }}>
            <h2>Nástroje</h2>

            <div className={styles.card} style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Test setup — generovanie dát</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#666' }}>
                    Každé tlačidlo generuje dáta pre danú fázu turnaja. Poradie: najprv Základná skupina, potom QF → SF → Finále.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ACTIONS.map(({ key, label, warn }) => (
                        <button key={key} className={styles.btn}
                            onClick={() => run(key, warn)}
                            disabled={running !== null}>
                            {running === key ? 'Prebieha…' : '▶ ' + label}
                        </button>
                    ))}
                </div>

                {ACTIONS.map(({ key }) => (
                    <div key={key}>
                        {errors[key] && (
                            <p style={{ color: '#dc3545', marginTop: 10, fontSize: '0.85rem' }}>
                                [{key}] {errors[key]}
                            </p>
                        )}
                        {results[key] && (
                            <div style={{ marginTop: 12, fontSize: '0.85rem', background: '#f8f9fa', padding: 10, borderRadius: 8 }}>
                                <ResultBlock r={results[key]} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ResultBlock({ r }) {
    if (r.action === 'group') return <>
        <div>✓ Zápasy: <strong>{r.games}</strong>, Hráči: <strong>{r.users}</strong>, Tipy: <strong>{r.tips}</strong></div>
    </>;
    if (r.results) return <>
        <div>✓ Výsledky:</div>
        {r.results.map((s, i) => <div key={i} style={{ marginLeft: 8 }}>• {s}</div>)}
    </>;
    return <div>✓ Hotovo</div>;
}
