import { useState, useEffect } from 'react';
import { getGames } from '../../api/games';
import GameModal from './GameModal';
import styles from './Admin.module.css';

const PHASE_LABEL = { A: 'Sk. A', B: 'Sk. B', QF: 'Štvrťf.', SF: 'Semif.', BRONZE: 'Bronz', GOLD: 'Finále' };

function effectiveStatus(g) {
    if (g.status === 'finished') return 'finished';
    if (Date.now() >= new Date(g.starts_at).getTime()) return 'live';
    return 'scheduled';
}

function formatLocal(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminGames() {
    const [games,   setGames]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [editing, setEditing] = useState(null);
    const [phase,   setPhase]   = useState('all');

    useEffect(() => {
        getGames()
            .then(data => { setGames(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, []);

    const handleSaved = (updated) => {
        setGames(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
        setEditing(null);
    };

    const phases = ['all', 'A', 'B', 'QF', 'SF', 'BRONZE', 'GOLD'];
    const filtered = (phase === 'all' ? games : games.filter(g => g.phase === phase))
        .slice().sort((a, b) => a.game_number - b.game_number);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div>
            <div className={styles.header}>
                <h2>Zápasy</h2>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    {phases.map(p => (
                        <button key={p}
                            className={phase === p ? styles.btn : styles.btnSmall}
                            onClick={() => setPhase(p)}>
                            {p === 'all' ? 'Všetky' : (PHASE_LABEL[p] || p)}
                        </button>
                    ))}
                </div>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Fáza</th>
                        <th>Dátum / čas (UTC)</th>
                        <th>Tím 1</th>
                        <th>Tím 2</th>
                        <th>Miesto</th>
                        <th>Stav</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(g => (
                        <tr key={g.id}>
                            <td>{g.game_number}</td>
                            <td><span className={styles.badge}>{PHASE_LABEL[g.phase] || g.phase}</span></td>
                            <td>{formatLocal(g.starts_at)}</td>
                            <td>{g.team1 || <span style={{color:'#aaa'}}>TBD</span>}</td>
                            <td>{g.team2 || <span style={{color:'#aaa'}}>TBD</span>}</td>
                            <td style={{fontSize:'0.82rem',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.venue}</td>
                            <td><span className={effectiveStatus(g) === 'finished' ? styles.badgeAdmin : effectiveStatus(g) === 'live' ? styles.badgeLive : styles.badge}>{effectiveStatus(g)}</span></td>
                            <td style={{display:'flex', alignItems:'center', gap:6}}>
                                {g.flashscore_url && (
                                    <a href={g.flashscore_url} target="_blank" rel="noopener noreferrer" title="FlashScore">
                                        <img src="/flashscore.png" alt="FS" style={{width:18,height:18,borderRadius:4,opacity:0.85,verticalAlign:'middle'}} />
                                    </a>
                                )}
                                <button className={styles.btnSmall} onClick={() => setEditing(g)}>Upraviť</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {editing && <GameModal game={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
        </div>
    );
}
