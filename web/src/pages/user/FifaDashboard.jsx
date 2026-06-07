import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFifaGames, saveFifaTip, getFifaGameTips } from '../../api/fifaGames';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;
const PLAYOFF_CODES = ['R32','R16','QF','SF','BM','F'];
const calcLiveFifaPoints = (tip1, tip2, game) => {
    const s1 = game.home_score_regular != null ? game.home_score_regular : game.ls_home;
    const s2 = game.away_score_regular != null ? game.away_score_regular : game.ls_away;
    if (s1 == null || s2 == null || tip1 == null || tip2 == null) return null;
    const winPts = PLAYOFF_CODES.includes(game.game_type_code) ? 5 : 3;
    const rw = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
    const tw = tip1 > tip2 ? 1 : tip1 < tip2 ? -1 : 0;
    return (tw === rw ? winPts : 0) + (tip1 === s1 ? 1 : 0) + (tip2 === s2 ? 1 : 0);
};

const PHASE_LABEL = {
    GROUP_A:'Sk. A', GROUP_B:'Sk. B', GROUP_C:'Sk. C', GROUP_D:'Sk. D',
    GROUP_E:'Sk. E', GROUP_F:'Sk. F', GROUP_G:'Sk. G', GROUP_H:'Sk. H',
    GROUP_I:'Sk. I', GROUP_J:'Sk. J', GROUP_K:'Sk. K', GROUP_L:'Sk. L',
    R32:'R32', R16:'R16', QF:'ŠF', SF:'SF', BM:'Bronz', F:'Finále',
};

const canTipGame = (game) => {
    if (!game.tips_open || !game.home_code || !game.away_code) return false;
    const start = new Date(game.start_time + 'Z');
    return new Date() < new Date(start.getTime() - 5 * 60000);
};

