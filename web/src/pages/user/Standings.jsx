import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Flag } from '../../components/Flag';
import styles from './Standings.module.css';
import gStyles from './Games.module.css';

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

    if (loading) return <tr><td colSpan={9} style={{padding:'8px 16px',color:'#aaa'}}>Načítavam…</td></tr>;
    if (error)   return <tr><td colSpan={9} style={{padding:'8px 16px',color:'#c0392b'}}>{error}</td></tr>;
    if (!data?.tips?.length) return <tr><td colSpan={9} style={{padding:'8px 16px',color:'#aaa'}}>Žiadne ukončené zápasy.</td></tr>;

    const flag = (code) => compId === 2
        ? `/flags/fifa_flag_${code?.toLowerCase()}.png`
        : `/flags/team_flag_${code?.toLowerCase()}.png`;
    const fmtDate = (iso) => {
        const d = new Date(iso);
        const day = String(d.getDate()).padStart(2,'0');
        const mon = String(d.getMonth()+1).padStart(2,'0');
        const h   = String(d.getHours()).padStart(2,'0');
        const m   = String(d.getMinutes()).padStart(2,'0');
        return { full: `${day}.${mon} ${h}:${m}`, time: `${h}:${m}` };
    };

    const ptsColor = (p) => p === null ? '#aaa' : p >= 5 ? '#27ae60' : p >= 3 ? '#e67e22' : p > 0 ? '#2980b9' : '#c0392b';

    // Flex layout — žiadne tabuľkové preteky, body sú vždy viditeľné
    const cell = { display:'flex', alignItems:'center', fontSize:'0.72rem' };
    return (
        <tr>
            <td colSpan={9} style={{padding:'0 0 4px 0', background:'#f8f9fa'}}>
                {/* hlavička */}
                <div style={{...cell, background:'#e9ecef', color:'#666', padding:'3px 8px', fontWeight:600}}>
                    <span style={{flex:'0 0 78px'}}>Dátum</span>
                    <span className="tipMatchCol" style={{flex:'1 1 0', minWidth:0}}>Zápas</span>
                    <span style={{flex:'0 0 44px', textAlign:'center', display:'block'}}>Výsl</span>
                    <span style={{flex:'0 0 44px', textAlign:'center', display:'block'}}>Tip</span>
                    <span style={{flex:'0 0 28px', textAlign:'center', display:'block'}}>B</span>
                </div>
                {data.tips.map(t => (
                    <div key={t.game_id} style={{...cell, padding:'2px 8px', borderBottom:'1px solid #dee2e6'}}>
                        <span style={{flex:'0 0 78px', color:'#888'}}>{fmtDate(t.starts_at).full}</span>
                        <span className="tipMatchCol" style={{flex:'1 1 0', minWidth:0, display:'flex', alignItems:'center', overflow:'hidden', whiteSpace:'nowrap'}}>
                            <Flag code={t.team1} compId={compId} width={13} height={9} style={{marginRight:2, flexShrink:0}} />
                            {t.team1}
                            <span style={{color:'#999', margin:'0 3px'}}>:</span>
                            <Flag code={t.team2} compId={compId} width={13} height={9} style={{marginRight:2, flexShrink:0}} />
                            {t.team2}
                        </span>
                        <span style={{flex:'0 0 44px', textAlign:'center', display:'block'}}>
                            {t.score1 !== null ? `${t.score1}:${t.score2}` : '—'}
                        </span>
                        <span style={{flex:'0 0 44px', textAlign:'center', display:'block'}}>
                            {t.tip1 !== null ? `${t.tip1}:${t.tip2}` : <span style={{color:'#aaa'}}>—</span>}
                        </span>
                        <span style={{flex:'0 0 28px', textAlign:'center', display:'block', fontWeight:700, color:ptsColor(t.points)}}>
                            {t.points !== null ? t.points : '—'}
                        </span>
                    </div>
                ))}
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

    // Vlastný tooltip: zoradí hráčov podľa bodov v danom bode (poradie), najvyšší navrchu
    const RankTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const sorted = payload
            .filter(p => p.value !== null && p.value !== undefined)
            .sort((a, b) => b.value - a.value);
        return (
            <div style={{background:'#fff', border:'1px solid #dee2e6', borderRadius:6,
                padding:'6px 8px', fontSize:'0.72rem', boxShadow:'0 2px 6px rgba(0,0,0,0.12)'}}>
                {sorted.map((p, i) => (
                    <div key={p.dataKey} style={{display:'flex', alignItems:'center', gap:4, padding:'1px 0'}}>
                        <span style={{color:'#888', width:18}}>{i + 1}.</span>
                        <span style={{width:8, height:8, borderRadius:'50%', background:p.stroke, display:'inline-block', flexShrink:0}} />
                        <span style={{flex:1, color:'#222'}}>{p.dataKey}</span>
                        <span style={{fontWeight:700, color:'#1a3a6b', marginLeft:6}}>{p.value} b</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{padding:'12px 0 4px'}}>
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{top:4, right:8, left:0, bottom:4}}>
                    <XAxis dataKey="name" tick={false} />
                    <YAxis tick={{fontSize:10}} width={28} />
                    <Tooltip content={<RankTooltip />} />
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

    // V Global view má každá "skupina" (= turnaj) vlastné competition_id
    const effCompId = group.competition_id ?? compId;

    const toggle = (uid) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(uid) ? next.delete(uid) : next.add(uid);
            return next;
        });
    };

    return (
        <div className={styles.groupCard}>
            <div style={{display:'flex', alignItems:'stretch'}}>
                <div className={styles.groupName} style={{flex:1, display:'flex', alignItems:'center'}}>{group.name}</div>
                {group.members.length > 1 && (
                    <button onClick={() => setShowChart(v => !v)}
                        style={{fontSize:'0.75rem', border:'none', borderLeft:'1px solid rgba(255,255,255,0.2)',
                            padding:'0 12px', cursor:'pointer',
                            background: showChart ? '#12294a' : '#1a3a6b',
                            color: '#fff', flexShrink:0}}>
                        {showChart ? '▲ Graf' : '▼ Graf'}
                    </button>
                )}
            </div>
            {showChart && <GroupChart members={group.members} compId={effCompId} />}
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
                                <td className={styles.playerCell}>
                                    <div className={styles.player}>
                                        {m.avatar
                                            ? <img src={m.avatar} className={styles.avatar} alt="" />
                                            : <span className={styles.avatarPh}>{m.username[0].toUpperCase()}</span>}
                                        <span className={styles.playerName}>{m.username}</span>
                                        <span style={{marginLeft:1, color:'#aaa', fontSize:'0.7rem', flexShrink:0}}>
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
                            rows.push(<PlayerTips key={`tips-${m.user_id}`} userId={m.user_id} compId={effCompId} />);
                        }
                        return rows;
                    })}
                </tbody>
            </table>
        </div>
    );
}

