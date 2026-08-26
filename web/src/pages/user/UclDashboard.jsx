import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUclGames, saveUclTip } from '../../api/ucl';
import { asDate, canTip, isValidDate } from '../../utils/tipWindow';

// start_time je naive UTC, preto ho tak treba aj interpretovať.
const dayFmtRaw = new Intl.DateTimeFormat('sk-SK', {
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
});
// Neplatny datum by vo format() vyhodil vynimku a zhodil stranku.
const dayFmt = s => { const d = asDate(s); return isValidDate(d) ? dayFmtRaw.format(d) : '—'; };

// Po predĺžení alebo penaltách sa ukáže aj konečný výsledok: 2:1 (4:3 pp).
function scoreText(g) {
    if (g.home_score_regular === null || g.away_score_regular === null) return null;
    const base = `${g.home_score_regular} : ${g.away_score_regular}`;
    const hasFinal = g.home_score_final !== null && g.away_score_final !== null;
    return hasFinal ? `${base} (${g.home_score_final}:${g.away_score_final} pp)` : base;
}

function Club({ name, logo, align }) {
    if (!name) return <span style={{ color: '#999' }}>neurčený</span>;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
            {align === 'right' && <span>{name}</span>}
            {logo
                ? <img src={`/logos/ucl2026/${logo}`} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: 22 }} />}
            {align !== 'right' && <span>{name}</span>}
        </span>
    );
}

export default function UclDashboard() {
    const [games, setGames] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUclGames().then(setGames).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);

    // Zápasy, ktoré sa dajú tipovať — rovnaké pravidlo ako na serveri.
    const upcoming = useMemo(() => games
        .filter(g => canTip(g))
        .sort((a, b) => asDate(a.start_time) - asDate(b.start_time))
        .slice(0, 8), [games]);

    const played = useMemo(() => games
        .filter(g => g.result_approved && g.home_score_tip !== null)
        .sort((a, b) => asDate(b.start_time) - asDate(a.start_time))
        .slice(0, 5), [games]);

    const stats = useMemo(() => {
        const scored = games.filter(g => g.points_earned !== null);
        return {
            tips: games.filter(g => g.home_score_tip !== null).length,
            points: scored.reduce((sum, g) => sum + Number(g.points_earned || 0), 0),
            evaluated: scored.length,
        };
    }, [games]);

    const draftOf = (g, side) => {
        const d = drafts[g.game_id];
        if (d && d[side] !== undefined) return d[side];
        const v = side === 'home' ? g.home_score_tip : g.away_score_tip;
        return v === null || v === undefined ? '' : String(v);
    };
    const setDraft = (id, side, value) =>
        setDrafts(cur => ({ ...cur, [id]: { ...cur[id], [side]: value.replace(/[^0-9]/g, '').slice(0, 2) } }));

    const save = async (g) => {
        const home = draftOf(g, 'home'), away = draftOf(g, 'away');
        if (home === '' || away === '') { setError('Vyplň oba tipy.'); return; }
        setSaving(g.game_id); setError(''); setMessage('');
        try {
            await saveUclTip(g.game_id, Number(home), Number(away));
            setGames(cur => cur.map(x => x.game_id === g.game_id
                ? { ...x, home_score_tip: Number(home), away_score_tip: Number(away) } : x));
            setMessage('✓ Tip bol uložený.');
        } catch (e) { setError(e.message); }
        finally { setSaving(null); }
    };

    if (loading) return <p>Načítavam…</p>;

    return (
        <div>
            <h2>Liga majstrov 2026/27</h2>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0' }}>
                {[['Zadaných tipov', stats.tips], ['Vyhodnotených', stats.evaluated], ['Získaných bodov', stats.points]].map(([label, value]) => (
                    <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '12px 18px', border: '1px solid #e9ecef', minWidth: 120 }}>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1a3a6b' }}>{value}</div>
                    </div>
                ))}
            </div>

            {message && <p style={{ color: '#28a745', fontSize: '0.85rem' }}>{message}</p>}
            {error && <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>✗ {error}</p>}

            <h3 style={{ marginTop: 20 }}>Najbližšie zápasy na tipovanie</h3>
            {upcoming.length === 0 && (
                <p style={{ color: '#888' }}>
                    Momentálne nie je čo tipovať. Play-off sa odomkne, keď budú známi postupujúci.
                </p>
            )}
            {upcoming.map(g => (
                <div key={g.game_id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                                              padding: 12, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <div style={{ minWidth: 120, fontSize: '0.78rem', color: '#666' }}>
                        {dayFmt(g.start_time)}
                        <div style={{ fontSize: '0.7rem', color: '#999' }}>{g.game_type_name}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                        <Club name={g.home_name} logo={g.home_logo} align="right" />
                        <span style={{ color: '#bbb' }}>vs</span>
                        <Club name={g.away_name} logo={g.away_logo} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip domáci" />
                        <span>:</span>
                        <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip hostia" />
                        <button onClick={() => save(g)} disabled={saving === g.game_id}>
                            {saving === g.game_id ? '…' : 'Uložiť'}
                        </button>
                    </div>
                </div>
            ))}

            {played.length > 0 && (
                <>
                    <h3 style={{ marginTop: 24 }}>Posledné vyhodnotené</h3>
                    {played.map(g => (
                        <div key={g.game_id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                                                      padding: '10px 12px', marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                                <Club name={g.home_name} logo={g.home_logo} align="right" />
                                <strong>{scoreText(g)}</strong>
                                <Club name={g.away_name} logo={g.away_logo} />
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>
                                Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong>
                                {g.points_earned !== null && <> · <strong style={{ color: '#28a745' }}>{g.points_earned} b.</strong></>}
                            </div>
                        </div>
                    ))}
                </>
            )}

            <p style={{ marginTop: 20 }}>
                <Link to="/games">Všetky zápasy</Link> · <Link to="/tabulky">Ligová tabuľka</Link>
            </p>
        </div>
    );
}
