import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getGames } from '../../api/games';
import { saveTip, getGameTips } from '../../api/tips';
import GroupStandings from './GroupStandings';
import PhaseFilter from '../../components/PhaseFilter';
import usePhases from '../../hooks/usePhases';
import { useCompetition } from '../../context/CompetitionContext';
import { useTeamNames } from '../../components/Flag';
import styles from './Games.module.css';

const FLAG_URL = (code) => `/flags/team_flag_${code?.toLowerCase()}.png`;
const isLsLive = (g) => g.ls_score1 != null && g.ls_status && g.ls_status !== 'FT';
const formatLsAge = (ts) => {
    if (!ts) return '';
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    return m < 1 ? 'práve teraz' : `pred ${m} min`;
};
const calcLivePoints = (t1, t2, g) => {
    const s1 = g.ls_final1 != null ? +g.ls_final1 : (g.ls_score1 != null ? +g.ls_score1 : null);
    const s2 = g.ls_final2 != null ? +g.ls_final2 : (g.ls_score2 != null ? +g.ls_score2 : null);
    if (s1 == null || s2 == null || t1 == null || t2 == null) return null;
    const n1 = +t1, n2 = +t2;
    // Vyraďovacia časť má vyššie bodovanie; pozná sa podľa farby z číselníka.
    const isPlayoff = g.phase_color && g.phase_color !== 'GROUP';
    const winPts = isPlayoff ? 5 : 3;
    const rw = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
    const tw = n1 > n2 ? 1 : n1 < n2 ? -1 : 0;
    return (tw === rw ? winPts : 0) + (n1 === s1 ? 1 : 0) + (n2 === s2 ? 1 : 0);
};
const dayKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function TeamBlock({ code, score, isLeft }) {
    const names = useTeamNames(1);
    const fullName = code ? (names[code.toUpperCase()] || '') : '';
    return (
        <div className={`${styles.team} ${isLeft ? styles.teamLeft : styles.teamRight}`}>
            {code
                ? <>
                    <img className={styles.flag} src={FLAG_URL(code)} alt={code} onError={e => e.target.style.display='none'} />
                    <span className={styles.teamCodeWrap}>
                        <span className={styles.teamCode}>{code}</span>
                        {fullName && <span className={styles.teamName}>{fullName}</span>}
                    </span>
                  </>
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

    const canTip = game.status === 'scheduled' && game.team1 && game.team2 && new Date() < new Date(new Date(game.starts_at).getTime() - 5 * 60000);

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
        if (game.tip1 != null) return (
            <div className={styles.tipDone}>
                {game.tip1}:{game.tip2}
                {game.points != null && (
                    <span className={game.status === 'finished' ? styles.pts : styles.ptsLive}>+{game.points}b</span>
                )}
            </div>
        );
        if (!game.team1 || !game.team2) return null;
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

function GroupTips({ gameId, game }) {
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
                                    {g.members.map(m => {
                                        const livePts = isLsLive(game) && game.status !== 'finished'
                                            ? calcLivePoints(m.tip1, m.tip2, game)
                                            : null;
                                        return (
                                        <tr key={m.user_id} className={m.is_me ? styles.tipsTableMe : ''}>
                                            <td>{m.username}{m.is_me ? ' (ty)' : ''}</td>
                                            <td>
                                                {m.tip1 != null
                                                    ? <span className={styles.tipScore2}>{m.tip1}:{m.tip2}</span>
                                                    : <span className={styles.tipNoTip}>—</span>}
                                            </td>
                                            <td>
                                                {livePts != null
                                                    ? <span className={styles.tipPtsLive}>+{livePts}b</span>
                                                    : m.points != null && <span className={styles.tipPts}>+{m.points}b</span>}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

export default function Games() {
    const { activeCompetition } = useCompetition();
    const competitionId = activeCompetition?.id;
    const { sediFaze } = usePhases(competitionId);
    const navigate = useNavigate();
    const location = useLocation();
    const [games, setGames]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [phase, setPhase]               = useState('all');
    const [selectedDay, setSelectedDay]   = useState(() => dayKey(new Date().toISOString()));
    const [selectedTeam, setSelectedTeam] = useState(location.state?.team ?? null);
    const [view, setView]                 = useState('games');
    const [showUntipped, setShowUntipped] = useState(false);
    const calContainer = useRef(null);
    const todayCalBtn  = useRef(null);

    useEffect(() => {
        const load = (initial) => getGames()
            .then(data => {
                setGames(data);
                if (initial) {
                    setLoading(false);
                    // Po otvorení sa predvolí prebiehajúce alebo najbližšie
                    // vyraďovacie kolo — v skupinovej fáze zostáva „všetko".
                    const jePlayoff = g => g.phase_color && g.phase_color !== 'GROUP';
                    const live = data.find(g => g.status === 'live');
                    if (live && jePlayoff(live)) { setPhase(live.match_stat_code); return; }
                    const now = Date.now();
                    const next = data.find(g => g.status === 'scheduled' && new Date(g.starts_at).getTime() > now);
                    if (next && jePlayoff(next)) setPhase(next.match_stat_code);
                }
            })
            .catch(e => { if (initial) { setError(e.message || 'Chyba API'); setLoading(false); } });
        load(true);
        const iv = setInterval(() => load(false), 30000);
        return () => clearInterval(iv);
    }, []);

    // Auto-scroll calendar to today
    useEffect(() => {
        if (!todayCalBtn.current || !calContainer.current) return;
        const c = calContainer.current;
        const b = todayCalBtn.current;
        c.scrollLeft = b.offsetLeft - c.offsetWidth / 2 + b.offsetWidth / 2;
    }, [games]);

    const handleSaved = useCallback((gameId, t1, t2) => {
        setGames(prev => prev.map(g => g.id === gameId ? { ...g, tip1: t1, tip2: t2 } : g));
    }, []);

    const todayK  = dayKey(new Date().toISOString());
    const allDays = [...new Set(games.map(g => dayKey(g.starts_at)))].sort();
    const allTeams = [...new Set(games.flatMap(g => [g.team1, g.team2]).filter(Boolean))].sort();

    const now2 = Date.now();
    const filtered = games
        .filter(g => phase === 'all' || sediFaze(g.match_stat_code, phase))
        .filter(g => !selectedDay  || dayKey(g.starts_at) === selectedDay)
        .filter(g => !selectedTeam || g.team1 === selectedTeam || g.team2 === selectedTeam)
        .filter(g => !showUntipped || (
            g.status === 'scheduled' && g.team1 && g.team2 &&
            g.tip1 == null && new Date(g.starts_at).getTime() - now2 > 5 * 60000
        ))
        .slice().sort((a, b) => a.game_number - b.game_number);

    const byDate = {};
    filtered.forEach(g => {
        const dk = new Date(g.starts_at).toLocaleDateString('sk-SK', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        if (!byDate[dk]) byDate[dk] = [];
        byDate[dk].push(g);
    });

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;
    if (error)   return <div className={styles.wrap}><p style={{color:'red'}}>Chyba: {error}</p></div>;

    return (
        <div className={styles.wrap}>
            {/* Fázy + Tabuľky toggle */}
            <div className={styles.topBar}>
                <div className={styles.filters}>
                    <PhaseFilter
                        competitionId={competitionId}
                        hodnota={phase === 'all' ? '' : phase}
                        onZmena={kod => { setPhase(kod === '' ? 'all' : kod); setView('games'); }}
                        prefix={
                            <button
                                className={showUntipped ? styles.untippedBtnOn : styles.untippedBtn}
                                onClick={() => setShowUntipped(v => !v)}
                                title="Nenatipované zápasy"
                            >1<span style={{fontSize:'0.7em',verticalAlign:'middle'}}>x</span>2</button>
                        }
                        koniec={
                            <button
                                className={`${styles.btnTabulky} ${styles.btnTabulkyInline}`}
                                onClick={() => navigate('/tabulky')}
                            >
                                TAB
                            </button>
                        }
                    />
                </div>
            </div>

            {view === 'standings' ? (
                <GroupStandings onTeamClick={(team) => {
                    setSelectedTeam(team);
                    setPhase('all');
                    setView('games');
                }} />
            ) : (
                <>
                    {/* Kalendár */}
                    <div className={styles.calRow} ref={calContainer}>
                        {allDays.map(dk => {
                            const d       = new Date(dk + 'T12:00:00');
                            const isToday  = dk === todayK;
                            const isActive = dk === selectedDay;
                            return (
                                <button
                                    key={dk}
                                    ref={isToday ? todayCalBtn : null}
                                    className={`${styles.calDay} ${isToday ? styles.calDayToday : ''} ${isActive ? styles.calDayActive : ''}`}
                                    onClick={() => setSelectedDay(selectedDay === dk ? null : dk)}
                                >
                                    <span className={styles.calDayWeekday}>
                                        {d.toLocaleDateString('sk-SK', { weekday: 'short' })}
                                    </span>
                                    <span className={styles.calDayNum}>{d.getDate()}</span>
                                    <span className={styles.calDayMonth}>{d.getMonth() + 1}.</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Vlajky tímov */}
                    {allTeams.length > 0 && (
                        <div className={styles.flagsRow}>
                            {allTeams.map(team => (
                                <button
                                    key={team}
                                    className={`${styles.flagBtn} ${selectedTeam === team ? styles.flagBtnActive : ''}`}
                                    onClick={() => setSelectedTeam(selectedTeam === team ? null : team)}
                                >
                                    <img className={styles.flagImg} src={FLAG_URL(team)} alt={team}
                                        onError={e => e.target.style.display='none'} />
                                    <span className={styles.flagCode}>{team}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Zápasy */}
                    {Object.entries(byDate).map(([date, dayGames]) => (
                        <div key={date} className={styles.dayGroup}>
                            <div className={styles.dayHeader}>{date}</div>
                            {dayGames.map(g => {
                                const now = Date.now();
                                const es  = g.status === 'finished' ? 'finished'
                                          : new Date(g.starts_at).getTime() <= now ? 'live'
                                          : 'scheduled';
                                return (
                                    <div key={g.id} className={`${styles.card} ${es === 'finished' ? styles.cardFinished : es === 'live' ? styles.cardLive : ''}`}>
                                        <div className={styles.cardTop}>
                                            <span className={styles.phase}>{g.match_stat_desc || g.phase} • Zápas {g.game_number}</span>
                                            <span className={styles.time}>{new Date(g.starts_at).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className={styles.matchRow}>
                                            <TeamBlock code={g.team1} isLeft />
                                            <div className={styles.vs}>
                                                {es === 'live'
                                                    ? <span className={styles.live}>LIVE</span>
                                                    : es === 'finished' && g.score1 != null
                                                        ? <span className={styles.result}>
                                                            {g.final1 != null
                                                                ? <>{g.final1}:{g.final2}<span className={styles.resultOT}> pp</span></>
                                                                : <>{g.score1}:{g.score2}</>}
                                                          </span>
                                                        : 'vs'}
                                            </div>
                                            <TeamBlock code={g.team2} />
                                        </div>
                                        <div className={styles.venue}>
                                            {g.venue}
                                            {g.flashscore_url && (
                                                <a href={g.flashscore_url} target="_blank" rel="noopener noreferrer" className={styles.fsLink} title="Sledovať na FlashScore">
                                                    <img src="/flashscore.png" alt="FlashScore" className={styles.fsIcon} />
                                                </a>
                                            )}
                                        </div>
                                        {isLsLive(g) && g.status !== 'finished' && (
                                            <div className={styles.liveBar}>
                                                <span className={styles.lsBadge}>LIVE</span>
                                                <span className={styles.liveScore}>
                                                    {g.ls_score1}:{g.ls_score2}
                                                    {g.ls_final1 != null && <span className={styles.lsOT}> pp</span>}
                                                </span>
                                                <span className={styles.lsTime}>{formatLsAge(g.ls_updated_at)}</span>
                                            </div>
                                        )}
                                        <TipInput game={g} onSaved={handleSaved} />
                                        {es !== 'scheduled' && <GroupTips gameId={g.id} game={g} />}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy</p>}
                </>
            )}
        </div>
    );
}
