import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import Bracket from '../../components/Bracket';
import { useCompetition } from '../../context/CompetitionContext';
import FifaGroupStandings from './FifaGroupStandings';
import { Flag } from '../../components/Flag';
import styles from './GroupStandings.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

function GroupTable({ phase, teams, onTeamClick }) {
    return (
        <div className={styles.groupCard}>
            <div className={styles.groupHeader}>Skupina {phase}</div>
            <div className={styles.tableWrap}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th className={styles.left}>#</th>
                        <th className={styles.left}>Tím</th>
                        <th>Z</th>
                        <th>V</th>
                        <th className={styles.thOt}>VP</th>
                        <th className={styles.thOt}>PP</th>
                        <th>P</th>
                        <th>GS:GP</th>
                        <th>+/-</th>
                        <th>B</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((t, i) => (
                        <tr key={t.team}
                            className={[
                                i < 4 ? (i === 3 ? styles['last-qualified'] : styles.qualified) : '',
                                onTeamClick ? styles.teamRow : ''
                            ].join(' ')}
                            onClick={() => onTeamClick?.(t.team)}
                        >
                            <td className={styles.left}>
                                <span className={styles.rank}>{i + 1}.</span>
                            </td>
                            <td className={styles.left}>
                                <div className={styles.teamCell}>
                                    <Flag code={t.team} compId={1} className={styles.flag} />
                                    {t.team}
                                </div>
                            </td>
                            <td>{t.gp}</td>
                            <td>{t.w}</td>
                            <td className={styles.tdOt}>{t.otw ?? 0}</td>
                            <td className={styles.tdOt}>{t.otl ?? 0}</td>
                            <td>{t.l}</td>
                            <td>{t.gf}:{t.ga}</td>
                            <td className={t.gd > 0 ? styles.pos : t.gd < 0 ? styles.neg : ''}>
                                {t.gd > 0 ? '+' : ''}{t.gd}
                            </td>
                            <td className={styles.pts}>{t.pts}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

export default function GroupStandings({ onTeamClick }) {
    const navigate = useNavigate();
    const { activeCompetition } = useCompetition();
    if (activeCompetition?.slug === 'fifa2026') return <FifaGroupStandings onTeamClick={onTeamClick} />;
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    // Tabuľky a pavúk sú dva pohľady na tú istú súťaž, ako v UCL.
    const [pohlad,  setPohlad]  = useState('tabulka');

    const handleTeamClick = onTeamClick
        ?? ((team) => navigate('/games', { state: { team } }));

    useEffect(() => {
        apiFetch('v1/group-standings')
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;
    if (!data)   return null;

    return (
        <div className={styles.wrap}>
            <div style={{ display: 'flex', gap: 4, margin: '0 0 14px',
                          borderBottom: '1px solid #e9ecef' }}>
                {[['tabulka', 'Skupiny'], ['pavuk', 'Play-off']].map(([k, popis]) => (
                    <button key={k} onClick={() => setPohlad(k)}
                        style={{ padding: '8px 18px', border: 'none', background: 'none',
                                 cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                                 marginBottom: -2,
                                 borderBottom: '2px solid ' + (pohlad === k ? '#1a3a6b' : 'transparent'),
                                 color: pohlad === k ? '#1a3a6b' : '#999' }}>
                        {popis}
                    </button>
                ))}
            </div>

            {pohlad === 'pavuk' ? <Bracket competitionId={activeCompetition?.id} /> : <>
                <GroupTable phase="A" teams={data.A || []} onTeamClick={handleTeamClick} />
                <GroupTable phase="B" teams={data.B || []} onTeamClick={handleTeamClick} />
            </>}
        </div>
    );
}
