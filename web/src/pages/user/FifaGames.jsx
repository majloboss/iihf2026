import { useState, useEffect, useCallback, useRef } from 'react';
import { getFifaGames, saveFifaTip } from '../../api/fifaGames';
import styles from './Games.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const PHASE_LABEL = {
    GROUP_A:'Skupina A', GROUP_B:'Skupina B', GROUP_C:'Skupina C', GROUP_D:'Skupina D',
    GROUP_E:'Skupina E', GROUP_F:'Skupina F', GROUP_G:'Skupina G', GROUP_H:'Skupina H',
    GROUP_I:'Skupina I', GROUP_J:'Skupina J', GROUP_K:'Skupina K', GROUP_L:'Skupina L',
    R32:'Round of 32', R16:'Round of 16', QF:'Štvrťfinále', SF:'Semifinále', BM:'O bronz', F:'Finále',
};
const PHASE_BTN = {
    all:'ALL', R32:'R32', R16:'R16', QF:'QF', SF:'SF', BM:'BR', F:'F',
};
const FLAG_URL = (code) => `/flags/fifa_flag_${code?.toLowerCase()}.png`;
const dayKey   = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function TeamBlock({ code, name, isLeft }) {
    return (
        <div className={`${styles.team} ${isLeft ? styles.teamLeft : styles.teamRight}`}>
            {code
                ? <><img className={styles.flag} src={FLAG_URL(code)} alt={code} onError={e => e.target.style.display='none'} /><span className={styles.teamCode}>{code}</span></>
                : <span className={styles.teamCode} style={{color:'#bbb'}}>TBD</span>
            }
        </div>
    );
}

