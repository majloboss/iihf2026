import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { getGames } from '../../api/games';
import { saveTip } from '../../api/tips';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

const PHASE_LABEL = {
    A: 'Skupina A', B: 'Skupina B',
    QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále',
};

function ModalShell({ onClose, children }) {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>
                {children}
            </div>
        </div>
    );
}

function ModalHeader({ game }) {
    const finished = game.status === 'finished';
    const live     = game.status === 'live';
    return (
        <div className={styles.modalHeader}>
            <span className={styles.modalPhase}>{PHASE_LABEL[game.phase] ?? game.phase}</span>
            <div className={styles.modalTeams}>
                <span className={styles.modalTeam}>
                    {game.team1
                        ? <><img src={FLAG_URL(game.team1)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />{game.team1}</>
                        : 'TBD'}
                </span>
                <span className={styles.modalScore}>
                    {finished || live
                        ? <>{game.score1}<span className={styles.scoreSep}>:</span>{game.score2}</>
                        : 'vs'}
                </span>
                <span className={`${styles.modalTeam} ${styles.modalTeamRight}`}>
                    {game.team2
                        ? <>{game.team2}<img src={FLAG_URL(game.team2)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} /></>
                        : 'TBD'}
                </span>
            </div>
        </div>
    );
}

/* ── Tip modal (upcoming games) ── */
function TipModal({ game, onClose, onSaved }) {
    const [v1, setV1]       = useState(game.tip1 != null ? String(game.tip1) : '');
    const [v2, setV2]       = useState(game.tip2 != null ? String(game.tip2) : '');
    const [saving, setSaving] = useState(false);
    const [err, setErr]     = useState('');
    const [done, setDone]   = useState(false);

    const dateStr = new Date(game.starts_at).toLocaleString('sk-SK',
        { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

    const save = async () => {
        if (v1 === '' || v2 === '') { setErr('Zadaj oba skóre'); return; }
        setSaving(true); setErr('');
        try {
            await saveTip(game.id, parseInt(v1), parseInt(v2));
            setDone(true);
            onSaved(game.id, parseInt(v1), parseInt(v2));
            setTimeout(onClose, 800);
        } catch (e) { setErr(e.message); setSaving(false); }
    };

    return (
        <ModalShell onClose={onClose}>
            <ModalHeader game={game} />
            <div className={styles.modalBody}>
                <p className={styles.tipModalDate}>{dateStr}</p>
                {done
                    ? <p className={styles.tipModalOk}>✓ Tip uložený</p>
                    : (
                        <div className={styles.tipModalForm}>
                            <div className={styles.tipModalInputs}>
                                <div className={styles.tipTeamLabel}>
                                    {game.team1 && <><img src={FLAG_URL(game.team1)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />{game.team1}</>}
                                </div>
                                <input
                                    type="number" min="0" max="20"
                                    value={v1} onChange={e => setV1(e.target.value)}
                                    className={styles.tipInput}
                                    inputMode="numeric"
                                />
                                <span className={styles.tipSep}>:</span>
                                <input
                                    type="number" min="0" max="20"
                                    value={v2} onChange={e => setV2(e.target.value)}
                                    className={styles.tipInput}
                                    inputMode="numeric"
                                />
                                <div className={`${styles.tipTeamLabel} ${styles.tipTeamRight}`}>
                                    {game.team2 && <>{game.team2}<img src={FLAG_URL(game.team2)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} /></>}
                                </div>
                            </div>
                            {err && <p className={styles.tipModalErr}>{err}</p>}
                            <button className={styles.tipModalBtn} onClick={save} disabled={saving}>
                                {saving ? '…' : (game.tip1 != null ? 'Zmeniť tip' : 'Uložiť tip')}
                            </button>
                        </div>
                    )
                }
            </div>
        </ModalShell>
    );
}

/* ── Group tips modal (live / finished) ── */
function GameTipsModal({ game, onClose }) {
    const [groups, setGroups] = useState(null);
    const [err, setErr]       = useState('');

    useEffect(() => {
        apiFetch(`v1/game-tips?game_id=${game.id}`)
            .then(setGroups)
            .catch(e => setErr(e.message));
    }, [game.id]);

    return (
        <ModalShell onClose={onClose}>
            <ModalHeader game={game} />
            <div className={styles.modalBody}>
                {err && <p className={styles.modalErr}>{err}</p>}
                {!groups && !err && <p className={styles.modalLoading}>Načítavam…</p>}
                {groups && groups.map(grp => (
                    <div key={grp.group_id} className={styles.tipsGroup}>
                        <div className={styles.tipsGroupName}>{grp.group_name}</div>
                        <table className={styles.tipsTable}>
                            <tbody>
                                {grp.members.map(m => (
                                    <tr key={m.user_id} className={m.is_me ? styles.tipsMe : ''}>
                                        <td className={styles.tipsUser}>{m.username}{m.is_me && ' (ja)'}</td>
                                        <td className={styles.tipsTip}>
                                            {m.tip1 != null
                                                ? <span className={styles.tipVal}>{m.tip1}:{m.tip2}</span>
                                                : <span className={styles.tipNone}>—</span>}
                                        </td>
                                        <td className={styles.tipsPts}>
                                            {m.points != null && (
                                                <span className={`${styles.gamePts} ${m.points >= 3 ? styles.ptsGood : m.points > 0 ? styles.ptsMed : styles.ptsBad}`}>
                                                    +{m.points}b
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </ModalShell>
    );
}

/* ── Game card ── */
function GameCard({ game, onTipClick, onGroupTipsClick }) {
    const finished  = game.status === 'finished';
    const live      = game.status === 'live';
    const scheduled = game.status === 'scheduled';
    const canTip    = scheduled && game.team1 && game.team2 && new Date() < new Date(new Date(game.starts_at).getTime() - 5 * 60000);
    const date      = new Date(game.starts_at);
    const timeStr   = date.toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

    const handleClick = canTip ? onTipClick : (finished || live) ? onGroupTipsClick : undefined;
    const clickable   = !!handleClick;

    return (
        <div
            className={`${styles.gameCard} ${finished ? styles.finished : live ? styles.live : ''} ${clickable ? styles.clickable : ''}`}
            onClick={handleClick}
        >
            <div className={styles.gameCardTop}>
                <span className={styles.gamePhase}>{PHASE_LABEL[game.phase] ?? game.phase}</span>
                <span className={styles.gameTime}>{live ? '🔴 LIVE' : timeStr}</span>
            </div>
            <div className={styles.gameRow}>
                <div className={styles.gameTeam}>
                    {game.team1
                        ? <><img src={FLAG_URL(game.team1)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /><span>{game.team1}</span></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
                <div className={styles.gameScore}>
                    {finished || live
                        ? <><span>{game.score1}</span><span className={styles.scoreSep}>:</span><span>{game.score2}</span></>
                        : <span className={styles.vs}>vs</span>}
                </div>
                <div className={`${styles.gameTeam} ${styles.gameTeamRight}`}>
                    {game.team2
                        ? <><span>{game.team2}</span><img src={FLAG_URL(game.team2)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
            </div>

            {game.tip1 != null
                ? (
                    <div className={styles.gameTip}>
                        <span className={styles.tipCheck}>✓</span> Môj tip: {game.tip1}:{game.tip2}
                        {game.points != null && (
                            <span className={`${styles.gamePts} ${game.points >= 3 ? styles.ptsGood : game.points > 0 ? styles.ptsMed : styles.ptsBad}`}>
                                +{game.points}b
                            </span>
                        )}
                    </div>
                )
                : canTip && (
                    <div className={`${styles.gameTip} ${styles.tipMissing}`}>⚠ Bez tipu — klikni pre tip</div>
                )
            }

            {(finished || live) && <div className={styles.tapHint}>Klikni pre tipy skupín</div>}
        </div>
    );
}

/* ── Standings card ── */
function StandingsCard({ group, currentUserId }) {
    const top3  = group.members.slice(0, 3);
    const myIdx = group.members.findIndex(m => m.user_id === currentUserId);
    const showMe = myIdx > 2;
    const me     = showMe ? group.members[myIdx] : null;

    const Row = ({ m, rank }) => (
        <div className={`${styles.standRow} ${m.user_id === currentUserId ? styles.standMe : ''}`}>
            <span className={`${styles.standRank} ${rank === 1 ? styles.r1 : rank === 2 ? styles.r2 : rank === 3 ? styles.r3 : ''}`}>
                {rank}.
            </span>
            <span className={styles.standPlayer}>
                {m.avatar
                    ? <img src={m.avatar} className={styles.standAvatar} alt="" />
                    : <span className={styles.standAvatarPh}>{m.username[0].toUpperCase()}</span>}
                {m.username}
            </span>
            <span className={styles.standPts}>{m.total_points}b</span>
        </div>
    );

    return (
        <div className={styles.standCard}>
            <div className={styles.standHeader}>{group.name}</div>
            <div className={styles.standBody}>
                {top3.map((m, i) => <Row key={m.user_id} m={m} rank={i + 1} />)}
                {showMe && (
                    <>
                        <div className={styles.standEllipsis}>…</div>
                        <Row m={me} rank={myIdx + 1} />
                    </>
                )}
            </div>
        </div>
    );
}

/* ── Dashboard ── */
export default function Dashboard() {
    const { user } = useAuth();
    const [games, setGames]         = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [tipGame, setTipGame]         = useState(null);
    const [groupTipsGame, setGroupTipsGame] = useState(null);

    useEffect(() => {
        Promise.all([getGames(), apiFetch('v1/standings')])
            .then(([g, s]) => { setGames(g); setStandings(s); })
            .finally(() => setLoading(false));
    }, []);

    const handleTipSaved = useCallback((gameId, t1, t2) => {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, tip1: t1, tip2: t2 } : g));
    }, []);

    const handleClose = useCallback(() => { setTipGame(null); setGroupTipsGame(null); }, []);

    if (loading) return <p className={styles.loading}>Načítavam…</p>;

    const now      = Date.now();
    const finished = games.filter(g => g.status === 'finished').slice(-4).reverse();
    const live     = games.filter(g => g.status !== 'finished' && new Date(g.starts_at).getTime() <= now);
    const upcoming = [
        ...live,
        ...games.filter(g => g.status !== 'finished' && new Date(g.starts_at).getTime() > now).slice(0, 4),
    ];

    return (
        <div className={styles.wrap}>
            {tipGame      && <TipModal      game={tipGame}      onClose={handleClose} onSaved={handleTipSaved} />}
            {groupTipsGame && <GameTipsModal game={groupTipsGame} onClose={handleClose} />}

            <div className={styles.grid}>
                <section className={styles.section}>
                    {upcoming.length > 0 && (
                        <>
                            <div className={`${styles.sectionHeader} ${live.length > 0 ? styles.sHLive : styles.sHUpcoming}`}>
                                <span>Najbližšie zápasy</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {upcoming.map(g => (
                                <GameCard key={g.id} game={g}
                                    onTipClick={() => setTipGame(g)}
                                    onGroupTipsClick={() => setGroupTipsGame(g)} />
                            ))}
                        </>
                    )}
                    {finished.length > 0 && (
                        <>
                            <div className={`${styles.sectionHeader} ${styles.sHFinished}`}>
                                <span>Posledné výsledky</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {finished.map(g => (
                                <GameCard key={g.id} game={g}
                                    onTipClick={() => setTipGame(g)}
                                    onGroupTipsClick={() => setGroupTipsGame(g)} />
                            ))}
                        </>
                    )}
                    {upcoming.length === 0 && finished.length === 0 && (
                        <p className={styles.empty}>Žiadne zápasy</p>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={`${styles.sectionHeader} ${styles.sHStandings}`}>
                        <span>Poradie v skupinách</span>
                        <Link to="/standings" className={styles.more}>Celé →</Link>
                    </div>
                    {standings.length === 0
                        ? <p className={styles.empty}>Nie si v žiadnej skupine</p>
                        : standings.map(g => <StandingsCard key={g.id} group={g} currentUserId={user?.id} />)
                    }
                </section>
            </div>
        </div>
    );
}
