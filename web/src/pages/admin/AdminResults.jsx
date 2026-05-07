import { useState, useEffect } from 'react';
import { getGames } from '../../api/games';
import { updateGame } from '../../api/admin';
import gStyles from '../user/Games.module.css';
import styles from './AdminResults.module.css';

const PHASE_LABEL = { A: 'Skupina A', B: 'Skupina B', QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále' };
const FLAG_URL    = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

function effectiveStatus(game) {
    if (game.status === 'finished') return 'finished';
    if (Date.now() >= new Date(game.starts_at).getTime()) return 'live';
    return 'scheduled';
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

function ResultCard({ game: initGame }) {
    const initEff  = effectiveStatus(initGame);
    const [game,   setGame]   = useState(initGame);
    const [s1,     setS1]     = useState(initGame.score1 != null ? String(initGame.score1) : '');
    const [s2,     setS2]     = useState(initGame.score2 != null ? String(initGame.score2) : '');
    const [status, setStatus] = useState(initEff);
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [err,    setErr]    = useState('');

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
            const updated = { ...game, status, score1: canEdit ? parseInt(s1) : null, score2: canEdit ? parseInt(s2) : null };
            setGame(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className={`${gStyles.card} ${status === 'finished' ? gStyles.cardFinished : ''} ${status === 'live' ? styles.cardLive : ''}`}>
            <div className={gStyles.cardTop}>
                <span className={gStyles.phase}>{PHASE_LABEL[game.phase] || game.phase} • Zápas {game.game_number}</span>
                <span className={gStyles.time}>{new Date(game.starts_at).toLocaleTimeString('sk-SK', { hour:'2-digit', minute:'2-digit' })}</span>
            </div>

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

            <div className={gStyles.venue}>{game.venue}</div>

            {started && (
                <div className={styles.editRow}>
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                        className={styles.statusSel}
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
                        {saving ? '…' : saved ? '✓ Uložené' : 'Uložiť'}
                    </button>
                    {err && <span className={styles.errMsg}>{err}</span>}
                </div>
            )}
        </div>
    );
}

export default function AdminResults() {
    const [games,   setGames]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [filter,  setFilter]  = useState('active');

    useEffect(() => {
        getGames()
            .then(data => { setGames(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, []);

    const filtered = games.filter(g => {
        const es = effectiveStatus(g);
        if (filter === 'all')      return true;
        if (filter === 'active')   return es !== 'scheduled';
        if (filter === 'live')     return es === 'live';
        if (filter === 'finished') return es === 'finished';
        return true;
    });

    const byDate = {};
    filtered.forEach(g => {
        const d = new Date(g.starts_at).toLocaleDateString('sk-SK', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(g);
    });

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div className={gStyles.wrap} style={{maxWidth:680}}>
            <div className={gStyles.topBar}>
                <h2>Výsledky</h2>
                <div className={gStyles.filters}>
                    {[['active','Aktívne'],['live','Prebiehajúce'],['finished','Odohranné'],['all','Všetky']].map(([v,l]) => (
                        <button key={v}
                            className={filter === v ? gStyles.btnFilterActive : gStyles.btnFilter}
                            onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>
            </div>

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
