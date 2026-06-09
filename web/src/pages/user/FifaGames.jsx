import { useState, useEffect, useCallback, useRef } from 'react';
import { getFifaGames, saveFifaTip, getFifaGameTips } from '../../api/fifaGames';
import FifaGroupStandings from './FifaGroupStandings';
import { useTeamNames } from '../../components/Flag';
import styles from './Games.module.css';

const PLAYOFF_CODES = ['R32','R16','QF','SF','BM','F'];
// Živé body podľa aktuálneho livescore (group 3+1+1, playoff 5+1+1)
const calcLiveFifaPoints = (tip1, tip2, game) => {
    // Zmrazený 90-min základ má prednosť (počas predĺženia), inak aktuálne živé skóre
    const s1 = game.home_score_regular != null ? game.home_score_regular : game.ls_home;
    const s2 = game.away_score_regular != null ? game.away_score_regular : game.ls_away;
    if (s1 == null || s2 == null || tip1 == null || tip2 == null) return null;
    const isPlayoff = PLAYOFF_CODES.includes(game.game_type_code);
    const winPts = isPlayoff ? 5 : 3;
    const rw = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
    const tw = tip1 > tip2 ? 1 : tip1 < tip2 ? -1 : 0;
    return (tw === rw ? winPts : 0) + (tip1 === s1 ? 1 : 0) + (tip2 === s2 ? 1 : 0);
};