// Záložka Skupiny — súčasná funkcionalita (skupiny pre zvolený turnaj)
// Štítok fázy pre filter — rovnaké označenia ako v Zápasoch (LF1, BAR, R16…).
// Dvojzápas sa rozlíši číslom: SF1 je prvý zápas, SF2 odveta.
//
// Skratka sa určí z kódu fázy, a keď ho súťaž nemá (IIHF), odvodí sa z názvu.
// Celý názov by na tlačidle nemal čo robiť — bol by široký cez pol obrazovky.
const SKRATKY_KOD = { PO: 'BAR', R16: 'R16', QF: 'QF', SF: 'SF', F: 'F' };

// Názvy fáz sa medzi súťažami líšia jazykom aj pomenovaním: UCL má slovenské,
// FIFA anglické, IIHF používa rovno skratky. Preto sa hľadá podľa fragmentu,
// nie podľa začiatku názvu.
const SKRATKY_NAZOV = [
    [/baráž/i, 'BAR'],
    [/osemfinále|round of 16/i, 'R16'],
    [/round of 32/i, 'R32'],
    [/štvrťfinále|quarter/i, 'QF'],
    [/semifinále|semi-?final/i, 'SF'],
    [/o 3\. miesto|bronz|bronze/i, 'BRO'],
    [/finále|final|gold/i, 'F'],
];

