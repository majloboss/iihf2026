import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import styles from '../user/Standings.module.css';

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
                        <th className={styles.right}>3-2-1-0</th>
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
                            <td className={`${styles.right} ${styles.tipsCount}`}>{m.pts3}-{m.pts2}-{m.pts1}-{m.pts0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminStandings() {
    const [groups,  setGroups]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        apiFetch('v1/admin/standings')
            .then(data => { setGroups(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, []);

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