function TipModal({ game, onClose, onSaved }) {
    const [v1, setV1]       = useState(game.home_score_tip != null ? String(game.home_score_tip) : '');
    const [v2, setV2]       = useState(game.away_score_tip != null ? String(game.away_score_tip) : '');
    const [saving, setSaving] = useState(false);
    const [err, setErr]     = useState('');
    const [done, setDone]   = useState(false);

    const dateStr = new Date(game.start_time + 'Z').toLocaleString('sk-SK',
        { weekday:'short', day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' });

    const save = async () => {
        if (v1 === '' || v2 === '') { setErr('Zadaj oba skóre'); return; }
        setSaving(true); setErr('');
        try {
            await saveFifaTip(game.game_id, parseInt(v1), parseInt(v2));
            setDone(true);
            onSaved(game.game_id, parseInt(v1), parseInt(v2));
            setTimeout(onClose, 800);
        } catch (e) { setErr(e.message); setSaving(false); }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>
                <div className={styles.modalHeader}>
                    <span className={styles.modalPhase}>{PHASE_LABEL[game.game_type_code] ?? game.game_type_code}</span>
                    <div className={styles.modalTeams}>
                        <span className={styles.modalTeam}>
                            <img src={FLAG_URL(game.home_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />{game.home_code}
                        </span>
                        <span className={styles.modalScore}>vs</span>
                        <span className={`${styles.modalTeam} ${styles.modalTeamRight}`}>
                            {game.away_code}<img src={FLAG_URL(game.away_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />
                        </span>
                    </div>
                </div>
                <div className={styles.modalBody}>
                    <p className={styles.tipModalDate}>{dateStr} · {game.venue}</p>
                    {done
                        ? <p className={styles.tipModalOk}>✓ Tip uložený</p>
                        : (
                            <div className={styles.tipModalForm}>
                                <div className={styles.tipModalInputs}>
                                    <div className={styles.tipTeamLabel}>
                                        <img src={FLAG_URL(game.home_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />{game.home_code}
                                    </div>
                                    <input type="number" min="0" max="20" value={v1} onChange={e => setV1(e.target.value)} className={styles.tipInput} inputMode="numeric" />
                                    <span className={styles.tipSep}>:</span>
                                    <input type="number" min="0" max="20" value={v2} onChange={e => setV2(e.target.value)} className={styles.tipInput} inputMode="numeric" />
                                    <div className={`${styles.tipTeamLabel} ${styles.tipTeamRight}`}>
                                        {game.away_code}<img src={FLAG_URL(game.away_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />
                                    </div>
                                </div>
                                {err && <p className={styles.tipModalErr}>{err}</p>}
                                <button className={styles.tipModalBtn} onClick={save} disabled={saving}>
                                    {saving ? '…' : (game.home_score_tip != null ? 'Zmeniť tip' : 'Uložiť tip')}
                                </button>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}

function GameTipsModal({ game, onClose }) {
    const [groups, setGroups] = useState(null);
    const [err, setErr]       = useState('');
    const isLive = !game.result_approved && (game.ls_home != null || game.home_score_regular != null);

    useEffect(() => {
        getFifaGameTips(game.game_id).then(setGroups).catch(e => setErr(e.message));
    }, [game.game_id]);

    const finished = game.result_approved;
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>
                <div className={styles.modalHeader}>
                    <span className={styles.modalPhase}>{PHASE_LABEL[game.game_type_code] ?? game.game_type_code}</span>
                    <div className={styles.modalTeams}>
                        <span className={styles.modalTeam}>
                            <img src={FLAG_URL(game.home_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />{game.home_code}
                        </span>
                        <span className={styles.modalScore}>
                            {isLive ? `${game.ls_home}:${game.ls_away}`
                                : finished && game.home_score_regular != null ? `${game.home_score_regular}:${game.away_score_regular}` : 'vs'}
                        </span>
                        <span className={`${styles.modalTeam} ${styles.modalTeamRight}`}>
                            {game.away_code}<img src={FLAG_URL(game.away_code)} className={styles.modalFlag} alt="" onError={e => e.target.style.display='none'} />
                        </span>
                    </div>
                </div>
                <div className={styles.modalBody}>
                    {isLive && <p style={{textAlign:'center', color:'#dc3545', fontWeight:700, margin:'0 0 10px'}}>● LIVE — priebežné body</p>}
                    {err && <p className={styles.modalErr}>{err}</p>}
                    {!groups && !err && <p className={styles.modalLoading}>Načítavam…</p>}
                    {groups && groups.map(grp => (
                        <div key={grp.group_id} className={styles.tipsGroup}>
                            <div className={styles.tipsGroupName}>{grp.group_name}</div>
                            <table className={styles.tipsTable}>
                                <tbody>
                                    {grp.members.map(m => {
                                        const livePts = isLive ? calcLiveFifaPoints(m.tip1, m.tip2, game) : null;
                                        return (
                                            <tr key={m.user_id} className={m.is_me ? styles.tipsMe : ''}>
                                                <td className={styles.tipsUser}>{m.username}{m.is_me && ' (ja)'}</td>
                                                <td className={styles.tipsTip}>{m.tip1 != null ? <span className={styles.tipVal}>{m.tip1}:{m.tip2}</span> : <span className={styles.tipNone}>—</span>}</td>
                                                <td className={styles.tipsPts}>{livePts != null
                                                    ? <span className={`${styles.gamePts} ${styles.ptsLive}`}>+{livePts}b</span>
                                                    : m.points != null && <span className={`${styles.gamePts} ${m.points >= 3 ? styles.ptsGood : m.points > 0 ? styles.ptsMed : styles.ptsBad}`}>+{m.points}b</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function GameCard({ game, onTipClick, onShowTips }) {
    const start    = new Date(game.start_time + 'Z');
    const finished = game.result_approved;
    const live     = !finished && start <= new Date();
    const timeStr  = start.toLocaleString('sk-SK', { day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' });
    const canTip   = canTipGame(game);
    const started  = live || finished;
    const onClick  = canTip ? () => onTipClick(game) : started ? () => onShowTips(game) : undefined;

    return (
        <div className={`${styles.gameCard} ${finished ? styles.finished : live ? styles.live : ''} ${onClick ? styles.clickable : ''}`}
            onClick={onClick}>
            <div className={styles.gameCardTop}>
                <span className={styles.gamePhase}>{PHASE_LABEL[game.game_type_code] ?? game.game_type_code}</span>
                {live
                    ? <span className={styles.liveBadge}>LIVE</span>
                    : <span className={styles.gameTime}>{timeStr}</span>}
            </div>
            <div className={styles.gameRow}>
                <div className={styles.gameTeam}>
                    {game.home_code
                        ? <><img src={FLAG_URL(game.home_code)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /><span>{game.home_code}</span></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
                <div className={styles.gameScore}>
                    {finished && game.home_score_regular != null
                        ? <><span>{game.home_score_regular}</span><span className={styles.scoreSep}>:</span><span>{game.away_score_regular}</span></>
                        : live && game.ls_home != null
                            ? <span style={{color:'#dc3545'}}>{game.ls_home}<span className={styles.scoreSep}>:</span>{game.ls_away}</span>
                        : live ? <span className={styles.vs}>LIVE</span>
                        : <span className={styles.vs}>vs</span>}
                </div>
                <div className={`${styles.gameTeam} ${styles.gameTeamRight}`}>
                    {game.away_code
                        ? <><span>{game.away_code}</span><img src={FLAG_URL(game.away_code)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
            </div>
            {finished && game.home_score_final != null && (
                <div style={{textAlign:'center', fontSize:'0.72rem', color:'#888', marginTop:2}}>
                    po predĺžení/penaltách: {game.home_score_final}:{game.away_score_final}
                </div>
            )}
            {game.home_score_tip != null && (
                <div className={styles.gameTip}>
                    <span className={styles.tipCheck}>✓</span> Môj tip: {game.home_score_tip}:{game.away_score_tip}
                    {game.points_earned != null && (
                        <span className={`${styles.gamePts} ${game.points_earned >= 3 ? styles.ptsGood : game.points_earned > 0 ? styles.ptsMed : styles.ptsBad}`}>
                            +{game.points_earned}b
                        </span>
                    )}
                </div>
            )}
            {game.home_score_tip == null && canTip && (
                <div className={`${styles.gameTip} ${styles.tipMissing}`}>⚠ Bez tipu — klikni pre tip</div>
            )}
            {started && <div className={styles.tapHint}>Klikni pre tipy skupín</div>}
        </div>
    );
}

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

export default function FifaDashboard() {
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? 2;
    const [games, setGames]           = useState([]);
    const [standings, setStandings]   = useState([]);
    const [announcement, setAnnouncement] = useState(null);
    const [loading, setLoading]       = useState(true);
    const [tipGame, setTipGame]       = useState(null);
    const [tipsGame, setTipsGame]     = useState(null);

    useEffect(() => {
        Promise.all([
            getFifaGames(),
            apiFetch(`v1/standings?competition_id=${compId}`).catch(() => []),
            apiFetch('v1/announcement').catch(() => null),
        ])
            .then(([g, s, a]) => { setGames(g); setStandings(s); setAnnouncement(a); })
            .catch(() => {})
            .finally(() => setLoading(false));

        // Auto-refresh zápasov každých 30s (live skóre, body)
        const iv = setInterval(() => {
            getFifaGames().then(setGames).catch(() => {});
        }, 30000);
        return () => clearInterval(iv);
    }, []);

    const handleTipSaved = useCallback((gameId, h, a) => {
        setGames(prev => prev.map(g => g.game_id === gameId ? { ...g, home_score_tip: h, away_score_tip: a } : g));
    }, []);

    if (loading) return <p className={styles.loading}>Načítavam…</p>;

    const now       = Date.now();
    const todayStr  = new Date().toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });
    const tomorrowStr = new Date(now + 86400000).toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });

    const finished = games.filter(g => g.result_approved).slice(-4).reverse();
    const live     = games.filter(g => !g.result_approved && new Date(g.start_time + 'Z') <= new Date());
    const upcoming = [
        ...live,
        ...games.filter(g => !g.result_approved && new Date(g.start_time + 'Z') > new Date()).slice(0, 4),
    ];
    const untipped = games.filter(g => {
        if (g.result_approved || !g.tips_open || !g.home_code || !g.away_code) return false;
        if (g.home_score_tip != null) return false;
        const start = new Date(g.start_time + 'Z');
        if (start.getTime() - now < 5 * 60000) return false;
        const dayStr = start.toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });
        return dayStr === todayStr || dayStr === tomorrowStr;
    });

    return (
        <div className={styles.wrap}>
            {tipGame && <TipModal game={tipGame} onClose={() => setTipGame(null)} onSaved={handleTipSaved} />}
            {tipsGame && <GameTipsModal game={tipsGame} onClose={() => setTipsGame(null)} />}
            {announcement && (
                <div className={styles.announcement}>
                    <div className={styles.announcementHead}>
                        <span className={styles.announcementLabel}>Správa organizátora</span>
                        <span className={styles.announcementDate}>
                            {new Date(announcement.created_at).toLocaleDateString('sk-SK', { day:'2-digit', month:'2-digit', year:'numeric' })}
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
                    {untipped.map(g => <GameCard key={g.game_id} game={g} onTipClick={setTipGame} onShowTips={setTipsGame} />)}
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
                            {upcoming.map(g => <GameCard key={g.game_id} game={g} onTipClick={setTipGame} onShowTips={setTipsGame} />)}
                        </>
                    )}
                    {finished.length > 0 && (
                        <>
                            <div className={`${styles.sectionHeader} ${styles.sHFinished}`}>
                                <span>Posledné výsledky</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {finished.map(g => <GameCard key={g.game_id} game={g} onTipClick={setTipGame} onShowTips={setTipsGame} />)}
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
        </div>
    );
}
