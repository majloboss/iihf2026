import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { getGames } from '../../api/games';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

const PHASE_LABEL = {
    A: 'Skupina A', B: 'Skupina B',
    QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále',
};

/* ── Game tips modal ── */
function GameTipsModal({ game, onClose }) {
    const [groups, setGroups] = useState(null);
    const [err, setErr]       = useState('');

    useEffect(() => {
        apiFetch(`v1/game-tips?game_id=${game.id}`)
            .then(setGroups)
            .catch(e => setErr(e.message));
    }, [game.id]);

    const finished = game.status === 'finished';
    const live     = game.status === 'live';

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>

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
            </div>
        </div>
    );
}

/* ── Game card ── */
function GameCard({ game, onClick }) {
    const finished = game.status === 'finished';
    const live     = game.status === 'live';
    const scheduled = game.status === 'scheduled';
    const date = new Date(game.starts_at);
    const timeStr = date.toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    const clickable = finished || live;

    return (
        <div
            className={`${styles.gameCard} ${finished ? styles.finished : live ? styles.live : ''} ${clickable ? styles.clickable : ''}`}
            onClick={clickable ? onClick : undefined}
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

            {/* My tip — show for all statuses */}
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
                : scheduled && (
                    <div className={`${styles.gameTip} ${styles.tipMissing}`}>
                        ⚠ Bez tipu
                    </div>
                )
            }

            {clickable && <div className={styles.tapHint}>Klikni pre tipy skupín</div>}
        </div>
    );
}

/* ── Standings card ── */
function StandingsCard({ group, currentUserId }) {
    const top3 = group.members.slice(0, 3);
    const myIdx = group.members.findIndex(m => m.user_id === currentUserId);
    const showMe = myIdx > 2;
    const me = showMe ? group.members[myIdx] : null;

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
    const [activeGame, setActiveGame] = useState(null);

    useEffect(() => {
        Promise.all([getGames(), apiFetch('v1/standings')])
            .then(([g, s]) => { setGames(g); setStandings(s); })
            .finally(() => setLoading(false));
    }, []);

    const handleGameClick = useCallback((game) => setActiveGame(game), []);
    const handleClose     = useCallback(() => setActiveGame(null), []);

    if (loading) return <p className={styles.loading}>Načítavam…</p>;

    const now = Date.now();
    const finished = games
        .filter(g => g.status === 'finished')
        .slice(-4).reverse();
    const upcoming = games
        .filter(g => g.status === 'scheduled' && new Date(g.starts_at).getTime() > now)
        .slice(0, 4);
    const live = games.filter(g => g.status === 'live');

    return (
        <div className={styles.wrap}>
            {activeGame && <GameTipsModal game={activeGame} onClose={handleClose} />}
            <div className={styles.grid}>
                <section className={styles.section}>
                    {live.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}><span>🔴 Live</span></div>
                            {live.map(g => <GameCard key={g.id} game={g} onClick={() => handleGameClick(g)} />)}
                        </>
                    )}
                    {upcoming.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>
                                <span>⏰ Najbližšie zápasy</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {upcoming.map(g => <GameCard key={g.id} game={g} onClick={() => handleGameClick(g)} />)}
                        </>
                    )}
                    {finished.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>
                                <span>✅ Posledné výsledky</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {finished.map(g => <GameCard key={g.id} game={g} onClick={() => handleGameClick(g)} />)}
                        </>
                    )}
                    {live.length === 0 && upcoming.length === 0 && finished.length === 0 && (
                        <p className={styles.empty}>Žiadne zápasy</p>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span>👥 Poradie</span>
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
