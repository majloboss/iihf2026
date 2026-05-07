import { useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

export default function AdminTools() {
    const [running, setRunning] = useState(false);
    const [result,  setResult]  = useState(null);
    const [error,   setError]   = useState('');

    const runSetup = async () => {
        if (!window.confirm('Toto prepíše VŠETKY zápasy, výsledky a tipy. Pokračovať?')) return;
        setRunning(true); setResult(null); setError('');
        try {
            const r = await apiFetch('v1/admin/test-setup', { method: 'POST' });
            setResult(r);
        } catch (e) { setError(e.message); }
        finally { setRunning(false); }
    };

    return (
        <div style={{ maxWidth: 600, padding: 24 }}>
            <h2>Nástroje</h2>

            <div className={styles.card} style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Test setup — presun turnaja do minulosti</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#666' }}>
                    Posunie dátumy skupinovej fázy na 15.4.–28.4., play-off 5.–8.5.
                    Vygeneruje výsledky podľa ratingu a tipy pre všetkých aktívnych userov.
                    <br /><strong>Pozor: prepíše existujúce výsledky a tipy!</strong>
                </p>
                <button className={styles.btn} onClick={runSetup} disabled={running}>
                    {running ? 'Prebieha…' : '▶ Spustiť test setup'}
                </button>

                {error && <p style={{ color: '#dc3545', marginTop: 12, fontSize: '0.85rem' }}>{error}</p>}

                {result && (
                    <div style={{ marginTop: 16, fontSize: '0.85rem', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                        <div>✓ Zápasy aktualizované: <strong>{result.games_updated}</strong></div>
                        <div>✓ Tipy vygenerované: <strong>{result.tips_generated}</strong> ({result.users} hráčov)</div>
                        <div style={{ marginTop: 8 }}>
                            <strong>Top 4 Sk. A:</strong> {result.group_A_top4?.join(', ')}<br />
                            <strong>Top 4 Sk. B:</strong> {result.group_B_top4?.join(', ')}<br />
                            <strong>Bronz:</strong> {result.bronze}<br />
                            <strong>Zlato:</strong> {result.gold}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
