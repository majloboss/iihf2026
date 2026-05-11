import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
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
                                    <img src={FLAG_URL(t.team)} className={styles.flag} alt=""
                                        onError={e => e.target.style.display = 'none'} />
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
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

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
            <GroupTable phase="A" teams={data.A || []} onTeamClick={onTeamClick} />
            <GroupTable phase="B" teams={data.B || []} onTeamClick={onTeamClick} />
        </div>
    );
}