function kratkaFaza(f) {
    const kolo = f.phase.match(/(\d+)\. kolo/);
    if (kolo) return `LF${kolo[1]}`;

    // Skupina si nesie svoje písmeno. Predpona `SK` je nutná: samotné `F` by
    // kolidovalo s finále a `S` zase so semifinále (SF).
    const skupina = f.phase.match(/skupina\s+(\w+)/i);
    if (skupina) return `SK${skupina[1].toUpperCase()}`;

    let zaklad = SKRATKY_KOD[f.code];
    if (!zaklad) {
        for (const [vzor, kratky] of SKRATKY_NAZOV) {
            if (vzor.test(f.phase)) { zaklad = kratky; break; }
        }
    }
    if (!zaklad) zaklad = f.code || f.phase.slice(0, 3).toUpperCase();

    // Poradie zápasu len tam, kde sa hrá na dva.
    if (/odveta/i.test(f.phase))       return `${zaklad}2`;
    if (/1\.\s*zápas/i.test(f.phase)) return `${zaklad}1`;
    return zaklad;
}

// Farby tlačidiel podľa dôležitosti fázy — rovnaké ako v Zápasoch.
function farbaFazy(f, on) {
    const kolo   = /\d+\. kolo/.test(f.phase);
    const finale = f.code === 'F'  || /^(finále|final|gold)/i.test(f.phase);
    const baraz  = f.code === 'PO' || /^baráž/i.test(f.phase);
    const [zakl, akt] =
          finale ? [gStyles.pGold, gStyles.pGoldOn]
        : baraz  ? [gStyles.pPlayin, gStyles.pPlayinOn]
        : kolo   ? [gStyles.pGroup, gStyles.pGroupOn]
        : [gStyles.pPlayoff, gStyles.pPlayoffOn];
    return [gStyles.pBtn, zakl, on ? akt : ''].join(' ');
}

