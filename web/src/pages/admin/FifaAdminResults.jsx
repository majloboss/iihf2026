import { useState, useEffect } from 'react';
import { getFifaGames } from '../../api/fifaGames';
import { getFifaTeams, getFifaAdminTips, updateFifaResult, setFifaGameTeams, recalcFifa, setFifaLive, clearFifaLive } from '../../api/fifaAdmin';
import gStyles from '../user/Games.module.css';
import styles from './AdminResults.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const KNOCKOUT    = ['R32','R16','QF','SF','BM','F'];
const PLAYOFF     = new Set(KNOCKOUT);
const PHASE_LABEL = {
    GROUP_A:'Skupina A', GROUP_B:'Skupina B', GROUP_C:'Skupina C', GROUP_D:'Skupina D',
    GROUP_E:'Skupina E', GROUP_F:'Skupina F', GROUP_G:'Skupina G', GROUP_H:'Skupina H',
    GROUP_I:'Skupina I', GROUP_J:'Skupina J', GROUP_K:'Skupina K', GROUP_L:'Skupina L',
    R32:'Round of 32', R16:'Round of 16', QF:'Štvrťfinále', SF:'Semifinále', BM:'O bronz', F:'Finále',
};
const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;
// Priebežné body podľa livescore (group 3+1+1, playoff 5+1+1)
const calcLiveFifaPoints = (tip1, tip2, game) => {
    const s1 = game.ls_home, s2 = game.ls_away;
    if (s1 == null || s2 == null || tip1 == null || tip2 == null) return null;
    const winPts = PLAYOFF.has(game.game_type_code) ? 5 : 3;
    const rw = s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
    const tw = tip1 > tip2 ? 1 : tip1 < tip2 ? -1 : 0;
    return (tw === rw ? winPts : 0) + (tip1 === s1 ? 1 : 0) + (tip2 === s2 ? 1 : 0);
};
const dayKey   = iso => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDateTime = iso => {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString('sk-SK', { weekday:'short', day:'2-digit', month:'2-digit' })
        + ' ' + d.toLocaleTimeString('sk-SK', { hour:'2-digit', minute:'2-digit' });
};

function TeamBlock({ code, isLeft }) {
    return (
        <div className={`${gStyles.team} ${isLeft ? gStyles.teamLeft : gStyles.teamRight}`}>
            {code
                ? <><img className={gStyles.flag} src={FLAG_URL(code)} alt={code} onError={e => e.target.style.display='none'} /><span className={gStyles.teamCode}>{code}</span></>
                : <span className={gStyles.teamCode} style={{color:'#bbb'}}>TBD</span>}
        </div>
    );
}

