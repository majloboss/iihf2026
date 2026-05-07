import { useState, useEffect } from 'react';
import { getGames } from '../../api/games';
import { updateGame } from '../../api/admin';
import styles from './Admin.module.css';
import rStyles from './AdminResults.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

const STATUS_LABEL  = { scheduled: 'Plánovaný', live: 'Prebieha', finished: 'Odohraný' };
const STATUS_COLOR  = { scheduled: '#888', live: '#dc3545', finished: '#28a745' };

function ResultRow({ game: initGame }) {
    const [game,   setGame]   = useState(initGame);
    const [status, setStatus] = useState(initGame.status);
    const [s1,     setS1]     = useState(initGame.score1 != null ? String(initGame.score1) : '');
    const [s2,     setS2]     = useState(initGame.score2 != null ? String(initGame.score2) : '');
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [err,    setErr]    = useState('');

    const dirty = status !== game.status ||
                  s1 !== (game.score1 != null ? String(game.score1) : '') ||
                  s2 !== (game.score2 != null ? String(game.score2) : '');

    const showScore = status === 'live' || status === 'finished';

    const save = async () => {
        setSaving(true); setErr(''); setSaved(false);
        try {
            await updateGame(game.id, {
                status,
                score1: showScore && s1 !== '' ? parseInt(s1) : null,
                score2: showScore && s2 !== '' ? parseInt(s2) : null,
            });
            setGame(g => ({
                ...g, status,
                score1: showScore && s1 !== '' ? parseInt(s1) : null,
                score2: showScore && s2 !== '' ? parseInt(s2) : null,
            }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    return (
        <tr className={status === 'finished' ? rStyles.rowFinished : status === 'live' ? rStyles.rowLive : ''}>
            <td className={rStyles.tdNum}>{game.game_number}</td>
            <td className={rStyles.tdTeams}>
                {game.team1
                    ? <><img className={rStyles.flag} src={FLAG_URL(game.team1)} alt="" onError={e => e.target.style.display='none'} />{game.team1}</>
                    : <span className={rStyles.tbd}>TBD</span>}
                <span className={rStyles.vs}>vs</span>
                {game.team2
                    ? <>{game.team2}<img className={rStyles.flag} src={FLAG_URL(game.team2)} alt="" onError={e => e.target.style.display='none'} /></>
                    : <span className={rStyles.tbd}>TBD</span>}
            </td>
            <td className={rStyles.tdStatus}>
                <select value={status} onChange={e => setStatus(e.target.value)} className={rStyles.statusSelect}
                    style={{ color: STATUS_COLOR[status] }}>
                    <option value="scheduled">Plánovaný</option>
                    <option value="live">Prebieha</option>
                    <option value="finished">Odohraný</option>
                </select>
            </td>
            <td className={rStyles.tdScore}>
                {showScore
                    ? <div className={rStyles.scoreInputs}>
                        <input type="number" min="0" max="30" value={s1} onChange={e => setS1(e.target.value)} className={rStyles.scoreIn} />
                        <span>:</span>
                        <input type="number" min="0" max="30" value={s2} onChange={e => setS2(e.target.value)} className={rStyles.scoreIn} />
                      </div>
                    : <span className={rStyles.noScore}>—</span>}
            </td>
            <td className={rStyles.tdSave}>
                <button className={rStyles.btnSave} onClick={save} disabled={saving || !dirty}>
                    {saving ? '…' : 'Uložiť'}
                </button>
                {saved && <span className={rStyles.ok}>✓</span>}
                {err   && <span className={rStyles.errMsg}>{err}</span>}
            </td>
        </tr>
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

    const now      = Date.now();
    const filtered = games.filter(g => {
        if (filter === 'all')      return true;
        if (filter === 'active')   return g.status !== 'scheduled' || new Date(g.starts_at).getTime() <= now;
        if (filter === 'live')     return g.status === 'live';
        if (filter === 'finished') return g.status === 'finished';
        return true;
    });

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div>
            <div className={styles.header}>
                <h2>Výsledky</h2>
                <div style={{ display:'flex', gap:'6px' }}>
                    {[['active','Aktívne'], ['live','Prebiehajúce'], ['finished','Odohranné'], ['all','Všetky']].map(([v,l]) => (
                        <button key={v}
                            className={filter === v ? styles.btn : styles.btnSmall}
                            onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>
            </div>

            {filtered.length === 0
                ? <p style={{color:'#aaa',marginTop:20}}>Žiadne zápasy</p>
                : <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Zápas</th>
                            <th>Stav</th>
                            <th>Skóre</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(g => <ResultRow key={g.id} game={g} />)}
                    </tbody>
                  </table>}
        </div>
    );
}