function GroupsView({ currentUserId, compId }) {
    const [groups,  setGroups]  = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [fazy,    setFazy]    = useState([]);
    const [faza,    setFaza]    = useState('');   // '' = celá súťaž

    useEffect(() => {
        setLoading(true);
        const q = new URLSearchParams();
        if (compId) q.set('competition_id', compId);
        if (faza)   q.set('phase', faza);
        const url = q.toString() ? `v1/standings?${q}` : 'v1/standings';
        apiFetch(url)
            .then(data => { setGroups(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, [compId, faza]);

    // Zoznam kôl sa načíta raz pre súťaž. Bez súťaže (Global) sa nenačítava
    // nič — zoznam sa vtedy nechá prázdny a filter sa nezobrazí.
    useEffect(() => {
        if (!compId) return;
        let zive = true;
        apiFetch(`v1/standings-phases?competition_id=${compId}`)
            .then(d => { if (zive) setFazy(d); })
            .catch(() => { if (zive) setFazy([]); });
        return () => { zive = false; };
    }, [compId]);

    // Pri zmene súťaže sa výber zruší — kolá inej súťaže by tam nesedeli.
    // Rieši sa odvodením, nie efektom, aby nevznikol render navyše.
    const zoznamFaz = fazy.map(f => f.phase);
    const aktivnaFaza = zoznamFaz.includes(faza) ? faza : '';

    // Filter kôl stojí nad tabuľkami a platí pre všetky skupiny naraz.
    const filter = fazy.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            <button onClick={() => setFaza('')} title="Celá súťaž"
                    className={[gStyles.pBtn, gStyles.pGroup,
                                aktivnaFaza === '' ? gStyles.pGroupOn : ''].join(' ')}>
                ALL
            </button>
            {fazy.map(f => (
                <button key={f.phase} onClick={() => setFaza(f.phase)}
                        title={`${f.phase} · ${f.games} zápasov`}
                        className={farbaFazy(f, aktivnaFaza === f.phase)}>
                    {kratkaFaza(f)}
                </button>
            ))}
        </div>
    );

    if (loading) return <>{filter}<p>Načítavam…</p></>;
    if (error)   return <>{filter}<p style={{color:'red'}}>Chyba: {error}</p></>;

    return (
        <>
            {filter}
            {groups.length === 0
                ? <p className={styles.empty}>Nie si v žiadnej skupine.</p>
                : groups.map(g => <GroupTable key={g.id} group={g}
                                              currentUserId={currentUserId} compId={compId} />)}
        </>
    );
}

// Záložka Global — všetci tipéri po turnajoch (zoradené podľa dátumu turnaja)
function GlobalView({ currentUserId }) {
    const [comps,   setComps]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        setLoading(true);
        apiFetch('v1/global-standings')
            .then(data => { setComps(data); setLoading(false); })
            .catch(e   => { setError(e.message); setLoading(false); });
    }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    return comps.length === 0
        ? <p className={styles.empty}>Žiadne turnaje.</p>
        : comps.map(c => <GroupTable key={c.id} group={c} currentUserId={currentUserId} compId={c.competition_id} />);
}

// Záložka Sieň slávy — kumulované body z top 10 umiestnení po turnajoch
function HallOfFame({ currentUserId }) {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [sub,     setSub]     = useState('global');
    const [expanded, setExpanded] = useState(new Set());

    useEffect(() => {
        apiFetch('v1/hall-of-fame')
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    const toggle = (uid) => setExpanded(prev => {
        const next = new Set(prev);
        next.has(uid) ? next.delete(uid) : next.add(uid);
        return next;
    });

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;

    const rows = data?.[sub] || [];

    return (
        <div>
            <div className={styles.hofSubTabs}>
                <button className={sub === 'global'   ? styles.hofSubTabActive : styles.hofSubTab} onClick={() => setSub('global')}>Globálna</button>
                <button className={sub === 'football' ? styles.hofSubTabActive : styles.hofSubTab} onClick={() => setSub('football')}>Futbal</button>
                <button className={sub === 'hockey'   ? styles.hofSubTabActive : styles.hofSubTab} onClick={() => setSub('hockey')}>Hokej</button>
            </div>

            {!data?.finished?.length && (
                <p className={styles.hofPlaceholder}>
                    Zatiaľ neskončil žiadny turnaj. Sieň slávy sa naplní po zadaní výsledku posledného zápasu turnaja.
                </p>
            )}

            {data?.finished?.length > 0 && rows.length === 0 && (
                <p className={styles.empty}>V tejto kategórii zatiaľ nikto nezískal body.</p>
            )}

            {rows.map((r, i) => (
                <div key={r.user_id}>
                    <div className={styles.hofRow}
                        onClick={() => toggle(r.user_id)}
                        style={r.user_id === currentUserId ? {borderColor:'#1a3a6b', borderWidth:2} : undefined}>
                        <span className={`${styles.hofRank} ${i === 0 ? styles.hofRank1 : i === 1 ? styles.hofRank2 : i === 2 ? styles.hofRank3 : ''}`}>
                            {i + 1}.
                        </span>
                        {r.avatar
                            ? <img src={r.avatar} className={styles.hofAvatar} alt="" />
                            : <span className={styles.hofAvatarPh}>{r.username[0].toUpperCase()}</span>}
                        <span className={styles.hofName}>{r.username}</span>
                        <span className={styles.hofPoints}>{r.points} b</span>
                        <span className={styles.hofCaret}>{expanded.has(r.user_id) ? '▲' : '▼'}</span>
                    </div>
                    {expanded.has(r.user_id) && (
                        <div className={styles.hofDetail}>
                            {r.tournaments.map((t, j) => (
                                <div key={j} className={styles.hofDetailItem}>
                                    <span>{t.name}</span>
                                    <span>
                                        <span className={styles.hofDetailPlace}>{t.place}. miesto · </span>
                                        <span className={styles.hofDetailPts}>+{t.hof_points} b</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function Standings() {
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? null;

    const [tab, setTab] = useState('skupiny');

    const groupsTabLabel = activeCompetition?.name || 'Skupiny';

    return (
        <div className={styles.wrap}>
            <div className={styles.tabs}>
                <button className={tab === 'skupiny' ? styles.tabActive : styles.tab} onClick={() => setTab('skupiny')}>{groupsTabLabel}</button>
                <button className={tab === 'global'  ? styles.tabActive : styles.tab} onClick={() => setTab('global')}>Global</button>
                <button className={tab === 'sien'    ? styles.tabActive : styles.tab} onClick={() => setTab('sien')}>Sieň slávy</button>
            </div>

            {tab === 'skupiny' && <GroupsView currentUserId={user?.user_id} compId={compId} />}
            {tab === 'global'  && <GlobalView currentUserId={user?.user_id} />}
            {tab === 'sien'    && <HallOfFame currentUserId={user?.user_id} />}
        </div>
    );
}