function TipsPanel({ gameId, game }) {
    const [tips, setTips]       = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr]         = useState('');

    useEffect(() => {
        setLoading(true);
        getFifaAdminTips(gameId).then(setTips).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [gameId]);

    if (loading) return <div className={styles.tipsLoading}>Načítavam tipy…</div>;
    if (err)     return <div className={styles.tipsErr}>{err}</div>;
    if (!tips || tips.length === 0) return <div className={styles.tipsEmpty}>Žiadne tipy</div>;

    const isLive = game && game.ls_home != null && !game.result_approved;

    return (
        <table className={styles.tipsTable}>
            <thead><tr><th>Hráč</th><th>Tip</th><th>Body</th><th>Čas tipu</th></tr></thead>
            <tbody>
                {tips.map(t => {
                    const livePts = isLive ? calcLiveFifaPoints(t.tip1, t.tip2, game) : null;
                    return (
                        <tr key={t.user_id} className={t.tip1 == null ? styles.tipRowUntipped : ''}>
                            <td className={styles.tipUser}>
                                {t.avatar
                                    ? <img src={t.avatar} className={styles.tipAvatar} alt="" />
                                    : <span className={styles.tipAvatarPh}>{t.username[0].toUpperCase()}</span>}
                                {t.username}
                            </td>
                            <td className={styles.tipScore}>{t.tip1 != null ? `${t.tip1}:${t.tip2}` : '—'}</td>
                            <td className={livePts != null ? styles.tipPtsLive : styles.tipPts}>
                                {livePts != null ? `+${livePts}b` : (t.points != null ? `+${t.points}b` : '—')}
                            </td>
                            <td className={styles.tipTime}>{t.updated_at ? new Date(t.updated_at).toLocaleString('sk-SK') : '—'}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function ResultCard({ game: initGame, teams, onChanged }) {
    const isPlayoff = PLAYOFF.has(initGame.game_type_code);
    const [game, setGame] = useState(initGame);

    // Skóre po 90 min
    const [h90, setH90] = useState(game.home_score_regular != null ? String(game.home_score_regular) : '');
    const [a90, setA90] = useState(game.away_score_regular != null ? String(game.away_score_regular) : '');
    // Finálne skóre (playoff, po ET/penalty)
    const [hasET, setHasET] = useState(game.home_score_final != null);
    const [hFin, setHFin]   = useState(game.home_score_final != null ? String(game.home_score_final) : '');
    const [aFin, setAFin]   = useState(game.away_score_final != null ? String(game.away_score_final) : '');

    const [saving, setSaving] = useState(false);
    const [saved, setSaved]   = useState(false);
    const [err, setErr]       = useState('');
    const [open, setOpen]     = useState(false);

    // Predĺženie je možné len pri remíze po 90 min
    const isDraw90 = h90 !== '' && a90 !== '' && parseInt(h90) === parseInt(a90);

    // Živé skóre
    const [ls1, setLs1]       = useState(game.ls_home != null ? String(game.ls_home) : '0');
    const [ls2, setLs2]       = useState(game.ls_away != null ? String(game.ls_away) : '0');
    const [lsSaving, setLsSaving] = useState(false);
    const [lsErr, setLsErr]   = useState('');

    const started = new Date(game.start_time + 'Z') <= new Date();

    const saveLs = async () => {
        if (ls1 === '' || ls2 === '') { setLsErr('Zadaj skóre'); return; }
        setLsSaving(true); setLsErr('');
        try {
            await setFifaLive(game.game_id, parseInt(ls1), parseInt(ls2));
            setGame(g => ({ ...g, ls_home: parseInt(ls1), ls_away: parseInt(ls2), ls_status: 'LIVE', ls_updated_at: new Date().toISOString() }));
        } catch (e) { setLsErr(e.message); }
        finally { setLsSaving(false); }
    };

    const clearLs = async () => {
        setLsSaving(true); setLsErr('');
        try {
            await clearFifaLive(game.game_id);
            setGame(g => ({ ...g, ls_home: null, ls_away: null, ls_status: null, ls_updated_at: null }));
        } catch (e) { setLsErr(e.message); }
        finally { setLsSaving(false); }
    };

    // Playoff bracket — výber tímov
    const teamsSet = game.home_code && game.away_code;
    const [homeId, setHomeId] = useState('');
    const [awayId, setAwayId] = useState('');
    const [teamSaving, setTeamSaving] = useState(false);
    const [teamErr, setTeamErr] = useState('');

    const saveTeams = async () => {
        if (!homeId || !awayId) { setTeamErr('Vyber oba tímy'); return; }
        if (homeId === awayId)  { setTeamErr('Tímy musia byť rôzne'); return; }
        setTeamSaving(true); setTeamErr('');
        try {
            await setFifaGameTeams(game.game_id, parseInt(homeId), parseInt(awayId));
            const ht = teams.find(t => t.team_id === parseInt(homeId));
            const at = teams.find(t => t.team_id === parseInt(awayId));
            setGame(g => ({ ...g, home_code: ht.team_code, home_name: ht.team_name,
                                  away_code: at.team_code, away_name: at.team_name, tips_open: true }));
            onChanged?.();
        } catch (e) { setTeamErr(e.message); }
        finally { setTeamSaving(false); }
    };

    const needsET = isPlayoff && isDraw90;  // play-off remíza → povinné predĺženie s víťazom

    const save = async () => {
        if (h90 === '' || a90 === '') { setErr('Zadaj skóre po 90 min'); return; }
        if (needsET) {
            if (hFin === '' || aFin === '') { setErr('Remíza v play-off — zadaj konečný výsledok (po ET/penaltách)'); return; }
            const H90 = +h90, A90 = +a90, HF = +hFin, AF = +aFin;
            if (HF < H90 || AF < A90) { setErr('Konečný výsledok nemôže byť nižší ako po 90 min'); return; }
            if (HF === AF) { setErr('Po ET/penaltách musí byť víťaz (nie remíza)'); return; }
        }
        setSaving(true); setErr(''); setSaved(false);
        const payload = {
            game_id: game.game_id,
            home_score_regular: parseInt(h90),
            away_score_regular: parseInt(a90),
            home_score_final: needsET ? parseInt(hFin) : null,
            away_score_final: needsET ? parseInt(aFin) : null,
            result_approved: true,
        };
        try {
            await updateFifaResult(payload);
            await recalcFifa(game.game_id);
            setGame(g => ({ ...g,
                home_score_regular: payload.home_score_regular,
                away_score_regular: payload.away_score_regular,
                home_score_final: payload.home_score_final,
                away_score_final: payload.away_score_final,
                result_approved: true }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            onChanged?.();
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    const finished = game.result_approved;

    return (
        <div className={`${gStyles.card} ${finished ? gStyles.cardFinished : ''}`}>
            <div className={styles.cardHead}>
                <span className={styles.cardMeta}>{PHASE_LABEL[game.game_type_code] || game.game_type_code} • #{game.game_id}</span>
                <span className={styles.cardMeta}>{fmtDateTime(game.start_time)}</span>
            </div>

            <div className={gStyles.matchRow}>
                <TeamBlock code={game.home_code} isLeft />
                <div className={gStyles.vs}>
                    {finished && game.home_score_regular != null
                        ? <span className={styles.result}>
                            {game.home_score_regular}:{game.away_score_regular}
                            {game.home_score_final != null &&
                                <span className={styles.resultOT}> ({game.home_score_final}:{game.away_score_final} pp)</span>}
                          </span>
                        : 'vs'}
                </div>
                <TeamBlock code={game.away_code} />
            </div>
            <div className={styles.cardVenue}><span>{game.venue}</span></div>

            {/* Živé skóre — keď zápas začal, ešte nie je odohraný a tímy sú známe */}
            {teamsSet && !finished && started && (
                <div className={styles.lsManualBlock}>
                    <span className={styles.lsManualLabel}>
                        Živé skóre {game.ls_home != null && <span style={{color:'#dc3545'}}>· LIVE {game.ls_home}:{game.ls_away}</span>}
                    </span>
                    <div className={styles.lsManualRow}>
                        <input type="number" min="0" max="30" value={ls1} onChange={e => setLs1(e.target.value)} className={styles.scoreIn} />
                        <span className={styles.colon}>:</span>
                        <input type="number" min="0" max="30" value={ls2} onChange={e => setLs2(e.target.value)} className={styles.scoreIn} />
                        <button className={styles.btnSaveLs} onClick={saveLs} disabled={lsSaving}>
                            {lsSaving ? '…' : 'Uložiť live'}
                        </button>
                        {game.ls_home != null && (
                            <button className={styles.btnSave} style={{background:'#6c757d'}} onClick={clearLs} disabled={lsSaving}>Zrušiť live</button>
                        )}
                        {lsErr && <span className={styles.errMsg}>{lsErr}</span>}
                    </div>
                </div>
            )}

            {/* Playoff: výber tímov keď nie sú nastavené */}
            {isPlayoff && !teamsSet && (
                <div className={styles.lsManualBlock}>
                    <span className={styles.lsManualLabel}>Nastaviť tímy (bracket)</span>
                    <div className={styles.lsManualRow}>
                        <select value={homeId} onChange={e => setHomeId(e.target.value)} className={styles.statusSel}>
                            <option value="">— domáci —</option>
                            {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} · {t.team_name}</option>)}
                        </select>
                        <span className={styles.colon}>:</span>
                        <select value={awayId} onChange={e => setAwayId(e.target.value)} className={styles.statusSel}>
                            <option value="">— hostia —</option>
                            {teams.map(t => <option key={t.team_id} value={t.team_id}>{t.team_code} · {t.team_name}</option>)}
                        </select>
                        <button className={styles.btnSave} onClick={saveTeams} disabled={teamSaving}>
                            {teamSaving ? '…' : 'Nastaviť'}
                        </button>
                        {teamErr && <span className={styles.errMsg}>{teamErr}</span>}
                    </div>
                </div>
            )}

            {/* Zápas ešte nezačal — žiadne zadávanie výsledku */}
            {teamsSet && !started && !finished && (
                <div className={styles.cardVenue} style={{color:'#aaa'}}>Zápas ešte nezačal</div>
            )}

            {/* Zadanie výsledku — len keď zápas začal alebo je odohraný */}
            {teamsSet && (started || finished) && (
                <div className={styles.editBlock}>
                    <div className={styles.editRow}>
                        <span style={{fontSize:'0.78rem', color:'#888', minWidth:60}}>Po 90 min:</span>
                        <div className={styles.scoreBox}>
                            <input type="number" min="0" max="30" value={h90} onChange={e => setH90(e.target.value)} className={styles.scoreIn} />
                            <span className={styles.colon}>:</span>
                            <input type="number" min="0" max="30" value={a90} onChange={e => setA90(e.target.value)} className={styles.scoreIn} />
                        </div>
                        <button className={styles.btnSave} onClick={save} disabled={saving}>
                            {saving ? '…' : saved ? '✓ Uložené' : 'Uložiť výsledok'}
                        </button>
                        {!finished && game.ls_home != null && (
                            <button className={styles.btnTakeLS} onClick={() => { setH90(String(game.ls_home)); setA90(String(game.ls_away)); }}>
                                ↙ Prevziať Livescore
                            </button>
                        )}
                        {err && <span className={styles.errMsg}>{err}</span>}
                    </div>
                    {/* Play-off pri remíze po 90 min — povinný konečný výsledok s víťazom */}
                    {isPlayoff && isDraw90 && (
                        <div className={styles.editRow} style={{marginTop:8}}>
                            <span style={{fontSize:'0.78rem', color:'#dc3545', minWidth:60}}>Po ET/pen:</span>
                            <div className={styles.scoreBox}>
                                <input type="number" min="0" max="30" value={hFin} onChange={e => setHFin(e.target.value)} className={styles.scoreIn} />
                                <span className={styles.colon}>:</span>
                                <input type="number" min="0" max="30" value={aFin} onChange={e => setAFin(e.target.value)} className={styles.scoreIn} />
                            </div>
                            <span style={{fontSize:'0.72rem', color:'#bbb'}}>remíza v play-off → zadaj víťaza (po predĺžení/penaltách)</span>
                        </div>
                    )}
                </div>
            )}

            <button className={styles.toggleTips} onClick={() => setOpen(o => !o)}>
                {open ? '▲ Skryť tipy' : '▼ Tipy hráčov'}
            </button>
            {open && <TipsPanel gameId={game.game_id} game={game} />}
        </div>
    );
}

export default function FifaAdminResults() {
    const [games, setGames]       = useState([]);
    const [teams, setTeams]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [error, setError]       = useState('');
    const [phase, setPhase]       = useState('all');
    const [groupFilter, setGroupFilter] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [recalcing, setRecalcing] = useState(false);
    const [recalcMsg, setRecalcMsg] = useState('');

    const load = () => Promise.all([getFifaGames(), getFifaTeams()])
        .then(([g, t]) => { setGames(g); setTeams(t); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });

    useEffect(() => { load(); }, []);

    const handleRecalc = async () => {
        setRecalcing(true); setRecalcMsg('');
        try {
            const r = await recalcFifa();
            setRecalcMsg(`✓ Prepočítané: ${r.games} zápasov, ${r.updated} tipov`);
            load();
        } catch (e) { setRecalcMsg(`Chyba: ${e.message}`); }
        finally { setRecalcing(false); }
    };

    const grpActive = phase === 'GRP';

    const filtered = games.filter(g => {
        const code = g.game_type_code;
        if (phase === 'GRP') {
            if (!code.startsWith('GROUP_')) return false;
            if (groupFilter && code !== `GROUP_${groupFilter}`) return false;
        } else if (phase !== 'all') {
            if (code !== phase) return false;
        }
        if (selectedDay && dayKey(g.start_time + 'Z') !== selectedDay) return false;
        return true;
    }).sort((a, b) => a.game_id - b.game_id);

    const calGames = games.filter(g => {
        const code = g.game_type_code;
        if (phase === 'GRP') {
            if (!code.startsWith('GROUP_')) return false;
            if (groupFilter && code !== `GROUP_${groupFilter}`) return false;
        } else if (phase !== 'all') return code === phase;
        return true;
    });
    const allDays = [...new Set(calGames.map(g => dayKey(g.start_time + 'Z')))].sort();
    const todayK = dayKey(new Date().toISOString());

    if (loading) return <p style={{padding:20}}>Načítavam…</p>;
    if (error)   return <p style={{color:'red', padding:20}}>Chyba: {error}</p>;

    const pBtnClass = (p, on) => {
        const color = p === 'F' ? [gStyles.pGold, gStyles.pGoldOn]
                    : p === 'BM' ? [gStyles.pBronze, gStyles.pBronzeOn]
                    : KNOCKOUT.includes(p) ? [gStyles.pPlayoff, gStyles.pPlayoffOn]
                    : [gStyles.pGroup, gStyles.pGroupOn];
        return [gStyles.pBtn, color[0], on ? color[1] : ''].join(' ');
    };

    return (
        <div className={gStyles.wrap}>
            <div className={styles.recalcRow}>
                <button className={styles.btnRecalc} onClick={handleRecalc} disabled={recalcing}>
                    {recalcing ? 'Prepočítavam…' : '↻ Prepočítať body'}
                </button>
                {recalcMsg && <span className={recalcMsg.startsWith('✓') ? styles.recalcOk : styles.recalcErr}>{recalcMsg}</span>}
            </div>

            <div className={gStyles.topBar}>
                <div className={gStyles.filters}>
                    <button className={[gStyles.pBtn, gStyles.pGroup, phase === 'all' ? gStyles.pGroupOn : ''].join(' ')}
                        onClick={() => { setPhase('all'); setGroupFilter(null); setSelectedDay(null); }}>ALL</button>
                    <button className={[gStyles.pBtn, gStyles.pGroup, grpActive ? gStyles.pGroupOn : ''].join(' ')}
                        onClick={() => { setPhase('GRP'); setSelectedDay(null); }}>GRP</button>
                    {KNOCKOUT.map(p => (
                        <button key={p} className={pBtnClass(p, phase === p)}
                            onClick={() => { setPhase(p); setGroupFilter(null); setSelectedDay(null); }}>
                            {p === 'BM' ? 'BR' : p}
                        </button>
                    ))}
                </div>
                {grpActive && (
                    <div className={gStyles.filters} style={{marginTop:4}}>
                        {GROUP_CODES.map(g => (
                            <button key={g} className={[gStyles.pBtn, gStyles.pGroup, groupFilter === g ? gStyles.pGroupOn : ''].join(' ')}
                                onClick={() => { setGroupFilter(g); setSelectedDay(null); }}>{g}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className={gStyles.calRow}>
                {allDays.map(dk => {
                    const d = new Date(dk + 'T12:00:00');
                    return (
                        <button key={dk}
                            className={`${gStyles.calDay} ${dk === todayK ? gStyles.calDayToday : ''} ${dk === selectedDay ? gStyles.calDayActive : ''}`}
                            onClick={() => setSelectedDay(selectedDay === dk ? null : dk)}>
                            <span className={gStyles.calDayWeekday}>{d.toLocaleDateString('sk-SK', {weekday:'short'})}</span>
                            <span className={gStyles.calDayNum}>{d.getDate()}</span>
                            <span className={gStyles.calDayMonth}>{d.getMonth()+1}.</span>
                        </button>
                    );
                })}
            </div>

            {filtered.map(g => (
                <ResultCard key={g.game_id} game={g} teams={teams} onChanged={load} />
            ))}
            {filtered.length === 0 && <p className={gStyles.empty}>Žiadne zápasy</p>}
        </div>
    );
}