function TipInput({ game, onSaved }) {
    const [v1, setV1]     = useState(game.home_score_tip != null ? String(game.home_score_tip) : '');
    const [v2, setV2]     = useState(game.away_score_tip != null ? String(game.away_score_tip) : '');
    const [saving, setSaving] = useState(false);
    const [err, setErr]   = useState('');

    const now = new Date();
    const start = new Date(game.start_time + 'Z');
    const canTip = game.tips_open && game.home_code && game.away_code
                   && now < new Date(start.getTime() - 5 * 60000);

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
                {game.points_earned != null && (
                    <span className={styles.pts}>+{game.points_earned}b</span>
                )}
            </div>
        );
        if (!game.home_code || !game.away_code) return null;
        if (now < start) return <div className={styles.tipClosed}>Uzavreté</div>;
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
    const [games, setGames]             = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [phase, setPhase]             = useState('all');
    const [groupFilter, setGroupFilter] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [showUntipped, setShowUntipped] = useState(false);
    const calContainer = useRef(null);

    useEffect(() => {
        getFifaGames()
            .then(data => { setGames(data); setLoading(false); })
            .catch(e => { setError(e.message || 'Chyba API'); setLoading(false); });
    }, []);

    const handleSaved = useCallback((gameId, h, a) => {
        setGames(prev => prev.map(g => g.game_id === gameId
            ? { ...g, home_score_tip: h, away_score_tip: a }
            : g));
    }, []);

    const isGroupPhase = phase === 'all' || phase.startsWith('GROUP_');
    const isKnockout   = ['R32','R16','QF','SF','BM','F'].includes(phase);

    const now2 = Date.now();
    const filtered = games.filter(g => {
        if (phase !== 'all' && g.game_type_code !== phase) return false;
        if (phase === 'all' && groupFilter) {
            if (g.game_type_code !== `GROUP_${groupFilter}`) return false;
        }
        if (selectedDay && dayKey(g.start_time + 'Z') !== selectedDay) return false;
        if (showUntipped) {
            const start = new Date(g.start_time + 'Z').getTime();
            return g.tips_open && g.home_code && g.away_code
                   && g.home_score_tip == null && start - now2 > 5 * 60000;
        }
        return true;
    });

    const allDays = [...new Set(games
        .filter(g => phase === 'all' ? (!groupFilter || g.game_type_code === `GROUP_${groupFilter}`) : g.game_type_code === phase)
        .map(g => dayKey(g.start_time + 'Z')))].sort();

    const byDate = {};
    filtered.forEach(g => {
        const dk = new Date(g.start_time + 'Z').toLocaleDateString('sk-SK', {
            weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'
        });
        if (!byDate[dk]) byDate[dk] = [];
        byDate[dk].push(g);
    });

    const todayK = dayKey(new Date().toISOString());
    const knockoutPhases = ['R32','R16','QF','SF','BM','F'];

    if (loading) return <div className={styles.wrap}><p>Načítavam…</p></div>;
    if (error)   return <div className={styles.wrap}><p style={{color:'red'}}>Chyba: {error}</p></div>;

    return (
        <div className={styles.wrap}>
            <div className={styles.topBar}>
                <div className={styles.filters}>
                    <button
                        className={showUntipped ? styles.untippedBtnOn : styles.untippedBtn}
                        onClick={() => setShowUntipped(v => !v)}
                        title="Nenatipované zápasy"
                    >✓</button>
                    <button
                        onClick={() => { setPhase('all'); setGroupFilter(null); }}
                        className={[styles.pBtn, styles.pGroup, phase === 'all' && !groupFilter ? styles.pGroupOn : ''].join(' ')}
                    >ALL</button>
                    {GROUP_CODES.map(g => (
                        <button key={g}
                            onClick={() => { setPhase('all'); setGroupFilter(g); setSelectedDay(null); }}
                            className={[styles.pBtn, styles.pGroup, phase === 'all' && groupFilter === g ? styles.pGroupOn : ''].join(' ')}
                        >{g}</button>
                    ))}
                    {knockoutPhases.map(p => (
                        <button key={p}
                            onClick={() => { setPhase(p); setGroupFilter(null); setSelectedDay(null); }}
                            className={[styles.pBtn,
                                p === 'F'  ? styles.pGold    : p === 'BM' ? styles.pBronze : styles.pPlayoff,
                                phase === p ? (p === 'F' ? styles.pGoldOn : p === 'BM' ? styles.pBronzeOn : styles.pPlayoffOn) : ''
                            ].join(' ')}
                        >{PHASE_BTN[p]}</button>
                    ))}
                </div>
            </div>

            {/* Kalendár */}
            <div className={styles.calRow} ref={calContainer}>
                {allDays.map(dk => {
                    const d = new Date(dk + 'T12:00:00');
                    const isToday  = dk === todayK;
                    const isActive = dk === selectedDay;
                    return (
                        <button key={dk}
                            className={`${styles.calDay} ${isToday ? styles.calDayToday : ''} ${isActive ? styles.calDayActive : ''}`}
                            onClick={() => setSelectedDay(selectedDay === dk ? null : dk)}
                        >
                            <span className={styles.calDayWeekday}>{d.toLocaleDateString('sk-SK', { weekday:'short' })}</span>
                            <span className={styles.calDayNum}>{d.getDate()}</span>
                            <span className={styles.calDayMonth}>{d.getMonth()+1}.</span>
                        </button>
                    );
                })}
            </div>

            {Object.entries(byDate).map(([date, dayGames]) => (
                <div key={date} className={styles.dayGroup}>
                    <div className={styles.dayHeader}>{date}</div>
                    {dayGames.map(g => {
                        const start    = new Date(g.start_time + 'Z');
                        const finished = g.result_approved;
                        const live     = !finished && start <= new Date();
                        const status   = finished ? 'finished' : live ? 'live' : 'scheduled';
                        return (
                            <div key={g.game_id} className={`${styles.card} ${finished ? styles.cardFinished : live ? styles.cardLive : ''}`}>
                                <div className={styles.cardTop}>
                                    <span className={styles.phase}>{PHASE_LABEL[g.game_type_code] || g.game_type_code} • #{g.game_id}</span>
                                    <span className={styles.time}>{start.toLocaleTimeString('sk-SK', { hour:'2-digit', minute:'2-digit' })}</span>
                                </div>
                                <div className={styles.matchRow}>
                                    <TeamBlock code={g.home_code} name={g.home_name} isLeft />
                                    <div className={styles.vs}>
                                        {finished && g.home_score_regular != null
                                            ? <span className={styles.result}>{g.home_score_regular}:{g.away_score_regular}</span>
                                            : live ? <span className={styles.live}>LIVE</span>
                                            : 'vs'}
                                    </div>
                                    <TeamBlock code={g.away_code} name={g.away_name} />
                                </div>
                                <div className={styles.venue}>{g.venue}</div>
                                <TipInput game={g} onSaved={handleSaved} />
                            </div>
                        );
                    })}
                </div>
            ))}

            {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy</p>}
        </div>
    );
}
