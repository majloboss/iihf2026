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

                <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#dc3545' }}>⚠ Spustenie súťaže</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Vymaže <strong>všetkých userov, tipy, pozývacie linky, skupiny</strong> a obnoví
                    pôvodný rozvrh zápasov z PDF. Admini zostávajú. <strong>Nezvratné!</strong>
                </p>
                <button className={styles.btnSmallDanger}
                    style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                    onClick={() => run('reset', 'POZOR! Toto vymaže VŠETKY testovacie dáta (userov, tipy, linky) a obnoví pôvodný rozvrh. Naozaj pokračovať?')}
                    disabled={running !== null}>
                    {running === 'reset' ? 'Prebieha…' : '⚠ Spustiť súťaž (reset dát)'}
                </button>

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
    if (r.action === 'reset') return <>
        <div>✓ Userov vymazaných: <strong>{r.users_deleted}</strong></div>
        <div>✓ Linkov vymazaných: <strong>{r.links_deleted}</strong></div>
        <div>✓ Zápasov obnovených: <strong>{r.games_reset}</strong></div>
    </>;
    if (r.games) return <>
        <div>✓ Tipy pre hráčov: <strong>{r.users}</strong></div>
        {r.games.map((s, i) => <div key={i} style={{ marginLeft: 8 }}>• {s}</div>)}
    </>;
    return <div>✓ Hotovo</div>;
}
