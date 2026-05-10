import { useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

const GEN_ACTIONS = [
    { key: 'group', label: 'Základná skupina' },
    { key: 'qf',    label: 'Štvrťfinále' },
    { key: 'sf',    label: 'Semifinále' },
    { key: 'final', label: 'Finále + Bronz' },
];

export default function AdminTools() {
    const [running,    setRunning]    = useState(null);
    const [results,    setResults]    = useState({});
    const [errors,     setErrors]     = useState({});
    const [migrating,  setMigrating]  = useState(false);
    const [migrateRes, setMigrateRes] = useState('');
    const [confirm,  setConfirm]  = useState(null); // 'init' | 'reset' | null
    const [syncRes,  setSyncRes]  = useState(null);
    const [syncErr,  setSyncErr]  = useState('');
    const [syncing,  setSyncing]  = useState(false);
    const [testMailTo,  setTestMailTo]  = useState('');
    const [testMailRes, setTestMailRes] = useState('');
    const [testMailing, setTestMailing] = useState(false);

    const run = async (action) => {
        setConfirm(null);
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

    const busy = running !== null || syncing || migrating;

    const runMigrations = async () => {
        setMigrating(true); setMigrateRes('');
        try {
            const r = await apiFetch('v1/admin/run-migration', { method: 'POST' });
            setMigrateRes('✓ Hotovo: ' + r.migrations.join(', '));
        } catch (e) { setMigrateRes('✗ ' + e.message); }
        finally { setMigrating(false); }
    };

    const sendTestMail = async () => {
        setTestMailing(true); setTestMailRes('');
        try {
            await apiFetch('v1/admin/test-mail', { method: 'POST', body: JSON.stringify({ to: testMailTo }) });
            setTestMailRes('✓ Email odoslaný na ' + testMailTo);
        } catch (e) { setTestMailRes('✗ ' + e.message); }
        finally { setTestMailing(false); }
    };

    const syncScores = async () => {
        setSyncing(true); setSyncRes(null); setSyncErr('');
        try {
            const r = await apiFetch('v1/admin/sync-scores', { method: 'POST' });
            setSyncRes(r);
        } catch (e) { setSyncErr(e.message); }
        finally { setSyncing(false); }
    };

    return (
        <div className={styles.toolsWrap}>
            <h2>Nástroje</h2>

            {/* ── DB Migrácie ─────────────────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #fd7e14' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#fd7e14' }}>🗄 DB Migrácie</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Spustí všetky pending migrácie (run_012, run_013...). Bezpečné — prikazy su IF NOT EXISTS.
                </p>
                <button className={styles.btn} style={{ background: '#fd7e14' }} onClick={runMigrations} disabled={busy}>
                    {migrating ? 'Spustam...' : '▶ Spustit migracie'}
                </button>
                {migrateRes && (
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: migrateRes.startsWith('✓') ? '#28a745' : '#dc3545' }}>
                        {migrateRes}
                    </p>
                )}
            </div>

            {/* ── Sync výsledkov z API-Sports ─────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #1a3a6b' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#1a3a6b' }}>🌐 Sync výsledkov (API-Sports)</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Stiahne dnešné výsledky z API-Sports a aktualizuje skóre + stav zápasov.
                    Dostupné od 15.5.2026 keď turnaj začne.
                </p>
                <button className={styles.btn} onClick={syncScores} disabled={busy}>
                    {syncing ? 'Sťahujem…' : '↓ Sync výsledkov'}
                </button>
                {syncErr && <p style={{ color: '#dc3545', marginTop: 8, fontSize: '0.85rem' }}>{syncErr}</p>}
                {syncRes && (
                    <div style={{ background: '#f0f5ff', border: '1px solid #1a3a6b', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', marginTop: 8 }}>
                        <div>📅 Dátum: <strong>{syncRes.date}</strong> | Stiahnutých: <strong>{syncRes.fetched}</strong> | Aktualizovaných: <strong>{syncRes.updated}</strong></div>
                        {syncRes.log?.map((l, i) => <div key={i} style={{ marginLeft: 8, marginTop: 2 }}>{l}</div>)}
                    </div>
                )}
            </div>

            {/* ── Test emailu ────────────────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #6f42c1' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#6f42c1' }}>📧 Test emailu (SMTP)</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Pošle testovací email na zadanú adresu — overí že SMTP funguje.
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="email"
                        placeholder="email@example.com"
                        value={testMailTo}
                        onChange={e => setTestMailTo(e.target.value)}
                        style={{ padding: '7px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: '0.88rem', flex: 1, minWidth: 200 }}
                    />
                    <button className={styles.btn} onClick={sendTestMail} disabled={testMailing || !testMailTo}>
                        {testMailing ? 'Odosielam…' : '📤 Odoslať test'}
                    </button>
                </div>
                {testMailRes && (
                    <p style={{ marginTop: 8, fontSize: '0.85rem', color: testMailRes.startsWith('✓') ? '#28a745' : '#dc3545' }}>
                        {testMailRes}
                    </p>
                )}
            </div>

            {/* ── Generovanie testovacích dát ─────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>Generovanie testovacích dát</h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#666' }}>
                    Každé tlačidlo generuje dáta pre danú fázu. Poradie: Základná skupina → QF → SF → Finále.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {GEN_ACTIONS.map(({ key, label }) => (
                        <button key={key} className={styles.btn}
                            onClick={() => run(key)}
                            disabled={busy}>
                            {running === key ? 'Prebieha…' : '▶ ' + label}
                        </button>
                    ))}
                </div>
                <ResultArea keys={GEN_ACTIONS.map(a => a.key)} results={results} errors={errors} />
            </div>

            {/* ── Spustenie súťaže ────────────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #28a745' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#28a745' }}>▶ Spustenie súťaže</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Vymaže <strong>tipy a tabuľky</strong>, obnoví pôvodný rozvrh zápasov z PDF.
                    Useri, skupiny a pozývacie linky zostávajú. <strong>Nezvratné!</strong>
                </p>
                {confirm === 'reset'
                    ? <ConfirmInline
                        text="Naozaj obnoviť pôvodný rozvrh a vymazať tipy?"
                        onYes={() => run('reset')}
                        onNo={() => setConfirm(null)}
                      />
                    : <button
                        className={styles.btn}
                        style={{ background: '#28a745' }}
                        onClick={() => setConfirm('reset')}
                        disabled={busy}>
                        {running === 'reset' ? 'Prebieha…' : '▶ Spustiť súťaž'}
                      </button>
                }
                <ResultArea keys={['reset']} results={results} errors={errors} />
            </div>

            {/* ── Inicializácia systému ───────────────────────────────── */}
            <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #dc3545' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#dc3545' }}>⚠ Inicializácia systému</h3>
                <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#666' }}>
                    Vymaže <strong>všetkých userov, tipy, pozývacie linky, skupiny a tabuľky</strong>.
                    Zápasy zostanú. Admini zostávajú. <strong>Nezvratné!</strong>
                </p>
                {confirm === 'init'
                    ? <ConfirmInline
                        text="Naozaj vymazať VŠETKÝCH userov a všetky dáta?"
                        onYes={() => run('init')}
                        onNo={() => setConfirm(null)}
                      />
                    : <button
                        className={styles.btnSmallDanger}
                        style={{ fontSize: '0.9rem', padding: '8px 16px' }}
                        onClick={() => setConfirm('init')}
                        disabled={busy}>
                        {running === 'init' ? 'Prebieha…' : '⚠ Inicializovať systém'}
                      </button>
                }
                <ResultArea keys={['init']} results={results} errors={errors} />
            </div>
        </div>
    );
}

function ConfirmInline({ text, onYes, onNo }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '8px 12px' }}>
            <span style={{ fontSize: '0.88rem', flex: 1 }}>{text}</span>
            <button onClick={onYes} style={{ background: '#dc3545', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontWeight: 600 }}>Áno</button>
            <button onClick={onNo}  style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 5, padding: '5px 14px', cursor: 'pointer' }}>Nie</button>
        </div>
    );
}

