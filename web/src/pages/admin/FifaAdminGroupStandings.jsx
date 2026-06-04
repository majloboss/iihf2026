import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { syncFifaStandings, updateFifaStanding, resetFifaStandings } from '../../api/fifaAdmin';
import FifaThirdPlaced from '../user/FifaThirdPlaced';
import styles from './AdminGroupStandings.module.css';
import gsStyles from '../user/GroupStandings.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;

function GroupTable({ phase, teams, finalized, onMove, onFinalize, busy }) {
    const move = (idx, dir) => {
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= teams.length) return;
        onMove(phase, idx, swapIdx);
    };
    return (
        <div className={gsStyles.groupCard}>
            <div className={gsStyles.groupHeader} style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <span>
                    Skupina {phase}
                    {finalized && <span className={styles.finalBadge}>✓ Finalizovaná</span>}
                    {!finalized && teams.some(t => t.gp > 0) && <span className={styles.liveBadge}>Live</span>}
                </span>
                {!finalized && teams.length > 0 && (
                    <button className={styles.btnFinalize} style={{padding:'3px 10px', fontSize:'0.72rem'}}
                        onClick={() => onFinalize(phase)} disabled={busy}>✓ Finalizovať</button>
                )}
            </div>
            <div className={styles.tableScroll}>
                <table className={gsStyles.table}>
                    <thead>
                        <tr>
                            <th className={gsStyles.left}>#</th>
                            <th className={gsStyles.left}>Tím</th>
                            <th>Z</th><th>V</th><th>R</th><th>P</th>
                            <th>GS:GP</th><th>+/-</th><th>B</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((t, i) => (
                            <tr key={t.team} className={i < 2 ? (i === 1 ? gsStyles['last-qualified'] : gsStyles.qualified) : ''}>
                                <td className={gsStyles.left}><span className={gsStyles.rank}>{i + 1}.</span></td>
                                <td className={gsStyles.left}>
                                    <div className={gsStyles.teamCell}>
                                        <img src={FLAG_URL(t.team)} className={gsStyles.flag} alt="" onError={e => e.target.style.display='none'} />
                                        {t.team}
                                    </div>
                                </td>
                                <td>{t.gp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                                <td>{t.gf}:{t.ga}</td>
                                <td className={t.gd > 0 ? gsStyles.pos : t.gd < 0 ? gsStyles.neg : ''}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                                <td className={gsStyles.pts}>{t.pts}</td>
                                <td className={styles.moveCell}>
                                    <button className={styles.btnMove} onClick={() => move(i, -1)}
                                        disabled={finalized || i === 0 || teams[i - 1].pts !== t.pts} title="Hore">▲</button>
                                    <button className={styles.btnMove} onClick={() => move(i, 1)}
                                        disabled={finalized || i === teams.length - 1 || teams[i + 1].pts !== t.pts} title="Dole">▼</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function FifaAdminGroupStandings() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState('');
    const [busy, setBusy]       = useState(false);
    const [msg, setMsg]         = useState('');

    const load = useCallback(() => {
        setLoading(true);
        apiFetch('v1/fifa/standings')
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSync = async () => {
        setBusy(true); setMsg('');
        try { await syncFifaStandings(); setMsg('✓ Synchronizované z výsledkov'); load(); }
        catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setBusy(false); }
    };

    const handleReset = async () => {
        if (!confirm('Vynulovať všetky tabuľky skupín?')) return;
        setBusy(true); setMsg('');
        try { await resetFifaStandings(); setMsg('✓ Tabuľky vynulované'); load(); }
        catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setBusy(false); }
    };

    const handleFinalize = async (phase) => {
        setBusy(true); setMsg('');
        try {
            const teams = data[phase] || [];
            for (let i = 0; i < teams.length; i++) {
                const t = teams[i];
                await updateFifaStanding({ phase, team: t.team, rank: i + 1, finalized: true,
                    gp: t.gp, w: t.w, d: t.d, l: t.l, gf: t.gf, ga: t.ga, pts: t.pts });
            }
            setData(prev => ({ ...prev, [phase]: (prev[phase] || []).map((t, i) => ({ ...t, rank: i + 1, finalized: true })) }));
            setMsg(`✓ Skupina ${phase} finalizovaná`);
            load();
        } catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setBusy(false); }
    };

    const handleMove = useCallback((phase, fromIdx, toIdx) => {
        setData(prev => {
            const teams = [...(prev[phase] || [])];
            [teams[fromIdx], teams[toIdx]] = [teams[toIdx], teams[fromIdx]];
            return { ...prev, [phase]: teams };
        });
    }, []);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;
    if (!data)   return null;

    const isFinalized = ph => data[ph]?.some(t => t.finalized);

    return (
        <div>
            <h2 style={{color:'#1a3a6b', marginBottom:14}}>Tabuľky skupín</h2>
            <div className={styles.toolbar}>
                <button className={styles.btnSync} onClick={handleSync} disabled={busy}>
                    {busy ? '…' : '↺ Synchronizovať z výsledkov'}
                </button>
                <button className={styles.btnReset} onClick={handleReset} disabled={busy}>
                    ✕ Reset (live)
                </button>
            </div>
            {msg && <p className={styles.msg}>{msg}</p>}
            <div className={gsStyles.wrap}>
                {GROUP_CODES.map(g => (
                    <GroupTable key={g} phase={g} teams={data[g] || []}
                        finalized={isFinalized(g)} onMove={handleMove}
                        onFinalize={handleFinalize} busy={busy} />
                ))}
                <FifaThirdPlaced data={data} />
            </div>
        </div>
    );
}
