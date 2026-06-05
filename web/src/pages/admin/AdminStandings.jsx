import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
import styles from '../user/Standings.module.css';

const BUCKETS = ['pts7','pts6','pts5','pts4','pts3','pts2','pts1','pts0'];
const BUCKET_LABELS = ['7','6','5','4','3','2','1','0'];

function GroupTable({ group }) {
    return (
        <div className={styles.groupCard}>
            <div className={styles.groupName}>{group.name}</div>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Hráč</th>
                        <th className={styles.right}>Body</th>
                        <th className={styles.right}>
                            <div className={styles.bucketRow}>
                                {BUCKET_LABELS.map(l => <span key={l} className={styles.bucketHead}>{l}</span>)}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {group.members.map((m, i) => (
                        <tr key={m.user_id}>
                            <td className={`${styles.rank} ${i === 0 ? styles.top1 : i === 1 ? styles.top2 : i === 2 ? styles.top3 : ''}`}>
                                {i + 1}.
                            </td>
                            <td>
                                <div className={styles.player}>
                                    {m.avatar
                                        ? <img src={m.avatar} className={styles.avatar} alt="" />
                                        : <span className={styles.avatarPh}>{m.username[0].toUpperCase()}</span>}
                                    {m.username}
                                </div>
                            </td>
                            <td className={`${styles.right} ${styles.pts}`}>{m.total_points}</td>
                            <td className={styles.right}>
                                <div className={styles.bucketRow}>
                                    {BUCKETS.map(b => (
                                        <span key={b} className={`${styles.bucketCell} ${m[b] ? '' : styles.bucketZero}`}>{m[b]}</span>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminStandings() {
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? null;
    const [groups,  setGroups]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        const url = compId ? `v1/admin/standings?competition_id=${compId}` : 'v1/admin/standings';
        apiFetch(url)
            .then(data => { setGroups(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, [compId]);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div className={styles.wrap}>
            <h2 className={styles.title}>Tabuľky</h2>
            {groups.length === 0
                ? <p className={styles.empty}>Žiadne skupiny.</p>
                : groups.map(g => <GroupTable key={g.id} group={g} />)}
        </div>
    );
}
