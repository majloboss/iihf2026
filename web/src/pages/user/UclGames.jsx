import { useEffect, useMemo, useState } from 'react';
import { getUclGames, saveUclTip } from '../../api/ucl';
import styles from './Games.module.css';

const PHASES = {
    LEAGUE: 'Ligová fáza',
    PO: 'Play-off o osemfinále',
    R16: 'Osemfinále',
    QF: 'Štvrťfinále',
    SF: 'Semifinále',
    F: 'Finále',
};

const dayFmt = new Intl.DateTimeFormat('sk-SK', {
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
});
// start_time je naive UTC, preto ho tak treba aj interpretovať.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');

function Club({ code, name, logo, align }) {
    if (!name) return <span className={styles.tbd} style={{ color: '#999' }}>zatiaľ neurčený</span>;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
            {align === 'right' && <span>{name}</span>}
            {logo
                ? <img src={`/logos/ucl2026/${logo}`} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: 24 }} />}
            {align !== 'right' && <span>{name}</span>}
        </span>
    );
}

export default function UclGames() {
    const [games, setGames] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);
    const [phase, setPhase] = useState('LEAGUE');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUclGames().then(setGames).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);

    const byPhase = useMemo(() => {
        const map = {};
        for (const g of games) (map[g.game_type_code] = map[g.game_type_code] || []).push(g);
        return map;
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
        const home = draftOf(g, 'home');
        const away = draftOf(g, 'away');
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

    if (loading) return <p>Načítavam zápasy…</p>;

    const list = byPhase[phase] || [];

    return (
        <div>
            <h2>Zápasy — Liga majstrov</h2>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0', borderBottom: '2px solid #e9ecef' }}>
                {Object.entries(PHASES).map(([key, label]) => (
                    <button key={key} onClick={() => setPhase(key)}
                        style={{
                            padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.88rem', fontWeight: 600, marginBottom: -2,
                            borderBottom: '2px solid ' + (phase === key ? '#1a3a6b' : 'transparent'),
                            color: phase === key ? '#1a3a6b' : '#999',
                        }}>
                        {label}{byPhase[key]?.length ? ` (${byPhase[key].length})` : ''}
                    </button>
                ))}
            </div>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {list.length === 0 && <p style={{ color: '#888' }}>V tejto fáze zatiaľ nie sú zápasy.</p>}

            {list.map(g => {
                const known = g.home_team_id && g.away_team_id;
                const closed = !g.tips_open || asDate(g.start_time) <= new Date();
                const hasResult = g.home_score_regular !== null && g.away_score_regular !== null;
                return (
                    <div key={g.game_id} className={styles.card}
                         style={{ padding: 12, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 130, fontSize: '0.8rem', color: '#666' }}>
                            {dayFmt.format(asDate(g.start_time))}
                            <div style={{ fontSize: '0.72rem', color: '#999' }}>{g.game_type_name}</div>
                        </div>

                        <div style={{ flex: 1, minWidth: 260, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                            <Club code={g.home_code} name={g.home_name} logo={g.home_logo} align="right" />
                            <strong style={{ color: hasResult ? '#1a3a6b' : '#bbb' }}>
                                {hasResult ? `${g.home_score_regular} : ${g.away_score_regular}` : 'vs'}
                            </strong>
                            <Club code={g.away_code} name={g.away_name} logo={g.away_logo} />
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {!known
                                ? <span style={{ fontSize: '0.78rem', color: '#999' }}>čaká na súperov</span>
                                : closed
                                    ? <span style={{ fontSize: '0.82rem' }}>
                                        {g.home_score_tip !== null
                                            ? <>Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong>
                                                {g.points_earned !== null && <> · {g.points_earned} b.</>}</>
                                            : <span style={{ color: '#999' }}>netipoval si</span>}
                                      </span>
                                    : <>
                                        <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                                               inputMode="numeric" style={{ width: 40, textAlign: 'center' }} aria-label="Tip domáci" />
                                        <span>:</span>
                                        <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                                               inputMode="numeric" style={{ width: 40, textAlign: 'center' }} aria-label="Tip hostia" />
                                        <button onClick={() => save(g)} disabled={saving === g.game_id}>
                                            {saving === g.game_id ? '…' : 'Uložiť'}
                                        </button>
                                      </>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
