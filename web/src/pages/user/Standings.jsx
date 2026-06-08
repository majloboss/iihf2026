import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './Standings.module.css';

const BUCKETS = ['pts7','pts6','pts5','pts4','pts3','pts2','pts1','pts0'];
const BUCKET_LABELS = ['7','6','5','4','3','2','1','0'];

const LINE_COLORS = ['#1a3a6b','#e67e22','#27ae60','#c0392b','#8e44ad','#16a085','#d35400','#2980b9','#f39c12','#7f8c8d'];

function PlayerTips({ userId, compId }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        apiFetch(`v1/player-tips?user_id=${userId}&competition_id=${compId}`)
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [userId, compId]);

    if (loading) return <tr><td colSpan={4} style={{padding:'8px 16px',color:'#aaa'}}>Načítavam…</td></tr>;
    if (error)   return <tr><td colSpan={4} style={{padding:'8px 16px',color:'#c0392b'}}>{error}</td></tr>;
    if (!data?.tips?.length) return <tr><td colSpan={4} style={{padding:'8px 16px',color:'#aaa'}}>Žiadne ukončené zápasy.</td></tr>;

    const flag = (code) => compId === 2
        ? `/flags/fifa_flag_${code?.toLowerCase()}.png`
        : `/flags/team_flag_${code?.toLowerCase()}.png`;
    const fmtDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleDateString('sk-SK', {day:'2-digit', month:'2-digit'}) + ' ' +
               d.toLocaleTimeString('sk-SK', {hour:'2-digit', minute:'2-digit'});
    };

    return (
        <tr>
            <td colSpan={4} style={{padding:'0 0 4px 0', background:'#f8f9fa'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%', minWidth:'320px', borderCollapse:'collapse', fontSize:'0.78rem', tableLayout:'fixed'}}>
                    <colgroup>
                        <col style={{width:'72px'}} />
                        <col />
                        <col style={{width:'36px'}} />
                        <col style={{width:'36px'}} />
                        <col style={{width:'24px'}} />
                    </colgroup>
                    <thead>
                        <tr style={{background:'#e9ecef', color:'#555'}}>
                            <th style={{padding:'4px 4px', textAlign:'left'}}>Dátum</th>
                            <th style={{padding:'4px 4px', textAlign:'left'}}>Zápas</th>
                            <th style={{padding:'4px 2px', textAlign:'center'}}>Výsl.</th>
                            <th style={{padding:'4px 2px', textAlign:'center'}}>Tip</th>
                            <th style={{padding:'4px 2px', textAlign:'center'}}>B</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.tips.map(t => (
                            <tr key={t.game_id} style={{borderBottom:'1px solid #dee2e6'}}>
                                <td style={{padding:'3px 4px', color:'#888', fontSize:'0.7rem', whiteSpace:'nowrap', overflow:'hidden'}}>{fmtDate(t.starts_at)}</td>
                                <td style={{padding:'3px 4px'}}>
                                    <div style={{display:'grid', gridTemplateColumns:'16px 1fr 8px 16px 1fr', alignItems:'center', gap:'0 2px'}}>
                                        <img src={flag(t.team1)} alt={t.team1} style={{width:16, height:11, objectFit:'cover'}} onError={e => e.target.style.display='none'} />
                                        <span style={{fontSize:'0.73rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.team1}</span>
                                        <span style={{fontSize:'0.73rem', textAlign:'center', color:'#555'}}>:</span>
                                        <img src={flag(t.team2)} alt={t.team2} style={{width:16, height:11, objectFit:'cover'}} onError={e => e.target.style.display='none'} />
                                        <span style={{fontSize:'0.73rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.team2}</span>
                                    </div>
                                </td>
                                <td style={{padding:'3px 2px', textAlign:'center', fontSize:'0.73rem', whiteSpace:'nowrap'}}>
                                    {t.score1 !== null ? `${t.score1}:${t.score2}` : '—'}
                                </td>
                                <td style={{padding:'3px 2px', textAlign:'center', fontSize:'0.73rem', whiteSpace:'nowrap'}}>
                                    {t.tip1 !== null ? `${t.tip1}:${t.tip2}` : <span style={{color:'#aaa'}}>—</span>}
                                </td>
                                <td style={{padding:'3px 2px', textAlign:'center', fontWeight:700, fontSize:'0.8rem',
                                    color: t.points === null ? '#aaa' : t.points >= 5 ? '#27ae60' : t.points >= 3 ? '#e67e22' : t.points > 0 ? '#2980b9' : '#c0392b'}}>
                                    {t.points !== null ? t.points : '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </td>
        </tr>
    );
}

function GroupChart({ members, compId }) {
    const [chartData, setChartData] = useState(null);
    const [loading,   setLoading]   = useState(true);

    useEffect(() => {
        if (!members.length) { setLoading(false); return; }
        Promise.all(
            members.map(m =>
                apiFetch(`v1/player-tips?user_id=${m.user_id}&competition_id=${compId}`)
                    .then(d => ({ username: m.username, chart: d.chart || [] }))
                    .catch(() => ({ username: m.username, chart: [] }))
            )
        ).then(results => {
            // Zlúč všetky game_id do jednej osi
            const allGames = [];
            const seen = new Set();
            results.forEach(r => r.chart.forEach(p => {
                if (!seen.has(p.game_id)) { seen.add(p.game_id); allGames.push({ game_id: p.game_id, label: p.label }); }
            }));
            if (!allGames.length) { setChartData([]); setLoading(false); return; }

            const merged = allGames.map(g => {
                const point = { name: g.label };
                results.forEach(r => {
                    const found = r.chart.find(p => p.game_id === g.game_id);
                    point[r.username] = found ? found.cumulative : null;
                });
                return point;
            });
            setChartData(merged);
            setLoading(false);
        });
    }, [members, compId]);

    if (loading) return <div style={{padding:'8px',color:'#aaa',fontSize:'0.8rem'}}>Načítavam graf…</div>;
    if (!chartData?.length) return null;

    return (
        <div style={{padding:'12px 0 4px'}}>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{top:4, right:8, left:0, bottom:4}}>
                    <XAxis dataKey="name" tick={false} />
                    <YAxis tick={{fontSize:10}} width={28} />
                    <Tooltip formatter={(v, name) => [v + ' b', name]} labelFormatter={l => l} />
                    <Legend wrapperStyle={{fontSize:'0.75rem'}} />
                    {members.map((m, i) => (
                        <Line key={m.user_id} type="monotone" dataKey={m.username}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            dot={false} strokeWidth={2} connectNulls />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function GroupTable({ group, currentUserId, compId }) {
    const [expanded, setExpanded] = useState(new Set());
    const [showChart, setShowChart] = useState(false);

    const toggle = (uid) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    };

    return (
        <div className={styles.groupCard}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div className={styles.groupName}>{group.name}</div>
                {group.members.length > 1 && (
                    <button onClick={() => setShowChart(v => !v)}
                        style={{fontSize:'0.75rem', border:'1px solid #dee2e6', borderRadius:6,
                            padding:'2px 8px', cursor:'pointer', background: showChart ? '#1a3a6b' : '#fff',
                            color: showChart ? '#fff' : '#555'}}>
                        {showChart ? '▲ Graf' : '▼ Graf'}
                    </button>
                )}
            </div>
            {showChart && <GroupChart members={group.members} compId={compId} />}
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
                    {group.members.flatMap((m, i) => {
                        const rows = [
                            <tr key={m.user_id}
                                className={m.user_id === currentUserId ? styles.me : ''}
                                onClick={() => toggle(m.user_id)}
                                style={{cursor:'pointer'}}>
                                <td className={`${styles.rank} ${i === 0 ? styles.top1 : i === 1 ? styles.top2 : i === 2 ? styles.top3 : ''}`}>
                                    {i + 1}.
                                </td>
                                <td>
                                    <div className={styles.player}>
                                        {m.avatar
                                            ? <img src={m.avatar} className={styles.avatar} alt="" />
                                            : <span className={styles.avatarPh}>{m.username[0].toUpperCase()}</span>}
                                        {m.username}
                                        <span style={{marginLeft:4, color:'#aaa', fontSize:'0.7rem'}}>
                                            {expanded.has(m.user_id) ? '▲' : '▼'}
                                        </span>
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
                        ];
                        if (expanded.has(m.user_id)) {
                            rows.push(<PlayerTips key={`tips-${m.user_id}`} userId={m.user_id} compId={compId} />);
                        }
                        return rows;
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function Standings() {
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? null;

    const [groups,  setGroups]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        const url = compId ? `v1/standings?competition_id=${compId}` : 'v1/standings';
        apiFetch(url)
            .then(data => { setGroups(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, [compId]);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return (
        <div className={styles.wrap}>
            {groups.length === 0
                ? <p className={styles.empty}>Nie si v žiadnej skupine.</p>
                : groups.map(g => <GroupTable key={g.id} group={g} currentUserId={user?.user_id} compId={compId} />)}
        </div>
    );
}
