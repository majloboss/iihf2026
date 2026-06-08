import { useState, useEffect } from 'react';
import { getFifaGames } from '../../api/fifaGames';
import { getFifaTeams } from '../../api/fifaAdmin';
import FifaGameModal from './FifaGameModal';
import AdminGamesTable from './AdminGamesTable';
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

    const phases = ['all', ...GROUP_CODES.map(g => `GROUP_${g}`), 'R32','R16','QF','SF','BM','F'];
    const phaseLabel = (p) => p === 'all' ? 'Všetky'
        : p.startsWith('GROUP_') ? p.slice(6)
        : p === 'BM' ? 'Bronz' : p;
    const filtered = games.filter(g => phase === 'all' || g.game_type_code === phase)
        .sort((a, b) => a.game_id - b.game_id);

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
                            {phaseLabel(p)}
                        </button>
                    ))}
                </div>
            </div>

            <AdminGamesTable
                rows={filtered.map(g => {
                    const teamCell = (code, name) => code
                        ? <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                            <img src={FLAG_URL(code)} alt="" style={{width:22, height:14, borderRadius:2}} onError={e => e.target.style.display='none'} />{code}
                          </span>
                        : <span style={{color:'#aaa'}}>TBD</span>;
                    return {
                        key: g.game_id,
                        number: g.game_id,
                        phaseLabel: PHASE_LABEL[g.game_type_code] || g.game_type_code,
                        dateLocal: fmt(g.start_time),
                        homeCell: teamCell(g.home_code, g.home_name),
                        awayCell: teamCell(g.away_code, g.away_name),
                        result: g.result_approved && g.home_score_regular != null ? `${g.home_score_regular}:${g.away_score_regular}` : null,
                        venue: g.venue,
                        status: g.result_approved ? 'finished' : 'scheduled',
                        flashscore_url: g.flashscore_url,
                        raw: g,
                    };
                })}
                onEdit={setEditing}
            />
        </div>
    );
}
