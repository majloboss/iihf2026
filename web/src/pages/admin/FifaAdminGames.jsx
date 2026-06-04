import { useState, useEffect } from 'react';
import { getFifaGames } from '../../api/fifaGames';
import { getFifaTeams } from '../../api/fifaAdmin';
import FifaGameModal from './FifaGameModal';
import styles from './Admin.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const PHASE_LABEL = {
    GROUP_A:'Sk. A', GROUP_B:'Sk. B', GROUP_C:'Sk. C', GROUP_D:'Sk. D',
    GROUP_E:'Sk. E', GROUP_F:'Sk. F', GROUP_G:'Sk. G', GROUP_H:'Sk. H',
    GROUP_I:'Sk. I', GROUP_J:'Sk. J', GROUP_K:'Sk. K', GROUP_L:'Sk. L',
    R32:'R32', R16:'R16', QF:'ŠF', SF:'SF', BM:'Bronz', F:'Finále',
};
const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;

function fmt(iso) {
    const d = new Date(iso + 'Z');
    return d.toLocaleDateString('sk-SK', { day:'2-digit', month:'2-digit' })
        + ' ' + d.toLocaleTimeString('sk-SK', { hour:'2-digit', minute:'2-digit' });
}

export default function FifaAdminGames() {
    const [games, setGames]     = useState([]);
    const [teams, setTeams]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [phase, setPhase]     = useState('all');
    const [editing, setEditing] = useState(null);

    const load = () => Promise.all([getFifaGames(), getFifaTeams()])
        .then(([g, t]) => { setGames(g); setTeams(t); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });

    useEffect(() => { load(); }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    const phases = ['all', ...GROUP_CODES, 'R32','R16','QF','SF','BM','F'];
    const filtered = games.filter(g => {
        if (phase === 'all') return true;
        if (GROUP_CODES.includes(phase)) return g.game_type_code === `GROUP_${phase}`;
        return g.game_type_code === phase;
    }).sort((a, b) => a.game_id - b.game_id);

    return (
        <div>
            {editing && (
                <FifaGameModal game={editing} teams={teams}
                    onClose={() => setEditing(null)} onSaved={load} />
            )}
            <div className={styles.header}>
                <h2>Zápasy FIFA</h2>
                <div style={{display:'flex', gap:4, flexWrap:'wrap'}}>
                    {phases.map(p => (
                        <button key={p} onClick={() => setPhase(p)}
                            style={{
                                padding:'4px 9px', borderRadius:6, cursor:'pointer',
                                fontSize:'0.8rem', fontWeight:600, minWidth:30,
                                border:'1px solid ' + (phase === p ? '#1a3a6b' : '#dee2e6'),
                                background: phase === p ? '#1a3a6b' : '#fff',
                                color: phase === p ? '#fff' : '#555',
                            }}>
                            {p === 'all' ? 'Všetky' : p === 'BM' ? 'Bronz' : p}
                        </button>
                    ))}
                </div>
            </div>

            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th><th>Fáza</th><th>Dátum</th><th>Domáci</th><th></th><th>Hostia</th><th>Výsledok</th><th>Štadión</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map(g => (
                        <tr key={g.game_id}>
                            <td>{g.game_id}</td>
                            <td>{PHASE_LABEL[g.game_type_code] || g.game_type_code}</td>
                            <td style={{whiteSpace:'nowrap'}}>{fmt(g.start_time)}</td>
                            <td style={{textAlign:'right', whiteSpace:'nowrap'}}>
                                {g.home_code ? <>{g.home_name} <img src={FLAG_URL(g.home_code)} alt="" style={{width:22,height:14,verticalAlign:'middle',marginLeft:4}} onError={e=>e.target.style.display='none'} /></> : <span style={{color:'#bbb'}}>TBD</span>}
                            </td>
                            <td style={{textAlign:'center', color:'#aaa'}}>–</td>
                            <td style={{whiteSpace:'nowrap'}}>
                                {g.away_code ? <><img src={FLAG_URL(g.away_code)} alt="" style={{width:22,height:14,verticalAlign:'middle',marginRight:4}} onError={e=>e.target.style.display='none'} /> {g.away_name}</> : <span style={{color:'#bbb'}}>TBD</span>}
                            </td>
                            <td style={{textAlign:'center', fontWeight:700, color: g.result_approved ? '#28a745' : '#ccc'}}>
                                {g.result_approved && g.home_score_regular != null ? `${g.home_score_regular}:${g.away_score_regular}` : '—'}
                            </td>
                            <td style={{fontSize:'0.8rem', color:'#888'}}>{g.venue}</td>
                            <td>
                                <button onClick={() => setEditing(g)}
                                    style={{padding:'3px 10px', borderRadius:6, cursor:'pointer',
                                        border:'1px solid #1a3a6b', background:'#fff', color:'#1a3a6b',
                                        fontSize:'0.78rem', whiteSpace:'nowrap'}}>
                                    Upraviť
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
