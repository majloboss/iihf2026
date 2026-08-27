import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import styles from './Admin.module.css';

// Popisky polí v poradí, v akom sa zobrazujú.
const FIELDS = [
    ['home_team', 'Domáci'],
    ['away_team', 'Hostia'],
    ['competition', 'Súťaž'],
    ['started', 'Začal'],
    ['finished', 'Skončil'],
    ['minute', 'Minúta'],
    ['minute_note', 'Poznámka k minúte'],
    ['period', 'Časť'],
    ['status', 'Stav'],
    ['home_score', 'Góly D'],
    ['away_score', 'Góly H'],
    ['home_score_halftime', 'Polčas D'],
    ['away_score_halftime', 'Polčas H'],
    ['home_yellow_cards', 'Žlté D'],
    ['away_yellow_cards', 'Žlté H'],
    ['home_red_cards', 'Červené D'],
    ['away_red_cards', 'Červené H'],
    ['start_time_text', 'Začiatok'],
    ['notes', 'Poznámka modelu'],
];

const val = v => {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'áno' : 'nie';
    return String(v);
};

const timeFmt = s => {
    if (!s) return '—';
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('sk-SK');
};

export default function LivescoreLog() {
    const [data, setData] = useState(null);
    const [matchId, setMatchId] = useState('');
    const [open, setOpen] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = async (mid = matchId) => {
        setBusy(true); setError('');
        try {
            const q = mid ? `?match_id=${encodeURIComponent(mid)}` : '';
            setData(await apiFetch('v1/admin/livescore-log' + q));
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };
    useEffect(() => { load(''); }, []);

    const clear = async () => {
        if (!window.confirm('Naozaj vymazať celý záznamník?')) return;
        setBusy(true); setError('');
        try {
            await apiFetch('v1/admin/livescore-log', { method: 'DELETE' });
            await load('');
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    const rows = data?.rows ?? [];
    const fill = data?.fill ?? {};
    const stats = data?.stats ?? {};

    // Zápasy, ktoré sa v zázname vyskytujú — na rýchle filtrovanie.
    const matches = [...new Map(rows.filter(r => r.match_id)
        .map(r => [r.match_id, `${r.home_team ?? '?'} — ${r.away_team ?? '?'}`])).entries()];

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #6f42c1' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#6f42c1' }}>🗒 Záznamník livescore</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>
                Dočasný zoznam všetkého, čo model vrátil pri sledovaní zápasov. Slúži na rozhodnutie,
                ktoré údaje má zmysel ukladať natrvalo. Zapisuje sa pri každom zistení v sekcii
                <strong> Test livescore</strong>.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <select value={matchId} onChange={e => { setMatchId(e.target.value); load(e.target.value); }}
                        style={{ padding: '5px 8px', fontSize: '0.82rem', maxWidth: 320 }}>
                    <option value="">— všetky zápasy —</option>
                    {matches.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button className={styles.btnSmall} onClick={() => load()} disabled={busy}>
                    {busy ? 'Načítavam…' : 'Obnoviť'}
                </button>
                <button className={styles.btnSmallDanger} onClick={clear} disabled={busy}>Vymazať záznamník</button>
                <span style={{ fontSize: '0.78rem', color: '#888' }}>
                    {stats.total ?? 0} záznamov · {stats.matches ?? 0} zápasov
                    {stats.avg_tokens ? ` · priemer ${stats.avg_tokens} tokenov` : ''}
                    {stats.avg_ms ? ` · ${(stats.avg_ms / 1000).toFixed(1)} s` : ''}
                </span>
            </div>

            {error && <p className={styles.error}>✗ {error}</p>}

            {rows.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: '#888' }}>
                    Záznamník je prázdny. Spusti sledovanie v sekcii Test livescore.
                </p>
            )}

            {rows.length > 0 && (
                <>
                    <h4 style={{ margin: '14px 0 6px', fontSize: '0.88rem' }}>Ktoré polia model vypĺňa</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 6 }}>
                        {FIELDS.map(([key, label]) => {
                            const f = fill[key] ?? { count: 0, pct: 0 };
                            const color = f.pct >= 90 ? '#28a745' : f.pct >= 40 ? '#e67e22' : '#c0392b';
                            return (
                                <div key={key} style={{ fontSize: '0.78rem', display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ width: 34, textAlign: 'right', fontWeight: 700, color }}>{f.pct}%</span>
                                    <span style={{ flex: 1, color: '#555' }}>{label}</span>
                                    <span style={{ color: '#aaa' }}>{f.count}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p style={{ margin: '6px 0 14px', fontSize: '0.72rem', color: '#888' }}>
                        Percento hovorí, ako často model pole vyplnil. Nízke číslo znamená,
                        že údaj vo feede zvyčajne nie je — ukladať ho nemá zmysel.
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles.table} style={{ whiteSpace: 'nowrap' }}>
                            <thead><tr>
                                <th>Čas</th><th>Zápas</th><th>Stav</th><th>Min.</th>
                                <th>Skóre</th><th>Polčas</th><th>Žlté</th><th>Červené</th><th></th>
                            </tr></thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontSize: '0.75rem' }}>{timeFmt(r.checked_at)}</td>
                                        <td style={{ fontSize: '0.8rem' }}>{r.home_team ?? '?'} — {r.away_team ?? '?'}</td>
                                        <td>{val(r.status)}</td>
                                        <td>{r.minute ?? '—'}{r.minute_note ? ` (${r.minute_note})` : ''}</td>
                                        <td><strong>{r.home_score ?? '—'} : {r.away_score ?? '—'}</strong></td>
                                        <td>{r.home_score_halftime ?? '—'} : {r.away_score_halftime ?? '—'}</td>
                                        <td>{r.home_yellow_cards ?? '—'} : {r.away_yellow_cards ?? '—'}</td>
                                        <td>{r.home_red_cards ?? '—'} : {r.away_red_cards ?? '—'}</td>
                                        <td>
                                            <button className={styles.btnSmall}
                                                    onClick={() => setOpen(open === r.id ? null : r.id)}>
                                                {open === r.id ? 'skryť' : 'detail'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {open !== null && (() => {
                        const r = rows.find(x => x.id === open);
                        if (!r) return null;
                        return (
                            <div style={{ marginTop: 12, background: '#f8f9fa', border: '1px solid #e9ecef',
                                          borderRadius: 8, padding: 12 }}>
                                <div style={{ fontSize: '0.78rem', color: '#666', marginBottom: 8 }}>
                                    {timeFmt(r.checked_at)} · {r.model} · {r.tokens ?? '?'} tokenov
                                    {r.took_ms ? ` · ${(r.took_ms / 1000).toFixed(1)} s` : ''}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px 14px' }}>
                                    {FIELDS.map(([key, label]) => (
                                        <div key={key} style={{ fontSize: '0.8rem' }}>
                                            <span style={{ color: '#999' }}>{label}: </span>
                                            <span style={{ fontWeight: 600 }}>{val(r[key])}</span>
                                        </div>
                                    ))}
                                </div>
                                <details style={{ marginTop: 10 }}>
                                    <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: '#0d6efd' }}>
                                        Surová odpoveď modelu
                                    </summary>
                                    <pre style={{ fontSize: '0.7rem', overflowX: 'auto', marginTop: 6,
                                                  whiteSpace: 'pre-wrap' }}>
                                        {(() => { try { return JSON.stringify(r.raw, null, 2); }
                                                  catch { return String(r.raw); } })()}
                                    </pre>
                                </details>
                            </div>
                        );
                    })()}
                </>
            )}
        </div>
    );
}
