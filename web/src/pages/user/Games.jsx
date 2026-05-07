import { useState, useEffect, useCallback } from 'react';
import { getGames } from '../../api/games';
import { saveTip } from '../../api/tips';
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
        return <div className={styles.tipClosed}>Uzavreté</div>;
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

function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' +
        d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

export default function Games() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [phase, setPhase] = useState('all');

    useEffect(() => {
        getGames().then(data => { setGames(data); setLoading(false); }).catch(() => setLoading(false));
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
                        </div>
                    ))}
                </div>
            ))}

            {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy</p>}
        </div>
    );
}
