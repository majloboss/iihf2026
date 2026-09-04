import { useState, useEffect } from 'react';
import { getGames } from '../../api/games';
import usePhases from '../../hooks/usePhases';
import { useCompetition } from '../../context/CompetitionContext';
import GameModal from './GameModal';
import AdminGamesTable from './AdminGamesTable';
import styles from './Admin.module.css';

const FLAG_IIHF = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

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
    const { activeCompetition } = useCompetition();
    const { fazy } = usePhases(activeCompetition?.id);
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

    // Fázy aj ich skratky určuje číselník. Zápas, ktorý ešte nie je naviazaný
    // (migrácia 075 nebežala), sa priradí podľa starého stĺpca `phase`.
    const kodFazy = (g) => g.match_stat_code ?? g.phase;
    const popisFazy = (kod) => fazy.find(f => f.code === kod)?.label ?? kod;
    const phases = ['all', ...fazy.map(f => f.code)];
    const filtered = (phase === 'all' ? games : games.filter(g => kodFazy(g) === phase))
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
                            className={phase === p ? styles.btnPhaseActive : styles.btnPhase}
                            onClick={() => setPhase(p)}>
                            {p === 'all' ? 'Všetky' : popisFazy(p)}
                        </button>
                    ))}
                </div>
            </div>

            <AdminGamesTable
                rows={filtered.map(g => {
                    const st = effectiveStatus(g);
                    const teamCell = (code) => code
                        ? <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                            <img src={FLAG_IIHF(code)} alt="" style={{width:22, height:14, borderRadius:2}} onError={e => e.target.style.display='none'} />{code}
                          </span>
                        : <span style={{color:'#aaa'}}>TBD</span>;
                    const result = st === 'finished' && g.score1 != null
                        ? (g.final1 != null && g.score1 === g.score2 ? `${g.final1}:${g.final2} pp` : `${g.score1}:${g.score2}`)
                        : null;
                    return {
                        key: g.id,
                        number: g.game_number,
                        phaseLabel: popisFazy(kodFazy(g)),
                        dateLocal: formatLocal(g.starts_at),
                        homeCell: teamCell(g.team1),
                        awayCell: teamCell(g.team2),
                        result,
                        venue: g.venue,
                        status: st,
                        flashscore_url: g.flashscore_url,
                        raw: g,
                    };
                })}
                onEdit={setEditing}
            />

            {editing && <GameModal game={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
        </div>
    );
}
