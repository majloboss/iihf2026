import { useState, useEffect } from 'react';
import { getGames } from '../../api/games';
import { updateGame, getAdminGameTips, recalcPoints } from '../../api/admin';
import gStyles from '../user/Games.module.css';
import styles from './AdminResults.module.css';

const PHASE_LABEL = { A: 'Skupina A', B: 'Skupina B', QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále' };
const FLAG_URL    = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

function effectiveStatus(game) {
    if (game.status === 'finished') return 'finished';
    if (Date.now() >= new Date(game.starts_at).getTime()) return 'live';
    return 'scheduled';
}

function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit' })
        + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
}

function TeamBlock({ code, isLeft }) {
    return (
        <div className={`${gStyles.team} ${isLeft ? gStyles.teamLeft : gStyles.teamRight}`}>
            {code
                ? <><img className={gStyles.flag} src={FLAG_URL(code)} alt={code} onError={e => e.target.style.display='none'} /><span className={gStyles.teamCode}>{code}</span></>
                : <span className={gStyles.teamCode}>TBD</span>}
        </div>
    );
}

function TipsPanel({ gameId }) {
    const [tips,    setTips]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [err,     setErr]     = useState('');

    useEffect(() => {
        setLoading(true);
        getAdminGameTips(gameId)
            .then(setTips)
            .catch(e => setErr(e.message))
            .finally(() => setLoading(false));
    }, [gameId]);

    if (loading) return <div className={styles.tipsLoading}>Načítavam tipy…</div>;
    if (err)     return <div className={styles.tipsErr}>{err}</div>;
    if (!tips || tips.length === 0) return <div className={styles.tipsEmpty}>Žiadne tipy</div>;

    return (
        <table className={styles.tipsTable}>
            <thead>
                <tr>
                    <th>Hráč</th>
                    <th>Tip</th>
                    <th>Body</th>
                    <th>Čas tipu</th>
                </tr>
            </thead>
            <tbody>
                {tips.map(t => (
                    <tr key={t.user_id}>
                        <td className={styles.tipUser}>
                            {t.avatar
                                ? <img src={t.avatar} className={styles.tipAvatar} alt="" />
                                : <span className={styles.tipAvatarPh}>{t.username[0].toUpperCase()}</span>}
                            {t.username}
                        </td>
                        <td className={styles.tipScore}>{t.tip1 != null ? `${t.tip1}:${t.tip2}` : '—'}</td>
                        <td className={styles.tipPts}>{t.points != null ? `+${t.points}b` : '—'}</td>
                        <td className={styles.tipTime}>{t.updated_at ? new Date(t.updated_at).toLocaleString('sk-SK') : '—'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function ResultCard({ game: initGame }) {
    const initEff  = effectiveStatus(initGame);
    const [game,   setGame]   = useState(initGame);
    const [s1,     setS1]     = useState(initGame.score1 != null ? String(initGame.score1) : '');
    const [s2,     setS2]     = useState(initGame.score2 != null ? String(initGame.score2) : '');
    const [status, setStatus] = useState(initEff);
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [err,    setErr]    = useState('');
    const [open,   setOpen]   = useState(false);

    const started = initEff !== 'scheduled';
    const canEdit = status === 'finished';
    const dirty   = status !== effectiveStatus(game) ||
                    (canEdit && (s1 !== (game.score1 != null ? String(game.score1) : '') ||
                                 s2 !== (game.score2 != null ? String(game.score2) : '')));

    const save = async () => {
        if (canEdit && (s1 === '' || s2 === '')) { setErr('Zadaj oba góly'); return; }
        setSaving(true); setErr(''); setSaved(false);
        try {
            await updateGame(game.id, {
                status,
                score1: canEdit ? parseInt(s1) : null,
                score2: canEdit ? parseInt(s2) : null,
            });
            setGame(g => ({ ...g, status, score1: canEdit ? parseInt(s1) : null, score2: canEdit ? parseInt(s2) : null }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            if (open) { setOpen(false); setTimeout(() => setOpen(true), 100); }
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={`${gStyles.card} ${status === 'finished' ? gStyles.cardFinished : status === 'live' ? styles.cardLive : ''}`}>
            {/* Header: skupina, číslo, dátum+čas */}
            <div className={styles.cardHead}>
                <span className={styles.cardMeta}>{PHASE_LABEL[game.phase] || game.phase} • Zápas {game.game_number}</span>
                <span className={styles.cardMeta}>{formatDateTime(game.starts_at)}</span>
            </div>
            <div className={styles.cardVenue}>{game.venue}</div>

            {/* Zápas */}
            <div className={gStyles.matchRow}>
                <TeamBlock code={game.team1} isLeft />
                <div className={gStyles.vs}>
                    {status === 'live'
                        ? <span className={gStyles.live}>LIVE</span>
                        : status === 'finished' && game.score1 != null
                            ? <span className={styles.result}>{game.score1}:{game.score2}</span>
                            : 'vs'}
                </div>
                <TeamBlock code={game.team2} />
            </div>

            {/* Editácia stavu a skóre */}
            {started && (
                <div className={styles.editRow}>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={styles.statusSel}
                        style={{ color: status === 'finished' ? '#28a745' : status === 'live' ? '#dc3545' : '#888' }}>
                        <option value="scheduled">Plánovaný</option>
                        <option value="live">Prebieha</option>
                        <option value="finished">Odohraný</option>
                    </select>
                    {canEdit && (
                        <div className={styles.scoreBox}>
                            <input type="number" min="0" max="30" value={s1} onChange={e => setS1(e.target.value)} className={styles.scoreIn} />
                            <span className={styles.colon}>:</span>
                            <input type="number" min="0" max="30" value={s2} onChange={e => setS2(e.target.value)} className={styles.scoreIn} />
                        </div>
                    )}
                    <button className={styles.btnSave} onClick={save} disabled={saving || !dirty}>
                        {saving ? '…' : saved ? '✓' : 'Uložiť'}
                    </button>
                    {err && <span className={styles.errMsg}>{err}</span>}
                </div>
            )}

            {/* Tipy všetkých hráčov */}
            <button className={styles.toggleTips} onClick={() => setOpen(o => !o)}>
                {open ? '▲ Skryť tipy' : '▼ Tipy hráčov'}
            </button>
            {open && <TipsPanel gameId={game.id} />}
        </div>
    );
}

const PHASES = ['all', 'A', 'B', 'QF', 'SF', 'BRONZE', 'GOLD'];
const PHASE_FILTER_LABEL = { all: 'Všetky', A: 'Sk. A', B: 'Sk. B', QF: 'Štvrťf.', SF: 'Semif.', BRONZE: 'Bronz', GOLD: 'Finále' };

export default function AdminResults() {
    const [games,     setGames]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');
    const [phase,     setPhase]     = useState('all');
    const [recalcing, setRecalcing] = useState(false);
    const [recalcMsg, setRecalcMsg] = useState('');

    const handleRecalc = async () => {
        setRecalcing(true); setRecalcMsg('');
        try {
            const r = await recalcPoints();
            setRecalcMsg(`✓ Prepočítané: ${r.games_processed} zápasov, ${r.tips_updated} tipov`);
        } catch (e) { setRecalcMsg(`Chyba: ${e.message}`); }
        finally { setRecalcing(false); }
    };

    useEffect(() => {
        getGames()
            .then(data => { setGames(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, []);

    const filtered = phase === 'all' ? games : games.filter(g => g.phase === phase);

    const byDate = {};
    filtered.forEach(g => {
        const d = new Date(g.starts_at).toLocaleDateString('sk-SK', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(g);
    });

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div className={gStyles.wrap} style={{maxWidth:700}}>
            <div className={gStyles.topBar}>
                <h2>Výsledky</h2>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                    <div className={gStyles.filters}>
                        {PHASES.map(p => (
                            <button key={p}
                                className={phase === p ? gStyles.btnFilterActive : gStyles.btnFilter}
                                onClick={() => setPhase(p)}>{PHASE_FILTER_LABEL[p]}</button>
                        ))}
                    </div>
                    <button className={styles.btnSave} onClick={handleRecalc} disabled={recalcing}
                        style={{whiteSpace:'nowrap'}}>
                        {recalcing ? '…' : '↺ Prepočítať body'}
                    </button>
                </div>
            </div>
            {recalcMsg && <p style={{fontSize:'0.85rem',color: recalcMsg.startsWith('✓') ? '#28a745' : '#dc3545', margin:'4px 0 8px'}}>{recalcMsg}</p>}

            {Object.keys(byDate).length === 0
                ? <p className={gStyles.empty}>Žiadne zápasy</p>
                : Object.entries(byDate).map(([date, dayGames]) => (
                    <div key={date} className={gStyles.dayGroup}>
                        <div className={gStyles.dayHeader}>{date}</div>
                        {dayGames.map(g => <ResultCard key={g.id} game={g} />)}
                    </div>
                ))}
        </div>
    );
}
