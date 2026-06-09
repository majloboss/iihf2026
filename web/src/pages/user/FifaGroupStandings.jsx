import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import FifaThirdPlaced from './FifaThirdPlaced';
import { Flag } from '../../components/Flag';
import styles from './GroupStandings.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FLAG_URL    = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;

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
                            <th>R</th>
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
                                    i < 2 ? styles.qualified : '',
                                    i === 1 ? styles['last-qualified'] : '',
                                    onTeamClick ? styles.teamRow : ''
                                ].join(' ')}
                                onClick={() => onTeamClick?.(t.team)}
                            >
                                <td className={styles.left}>
                                    <span className={styles.rank}>{i + 1}.</span>
                                </td>
                                <td className={styles.left}>
                                    <div className={styles.teamCell}>
                                        <Flag code={t.team} compId={2} className={styles.flag} />
                                        {t.team}
                                    </div>
                                </td>
                                <td>{t.gp}</td>
                                <td>{t.w}</td>
                                <td>{t.d}</td>
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

export default function FifaGroupStandings({ onTeamClick }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        apiFetch('v1/fifa/standings')
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;
    if (!data)   return null;

    return (
        <div className={styles.wrap}>
            {GROUP_CODES.map(g => (
                <GroupTable key={g} phase={g} teams={data[g] || []} onTeamClick={onTeamClick} />
            ))}
            <FifaThirdPlaced data={data} onTeamClick={onTeamClick} />
        </div>
    );
}