function ResultArea({ keys, results, errors }) {
    const items = keys.flatMap(key => {
        const out = [];
        if (errors[key])  out.push({ key, type: 'error', content: errors[key] });
        if (results[key]) out.push({ key, type: 'result', content: results[key] });
        return out;
    });
    if (items.length === 0) return null;
    return (
        <div style={{ marginTop: 14 }}>
            {items.map(({ key, type, content }) =>
                type === 'error'
                    ? <p key={key} style={{ color: '#dc3545', margin: '6px 0', fontSize: '0.85rem' }}>[{key}] {content}</p>
                    : <div key={key} style={{ background: '#f0fff4', border: '1px solid #28a745', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', marginBottom: 6 }}>
                        <ResultBlock r={content} />
                      </div>
            )}
        </div>
    );
}

function ResultBlock({ r }) {
    if (r.action === 'group') return <>
        <div>✓ Zápasy: <strong>{r.games}</strong>, Hráči: <strong>{r.users}</strong>, Tipy: <strong>{r.tips}</strong></div>
    </>;
    if (r.action === 'init') return <>
        <div>✓ Userov vymazaných: <strong>{r.users_deleted}</strong></div>
        <div>✓ Linkov vymazaných: <strong>{r.links_deleted}</strong></div>
    </>;
    if (r.action === 'reset') return <>
        <div>✓ Zápasov obnovených: <strong>{r.games_reset}</strong></div>
    </>;
    if (r.games) return <>
        <div>✓ Tipy pre hráčov: <strong>{r.users}</strong></div>
        {r.games.map((s, i) => <div key={i} style={{ marginLeft: 8 }}>• {s}</div>)}
    </>;
    return <div>✓ Hotovo</div>;
}