function GroupTips({ game }) {
    const [open, setOpen]       = useState(false);
    const [groups, setGroups]   = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr]         = useState('');

    const isLive = !game.result_approved && (game.ls_home != null || game.home_score_regular != null);

    const toggle = async () => {
        if (!open && groups === null) {
            setLoading(true);
            try { setGroups(await getFifaGameTips(game.game_id)); }
            catch (e) {
                if (e.message?.includes('začiatku')) { setGroups([]); setErr('Tipy budú viditeľné po začiatku zápasu.'); }
                else setErr(e.message);
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
                    {err && <div className={styles.tipsErr}>{err}</div>}
                    {groups && groups.length === 0 && !err && <div className={styles.tipsLoading}>Nie si v žiadnej skupine</div>}
                    {groups && groups.map(grp => (
                        <div key={grp.group_id} className={styles.groupSection}>
                            <div className={styles.groupName}>{grp.group_name}</div>
                            <table className={styles.tipsTable}>
                                <tbody>
                                    {grp.members.map(m => {
                                        const livePts = isLive ? calcLiveFifaPoints(m.tip1, m.tip2, game) : null;
                                        return (
                                            <tr key={m.user_id} className={m.is_me ? styles.tipsTableMe : ''}>
                                                <td>{m.username}{m.is_me ? ' (ty)' : ''}</td>
                                                <td>{m.tip1 != null ? <span className={styles.tipScore2}>{m.tip1}:{m.tip2}</span> : <span className={styles.tipNoTip}>—</span>}</td>
                                                <td>{livePts != null
                                                    ? <span className={styles.tipPtsLive}>+{livePts}b</span>
                                                    : m.points != null && <span className={styles.tipPts}>+{m.points}b</span>}</td>
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

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const PHASE_LABEL = {
    GROUP_A:'Skupina A', GROUP_B:'Skupina B', GROUP_C:'Skupina C', GROUP_D:'Skupina D',
    GROUP_E:'Skupina E', GROUP_F:'Skupina F', GROUP_G:'Skupina G', GROUP_H:'Skupina H',
    GROUP_I:'Skupina I', GROUP_J:'Skupina J', GROUP_K:'Skupina K', GROUP_L:'Skupina L',
    R32:'Round of 32', R16:'Round of 16', QF:'Štvrťfinále', SF:'Semifinále', BM:'O bronz', F:'Finále',
};
const KNOCKOUT = ['R32','R16','QF','SF','BM','F'];
const FLAG_URL  = (code) => `/flags/fifa_flag_${code?.toLowerCase()}.png`;
const dayKey    = (iso)  => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function TeamBlock({ code, isLeft }) {
    const names = useTeamNames(2);
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
                : <span className={styles.teamCode} style={{color:'#bbb'}}>TBD</span>
            }
        </div>
    );
}

function TipInput({ game, onSaved }) {
    const [v1, setV1]         = useState(game.home_score_tip != null ? String(game.home_score_tip) : '');
    const [v2, setV2]         = useState(game.away_score_tip != null ? String(game.away_score_tip) : '');
    const [saving, setSaving] = useState(false);
    const [err, setErr]       = useState('');

    const start  = new Date(game.start_time + 'Z');
    const canTip = game.tips_open && game.home_code && game.away_code
                   && new Date() < new Date(start.getTime() - 5 * 60000);

    const save = async () => {
        if (v1 === '' || v2 === '') { setErr('Zadaj oba skóre'); return; }
        setSaving(true); setErr('');
        try {
            await saveFifaTip(game.game_id, parseInt(v1), parseInt(v2));
            onSaved(game.game_id, parseInt(v1), parseInt(v2));
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    if (!canTip) {
        if (game.home_score_tip != null) return (
            <div className={styles.tipDone}>
                {game.home_score_tip}:{game.away_score_tip}
                {game.points_earned != null && <span className={styles.pts}>+{game.points_earned}b</span>}
            </div>
        );
        if (!game.home_code || !game.away_code) return null;
        if (new Date() < start) return <div className={styles.tipClosed}>Uzavreté</div>;
        return null;
    }

    return (
        <div className={styles.tipForm}>
            <input type="number" min="0" max="20" value={v1} onChange={e => setV1(e.target.value)} className={styles.tipScore} />
            <span>:</span>
            <input type="number" min="0" max="20" value={v2} onChange={e => setV2(e.target.value)} className={styles.tipScore} />
            <button onClick={save} disabled={saving} className={styles.btnTip}>
                {saving ? '…' : (game.home_score_tip != null ? 'Zmeniť' : 'Tipovať')}
            </button>
            {err && <span className={styles.tipErr}>{err}</span>}
        </div>
    );
}

export default function FifaGames() {
    const [games, setGames]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [phase, setPhase]               = useState('all');  // 'all'|'GRP'|'R32'|...
    const [groupFilter, setGroupFilter]   = useState(null);   // 'A'-'L' or null
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [selectedDay, setSelectedDay]   = useState(null);
    const [showUntipped, setShowUntipped] = useState(false);
    const [view, setView]                 = useState('games'); // 'games'|'standings'
    const calContainer = useRef(null);

    useEffect(() => {
        getFifaGames()
            .then(data => {
                setGames(data);
                // Default kolo podľa dátumu: aktuálne kolo; pred/po turnaji → ALL
                const sorted = [...data].sort((a, b) => new Date(a.start_time + 'Z') - new Date(b.start_time + 'Z'));
                const firstStart = sorted.length ? new Date(sorted[0].start_time + 'Z') : null;
                const nextUnfinished = sorted.find(g => !g.result_approved);
                if (nextUnfinished && firstStart && new Date() >= firstStart) {
                    const code = nextUnfinished.game_type_code;
                    setPhase(code.startsWith('GROUP_') ? 'GRP' : code);
                }
                setLoading(false);
            })
            .catch(e => { setError(e.message || 'Chyba API'); setLoading(false); });

        // Auto-refresh každých 30s (live skóre, body) — bez resetu filtrov
        const iv = setInterval(() => {
            getFifaGames().then(setGames).catch(() => {});
        }, 30000);
        return () => clearInterval(iv);
    }, []);

    const handleSaved = useCallback((gameId, h, a) => {
        setGames(prev => prev.map(g =>
            g.game_id === gameId ? { ...g, home_score_tip: h, away_score_tip: a } : g
        ));
    }, []);

    // Filtrovanie zápasov
    const now2 = Date.now();
    const filtered = games.filter(g => {
        const code = g.game_type_code;
        if (phase === 'GRP') {
            if (!code.startsWith('GROUP_')) return false;
            if (groupFilter && code !== `GROUP_${groupFilter}`) return false;
        } else if (phase !== 'all') {
            if (code !== phase) return false;
        }
        if (selectedTeam && g.home_code !== selectedTeam && g.away_code !== selectedTeam) return false;
        if (selectedDay && dayKey(g.start_time + 'Z') !== selectedDay) return false;
        if (showUntipped) {
            const s = new Date(g.start_time + 'Z').getTime();
            return g.tips_open && g.home_code && g.away_code && g.home_score_tip == null && s - now2 > 5 * 60000;
        }
        return true;
    });

    // Dni pre kalendár (podľa aktuálneho filtra bez dátumu)
    const calGames = games.filter(g => {
        const code = g.game_type_code;
        if (phase === 'GRP') {
            if (!code.startsWith('GROUP_')) return false;
            if (groupFilter && code !== `GROUP_${groupFilter}`) return false;
        } else if (phase !== 'all') {
            if (code !== phase) return false;
        }
        if (selectedTeam && g.home_code !== selectedTeam && g.away_code !== selectedTeam) return false;
        return true;
    });
    const allDays = [...new Set(calGames.map(g => dayKey(g.start_time + 'Z')))].sort();

    // Vlajky — zobraz tímy podľa kontextu
    const flagTeams = (() => {
        if (phase === 'GRP' && groupFilter) {
            // 4 tímy vybranej skupiny
            return [...new Set(games
                .filter(g => g.game_type_code === `GROUP_${groupFilter}`)
                .flatMap(g => [g.home_code, g.away_code])
                .filter(Boolean))].sort();
        }
        if (phase === 'GRP' || phase === 'all') {
            // Všetky skupinové tímy (48)
            return [...new Set(games
                .filter(g => g.game_type_code.startsWith('GROUP_'))
                .flatMap(g => [g.home_code, g.away_code])
                .filter(Boolean))].sort();
        }
        return [];
    })();

    const byDate = {};
    filtered.forEach(g => {
        const dk = new Date(g.start_time + 'Z').toLocaleDateString('sk-SK', {
            weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'
        });
        if (!byDate[dk]) byDate[dk] = [];
        byDate[dk].push(g);
    });

    const todayK    = dayKey(new Date().toISOString());
    const grpActive = phase === 'GRP' || (phase === 'all' && groupFilter);

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;
    if (error)   return <div className={styles.wrap}><p style={{color:'red'}}>Chyba: {error}</p></div>;

    const pBtnClass = (p) => {
        const color = p === 'F' ? [styles.pGold, styles.pGoldOn]
                    : p === 'BM' ? [styles.pBronze, styles.pBronzeOn]
                    : KNOCKOUT.includes(p) ? [styles.pPlayoff, styles.pPlayoffOn]
                    : [styles.pGroup, styles.pGroupOn];
        const isOn = phase === p;
        return [styles.pBtn, color[0], isOn ? color[1] : ''].join(' ');
    };

    return (
        <div className={styles.wrap}>
            {/* Riadok 1: hlavné filtre */}
            <div className={styles.topBar}>
                <div className={styles.filters}>
                    <button
                        className={showUntipped ? styles.untippedBtnOn : styles.untippedBtn}
                        onClick={() => setShowUntipped(v => !v)}
                        title="Nenatipované"
                    >1<span style={{fontSize:'0.7em',verticalAlign:'middle'}}>x</span>2</button>
                    <button
                        className={[styles.pBtn, styles.pGroup, phase === 'all' && !groupFilter && !selectedTeam ? styles.pGroupOn : ''].join(' ')}
                        onClick={() => { setPhase('all'); setGroupFilter(null); setSelectedTeam(null); setSelectedDay(null); }}
                    >ALL</button>
                    <button
                        className={[styles.pBtn, styles.pGroup, grpActive ? styles.pGroupOn : ''].join(' ')}
                        onClick={() => { setPhase('GRP'); setSelectedTeam(null); setSelectedDay(null); setView('games'); }}
                    >GRP</button>
                    {KNOCKOUT.map(p => (
                        <button key={p} className={pBtnClass(p)}
                            onClick={() => { setPhase(p); setGroupFilter(null); setSelectedTeam(null); setSelectedDay(null); setView('games'); }}
                        >
                            {p === 'BM' ? 'BR' : p}
                        </button>
                    ))}
                    <button
                        className={`${view === 'standings' ? styles.btnTabulkyActive : styles.btnTabulky} ${styles.btnTabulkyInline}`}
                        onClick={() => setView(v => v === 'standings' ? 'games' : 'standings')}
                    >TAB</button>
                </div>

                {/* Riadok 2: skupiny A–L (len keď GRP aktívne) — všetkých 12 v jednom riadku */}
                {grpActive && (
                    <div style={{display:'flex', flexWrap:'nowrap', gap:3, marginTop:4}}>
                        {GROUP_CODES.map(g => (
                            <button key={g}
                                className={[styles.pBtn, styles.pGroup, groupFilter === g ? styles.pGroupOn : ''].join(' ')}
                                style={{flex:'1 1 0', minWidth:0, padding:'5px 0', fontSize:'0.78rem'}}
                                onClick={() => { setPhase('GRP'); setGroupFilter(g); setSelectedTeam(null); setSelectedDay(null); }}
                            >{g}</button>
                        ))}
                    </div>
                )}
            </div>

            {view === 'standings' && (
                <FifaGroupStandings onTeamClick={(team) => {
                    setSelectedTeam(team);
                    setPhase('GRP');
                    setGroupFilter(null);
                    setView('games');
                }} />
            )}

            {view === 'games' && <>

            {/* Vlajky tímov */}
            {flagTeams.length > 0 && (
                <div className={styles.flagsRow}>
                    {flagTeams.map(team => (
                        <button key={team}
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

            {/* Kalendár */}
            <div className={styles.calRow} ref={calContainer}>
                {allDays.map(dk => {
                    const d       = new Date(dk + 'T12:00:00');
                    const isToday  = dk === todayK;
                    const isActive = dk === selectedDay;
                    return (
                        <button key={dk}
                            className={`${styles.calDay} ${isToday ? styles.calDayToday : ''} ${isActive ? styles.calDayActive : ''}`}
                            onClick={() => setSelectedDay(selectedDay === dk ? null : dk)}
                        >
                            <span className={styles.calDayWeekday}>{d.toLocaleDateString('sk-SK', {weekday:'short'})}</span>
                            <span className={styles.calDayNum}>{d.getDate()}</span>
                            <span className={styles.calDayMonth}>{d.getMonth()+1}.</span>
                        </button>
                    );
                })}
            </div>

            {/* Zápasy */}
            {Object.entries(byDate).map(([date, dayGames]) => (
                <div key={date} className={styles.dayGroup}>
                    <div className={styles.dayHeader}>{date}</div>
                    {dayGames.map(g => {
                        const start    = new Date(g.start_time + 'Z');
                        const finished = g.result_approved;
                        const live     = !finished && start <= new Date();
                        return (
                            <div key={g.game_id} className={`${styles.card} ${finished ? styles.cardFinished : live ? styles.cardLive : ''}`}>
                                <div className={styles.cardTop}>
                                    <span className={styles.phase}>{PHASE_LABEL[g.game_type_code] || g.game_type_code} • #{g.game_id}</span>
                                    <span className={styles.time}>{start.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className={styles.matchRow}>
                                    <TeamBlock code={g.home_code} isLeft />
                                    <div className={styles.vs}>
                                        {finished && g.home_score_regular != null
                                            ? <span className={styles.result}>
                                                {g.home_score_regular}:{g.away_score_regular}
                                                {g.home_score_final != null && <span className={styles.resultOT}> ({g.home_score_final}:{g.away_score_final} pp)</span>}
                                              </span>
                                            : live ? <span className={styles.live}>LIVE</span> : 'vs'}
                                    </div>
                                    <TeamBlock code={g.away_code} />
                                </div>
                                <div className={styles.venue}>
                                    {g.venue}
                                    {g.flashscore_url && (
                                        <a href={g.flashscore_url} target="_blank" rel="noopener noreferrer" className={styles.fsLink} title="Sledovať na FlashScore">
                                            <img src="/flashscore.png" alt="FlashScore" className={styles.fsIcon} />
                                        </a>
                                    )}
                                </div>
                                {!finished && g.ls_home != null && (
                                    <div className={styles.liveBar}>
                                        <span className={styles.lsBadge}>LIVE</span>
                                        <span className={styles.liveScore}>{g.ls_home}:{g.ls_away}</span>
                                    </div>
                                )}
                                <TipInput game={g} onSaved={handleSaved} />
                                {(finished || live) && <GroupTips game={g} />}
                            </div>
                        );
                    })}
                </div>
            ))}

            {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy</p>}

            </>}
        </div>
    );
}
