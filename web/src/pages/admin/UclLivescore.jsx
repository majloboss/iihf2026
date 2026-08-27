import { useEffect, useRef, useState } from 'react';
import { getUclLivescore, refreshUclLivescore } from '../../api/ucl';
import styles from './Admin.module.css';

const POLL_MS = 60000;

// start_time je naive UTC.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const timeFmt = s => {
    const d = asDate(s);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
};

export default function UclLivescore() {
    const [state, setState] = useState(null);
    const [result, setResult] = useState(null);
    const [auto, setAuto] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const timer = useRef(null);
    const running = useRef(false);

    const load = () => getUclLivescore().then(setState).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);

    const refresh = async () => {
        if (running.current) return;
        running.current = true;
        setBusy(true); setError('');
        try {
            setResult(await refreshUclLivescore());
            await load();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); running.current = false; }
    };

    // Automatické obnovovanie beží len kým je zapnuté.
    useEffect(() => {
        clearInterval(timer.current);
        if (auto) {
            refresh();
            timer.current = setInterval(refresh, POLL_MS);
        }
        return () => clearInterval(timer.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auto]);

    const games = state?.games ?? [];
    const withUrl = Number(state?.with_url) || 0;

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #dc3545' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#dc3545' }}>● Priebežné výsledky</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>
                Načíta priebežné skóre dnešných zápasov Ligy majstrov. Jedným dopytom na Flashscore
                a jedným volaním modelu bez ohľadu na počet zápasov. Adresu zápasu doplníš
                v <strong>Zápasy → Upraviť</strong> — bez nej sa zápas nesleduje.
            </p>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <button className={styles.btn} onClick={refresh} disabled={busy}>
                    {busy ? 'Zisťujem…' : 'Zistiť teraz'}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />
                    Obnovovať každú minútu
                </label>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    Dnes {games.length} {games.length === 1 ? 'zápas' : games.length < 5 ? 'zápasy' : 'zápasov'},
                    {' '}z toho {withUrl} s adresou
                </span>
            </div>

            {error && <p className={styles.error}>✗ {error}</p>}

            {result && (
                <p style={{ fontSize: '0.82rem', color: '#555' }}>
                    {result.note
                        ? result.note
                        : `✓ Aktualizovaných ${result.updated} z ${result.watched} sledovaných`}
                    {result.missing?.length > 0 && ` · vo feede sa nenašlo: ${result.missing.length}`}
                    {result.usage?.total_tokens && ` · ${result.usage.total_tokens} tokenov`}
                </p>
            )}

            {games.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: '#888' }}>Dnes sa nehrá žiadny zápas Ligy majstrov.</p>
            )}

            {games.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table} style={{ marginTop: 8 }}>
                        <thead><tr>
                            <th>Čas</th><th>Zápas</th><th>Live skóre</th><th>Stav</th>
                            <th>Adresa</th><th>Aktualizované</th>
                        </tr></thead>
                        <tbody>
                            {games.map(g => (
                                <tr key={g.game_id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{timeFmt(g.start_time)}</td>
                                    <td>{g.home_name && g.away_name
                                        ? `${g.home_name} — ${g.away_name}`
                                        : <span className={styles.unused}>tímy neurčené</span>}</td>
                                    <td><strong>{g.ls_home !== null && g.ls_away !== null
                                        ? `${g.ls_home} : ${g.ls_away}` : '—'}</strong></td>
                                    <td>{g.ls_status || <span className={styles.unused}>—</span>}</td>
                                    <td>{g.flashscore_url
                                        ? <a href={g.flashscore_url} target="_blank" rel="noreferrer"
                                             style={{ fontSize: '0.75rem' }}>otvoriť</a>
                                        : <span className={styles.unused}>chýba</span>}</td>
                                    <td style={{ fontSize: '0.75rem', color: '#888' }}>
                                        {g.ls_updated_at ? new Date(g.ls_updated_at.replace(' ', 'T') + 'Z')
                                            .toLocaleTimeString('sk-SK') : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
