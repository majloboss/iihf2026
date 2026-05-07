import { useState, useEffect, useCallback } from 'react';
import { getGames } from '../../api/games';
import { saveTip, getGameTips } from '../../api/tips';
import styles from './Games.module.css';

const PHASE_LABEL = { A: 'Skupina A', B: 'Skupina B', QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále' };
const FLAG_URL = (code) => `/flags/team_flag_${code?.toLowerCase()}.png`;

function TeamBlock({ code, score, isLeft }) {
    return (
        <div className={`${styles.team} ${isLeft ? styles.teamLeft : styles.teamRight}`}>
            {code
                ? <><img className={styles.flag} src={FLAG_URL(code)} alt={code} onError={e => e.target.style.display='none'} /><span className={styles.teamCode}>{code}</span></>
                : <span className={styles.teamCode}>TBD</span>
            }
            {score != null && <span className={styles.score}>{score}</span>}
        </div>
    );
}

function TipInput({ game, onSaved }) {
    const [v1, setV1] = useState(game.tip1 != null ? String(game.tip1) : '');
    const [v2, setV2] = useState(game.tip2 != null ? String(game.tip2) : '');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const canTip = game.status === 'scheduled' && new Date() < new Date(new Date(game.starts_at).getTime() - 5 * 60000);

    const save = async () => {
        if (v1 === '' || v2 === '') { setErr('Zadaj oba skóre'); return; }
        setSaving(true); setErr('');
        try {
            await saveTip(game.id, parseInt(v1), parseInt(v2));
            onSaved(game.id, parseInt(v1), parseInt(v2));
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    if (!canTip) {
        if (game.tip1 != null) return <div className={styles.tipDone}>{game.tip1}:{game.tip2} {game.points != null && <span className={styles.pts}>+{game.points}b</span>}</div>;
        // "Uzavreté" only in the 5-min pre-game window; after start time show nothing
        if (new Date() < new Date(game.starts_at)) return <div className={styles.tipClosed}>Uzavreté</div>;
        return null;
    }

    return (
        <div className={styles.tipForm}>
            <input type="number" min="0" max="20" value={v1} onChange={e => setV1(e.target.value)} className={styles.tipScore} />
            <span>:</span>
            <input type="number" min="0" max="20" value={v2} onChange={e => setV2(e.target.value)} className={styles.tipScore} />
            <button onClick={save} disabled={saving} className={styles.btnTip}>{saving ? '…' : (game.tip1 != null ? 'Zmeniť' : 'Tipovať')}</button>
            {err && <span className={styles.tipErr}>{err}</span>}
        </div>
    );
}

function GroupTips({ gameId }) {
    const [open,    setOpen]    = useState(false);
    const [groups,  setGroups]  = useState(null);
    const [loading, setLoading] = useState(false);
    const [err,     setErr]     = useState('');

    const toggle = async () => {
        if (!open && groups === null) {
            setLoading(true);
            try {
                const data = await getGameTips(gameId);
                setGroups(data);
            } catch (e) {
                if (e.message && e.message.includes('začiatku')) {
                    setGroups([]);
                    setErr('Tipy skupín budú viditeľné po začiatku zápasu.');
                } else {
                    setErr(e.message);
                }
            }
            finally { setLoading(false); }
        }
        setOpen(o => !o);
    };

    return (
        <>
            <button className={styles.showTipsBtn} onClick={toggle}>
                {open ? '▲ Skryť tipy skupín' : '▼ Tipy skupín'}
            </button>
            {open && (
                <div className={styles.groupTips}>
                    {loading && <div className={styles.tipsLoading}>Načítavam…</div>}
                    {err     && <div className={styles.tipsErr}>{err}</div>}
                    {groups && groups.length === 0 && !err && (
                        <div className={styles.tipsLoading}>Nie si v žiadnej skupine</div>
                    )}
                    {groups && groups.map(g => (
                        <div key={g.group_id} className={styles.groupSection}>
                            <div className={styles.groupName}>{g.group_name}</div>
                            <table className={styles.tipsTable}>
                                <tbody>
                                    {g.members.map(m => (
                                        <tr key={m.user_id} className={m.is_me ? styles.tipsTableMe : ''}>
                                            <td>{m.username}{m.is_me ? ' (ty)' : ''}</td>
                                            <td>
                                                {m.tip1 != null
                                                    ? <span className={styles.tipScore2}>{m.tip1}:{m.tip2}</span>
                                                    : <span className={styles.tipNoTip}>—</span>}
                                            </td>
                                            <td>
                                                {m.points != null && <span className={styles.tipPts}>+{m.points}b</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' +
        d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

export default function Games() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [phase, setPhase] = useState('all');

    useEffect(() => {
        getGames()
            .then(data => { setGames(data); setLoading(false); })
            .catch(e => { setError(e.message || 'Chyba API'); setLoading(false); });
    }, []);

    const handleSaved = useCallback((gameId, t1, t2) => {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, tip1: t1, tip2: t2 } : g));
    }, []);

    const phases = ['all', 'A', 'B', 'QF', 'SF', 'BRONZE', 'GOLD'];
    const filtered = phase === 'all' ? games : games.filter(g => g.phase === phase);

    // Group by date
    const byDate = {};
    filtered.forEach(g => {
        const d = new Date(g.starts_at).toLocaleDateString('sk-SK', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(g);
    });

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;
    if (error) return <div className={styles.wrap}><p style={{color:'red'}}>Chyba: {error}</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <h2>Zápasy</h2>
                <div className={styles.filters}>
                    {phases.map(p => (
                        <button key={p} onClick={() => setPhase(p)}
                            className={phase === p ? styles.btnFilterActive : styles.btnFilter}>
                            {p === 'all' ? 'Všetky' : (PHASE_LABEL[p] || p)}
                        </button>
                    ))}
                </div>
            </div>

            {Object.entries(byDate).map(([date, dayGames]) => (
                <div key={date} className={styles.dayGroup}>
                    <div className={styles.dayHeader}>{date}</div>
                    {dayGames.map(g => (
                        <div key={g.id} className={`${styles.card} ${g.status === 'finished' ? styles.cardFinished : ''}`}>
                            <div className={styles.cardTop}>
                                <span className={styles.phase}>{PHASE_LABEL[g.phase] || g.phase} • Zápas {g.game_number}</span>
                                <span className={styles.time}>{new Date(g.starts_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className={styles.matchRow}>
                                <TeamBlock code={g.team1} score={g.status === 'finished' ? g.score1 : null} isLeft />
                                <div className={styles.vs}>
                                    {g.status === 'live' ? <span className={styles.live}>LIVE</span> : 'vs'}
                                </div>
                                <TeamBlock code={g.team2} score={g.status === 'finished' ? g.score2 : null} />
                            </div>
                            <div className={styles.venue}>{g.venue}</div>
                            <TipInput game={g} onSaved={handleSaved} />
                            <GroupTips gameId={g.id} />
                        </div>
                    ))}
                </div>
            ))}

            {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy</p>}
        </div>
    );
}
