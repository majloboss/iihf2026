import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { getGames } from '../../api/games';
import { saveTip } from '../../api/tips';
import { useAuth } from '../../context/AuthContext';
import { Flag } from '../../components/Flag';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;
const isLsLive = (g) => g.ls_score1 != null && g.ls_status && g.ls_status !== 'FT';
const calcLivePoints = (t1, t2, g) => {
    const s1 = g.ls_final1 != null ? +g.ls_final1 : (g.ls_score1 != null ? +g.ls_score1 : null);
    const s2 = g.ls_final2 != null ? +g.ls_final2 : (g.ls_score2 != null ? +g.ls_score2 : null);
    if (s1 == null || s2 == null || t1 == null || t2 == null) return null;
    const n1 = +t1, n2 = +t2;
    const isPlayoff = ['QF','SF','BRONZE','GOLD'].includes(g.phase);
    const winPts = isPlayoff ? 5 : 3;
    const rw = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
    const tw = n1 > n2 ? 1 : n1 < n2 ? -1 : 0;
    return (tw === rw ? winPts : 0) + (n1 === s1 ? 1 : 0) + (n2 === s2 ? 1 : 0);
};
const formatLsAge = (ts) => {
    if (!ts) return '';
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    return m < 1 ? 'práve teraz' : `pred ${m} min`;
};

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
                        ? <><Flag code={game.team1} compId={1} className={styles.modalFlag} />{game.team1}</>
                        : 'TBD'}
                </span>
                <span className={styles.modalScore}>
                    {finished || live
                        ? <>{game.score1}<span className={styles.scoreSep}>:</span>{game.score2}</>
                        : 'vs'}
                </span>
                <span className={`${styles.modalTeam} ${styles.modalTeamRight}`}>
                    {game.team2
                        ? <>{game.team2}<Flag code={game.team2} compId={1} className={styles.modalFlag} /></>
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
                                    {game.team1 && <><Flag code={game.team1} compId={1} className={styles.modalFlag} />{game.team1}</>}
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
                                    {game.team2 && <>{game.team2}<Flag code={game.team2} compId={1} className={styles.modalFlag} /></>}
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
                                {grp.members.map(m => {
                                    const livePts = isLsLive(game) && game.status !== 'finished'
                                        ? calcLivePoints(m.tip1, m.tip2, game)
                                        : null;
                                    return (
                                    <tr key={m.user_id} className={m.is_me ? styles.tipsMe : ''}>
                                        <td className={styles.tipsUser}>{m.username}{m.is_me && ' (ja)'}</td>
                                        <td className={styles.tipsTip}>
                                            {m.tip1 != null
                                                ? <span className={styles.tipVal}>{m.tip1}:{m.tip2}</span>
                                                : <span className={styles.tipNone}>—</span>}
                                        </td>
                                        <td className={styles.tipsPts}>
                                            {livePts != null
                                                ? <span className={`${styles.gamePts} ${styles.ptsLive}`}>+{livePts}b</span>
                                                : m.points != null && (
                                                    <span className={`${styles.gamePts} ${m.points >= 3 ? styles.ptsGood : m.points > 0 ? styles.ptsMed : styles.ptsBad}`}>
                                                        +{m.points}b
                                                    </span>
                                                )}
                                        </td>
                                    </tr>
                                    );
                                })}
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
    const live      = !finished && new Date(game.starts_at).getTime() <= Date.now();
    const scheduled = !finished && !live;
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
                {live
                ? <span className={styles.liveBadge}>LIVE</span>
                : <span className={styles.gameTime}>{timeStr}</span>
            }
            </div>
            <div className={styles.gameRow}>
                <div className={styles.gameTeam}>
                    {game.team1
                        ? <><Flag code={game.team1} compId={1} className={styles.gameFlag} /><span>{game.team1}</span></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
                <div className={styles.gameScore}>
                    {finished || live
                        ? <><span>{game.score1}</span><span className={styles.scoreSep}>:</span><span>{game.score2}</span></>
                        : <span className={styles.vs}>vs</span>}
                </div>
                <div className={`${styles.gameTeam} ${styles.gameTeamRight}`}>
                    {game.team2
                        ? <><span>{game.team2}</span><Flag code={game.team2} compId={1} className={styles.gameFlag} /></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
            </div>

            {isLsLive(game) && game.status !== 'finished' && (
                <div className={styles.liveBar}>
                    <span className={styles.lsBadge}>LIVE</span>
                    <span className={styles.liveScore}>
                        {game.ls_score1}:{game.ls_score2}
                        {game.ls_final1 != null && <span className={styles.lsOT}> pp</span>}
                    </span>
                    <span className={styles.lsTime}>{formatLsAge(game.ls_updated_at)}</span>
                </div>
            )}

            {game.tip1 != null
                ? (
                    <div className={styles.gameTip}>
                        <span className={styles.tipCheck}>✓</span> Môj tip: {game.tip1}:{game.tip2}
                        {game.points != null && (
                            <span className={`${styles.gamePts} ${
                                isLsLive(game) && game.status !== 'finished'
                                    ? styles.ptsLive
                                    : game.points >= 3 ? styles.ptsGood : game.points > 0 ? styles.ptsMed : styles.ptsBad
                            }`}>
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
    const [games, setGames]             = useState([]);
    const [standings, setStandings]     = useState([]);
    const [announcement, setAnnouncement] = useState(undefined);
    const [announcementsHistory, setAnnouncementsHistory] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [tipGame, setTipGame]             = useState(null);
    const [groupTipsGame, setGroupTipsGame] = useState(null);

    useEffect(() => {
        Promise.all([
            getGames(),
            apiFetch('v1/standings?competition_id=1'),
            apiFetch('v1/announcement').catch(() => null),
            apiFetch('v1/announcements').catch(() => []),
        ])
            .then(([g, s, a, ah]) => { setGames(g); setStandings(s); setAnnouncement(a); setAnnouncementsHistory(ah); })
            .catch(() => {})
            .finally(() => setLoading(false));
        const iv = setInterval(() => {
            getGames().then(g => setGames(g)).catch(() => {});
        }, 30000);
        return () => clearInterval(iv);
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

    const todayStr    = new Date().toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const untipped = games.filter(g => {
        if (g.status !== 'scheduled') return false;
        if (!g.team1 || !g.team2) return false;
        if (g.tip1 != null) return false;
        const start = new Date(g.starts_at);
        if (start.getTime() - now < 5 * 60000) return false;
        const dayStr = start.toLocaleDateString('sk-SK', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return dayStr === todayStr || dayStr === tomorrowStr;
    });

    return (
        <div className={styles.wrap}>
            {tipGame      && <TipModal      game={tipGame}      onClose={handleClose} onSaved={handleTipSaved} />}
            {groupTipsGame && <GameTipsModal game={groupTipsGame} onClose={handleClose} />}

            {announcement && (
                <div className={styles.announcement}>
                    <div className={styles.announcementHead}>
                        <span className={styles.announcementLabel}>Správa organizátora</span>
                        <span className={styles.announcementDate}>
                            {new Date(announcement.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                    </div>
                    <div className={styles.announcementBody}>{announcement.body}</div>
                </div>
            )}

            {untipped.length > 0 && (
                <section className={`${styles.section} ${styles.untippedSection}`}>
                    <div className={`${styles.sectionHeader} ${styles.sHUntipped}`}>
                        <span>Nenatipované zápasy</span>
                        <Link to="/games" className={styles.more}>Všetky →</Link>
                    </div>
                    {untipped.map(g => (
                        <GameCard key={g.id} game={g}
                            onTipClick={() => setTipGame(g)}
                            onGroupTipsClick={() => setGroupTipsGame(g)} />
                    ))}
                </section>
            )}

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
                        : standings.map(g => <StandingsCard key={g.id} group={g} currentUserId={user?.user_id} />)
                    }
                </section>

            </div>

            {announcementsHistory.filter(a => !a.is_active).length > 0 && (
                <section className={`${styles.section} ${styles.historySection}`}>
                    <div className={`${styles.sectionHeader} ${styles.sHHistory}`}>
                        <span>História správ organizátora</span>
                    </div>
                    {announcementsHistory.filter(a => !a.is_active).map(a => (
                        <div key={a.id} className={`${styles.announcement} ${!a.is_active ? styles.announcementOld : ''}`}>
                            <div className={styles.announcementHead}>
                                <span className={styles.announcementLabel}>
                                    {'Archív'}
                                </span>
                                <span className={styles.announcementDate}>
                                    {new Date(a.created_at).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            </div>
                            <div className={styles.announcementBody}>{a.body}</div>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
