import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { syncGroupStandings, updateGroupStanding, resetGroupStandings } from '../../api/admin';
import styles from './AdminGroupStandings.module.css';
import gsStyles from '../user/GroupStandings.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

function GroupTable({ phase, teams, finalized, onMove }) {
    const [saving, setSaving] = useState(false);

    const move = async (idx, dir) => {
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= teams.length) return;
        setSaving(true);
        try {
            await onMove(phase, idx, swapIdx);
        } finally { setSaving(false); }
    };

    return (
        <div className={gsStyles.groupCard}>
            <div className={gsStyles.groupHeader}>
                Skupina {phase}
                {finalized && <span className={styles.finalBadge}>✓ Finalizovaná</span>}
                {!finalized && teams.length > 0 && <span className={styles.liveBadge}>Live</span>}
            </div>
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
                        <tr key={t.team} className={i < 4 ? (i === 3 ? gsStyles['last-qualified'] : gsStyles.qualified) : ''}>
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
                                    disabled={saving || i === 0 || teams[i - 1].pts !== t.pts}
                                    title="Posunúť hore">▲</button>
                                <button className={styles.btnMove} onClick={() => move(i, 1)}
                                    disabled={saving || i === teams.length - 1 || teams[i + 1].pts !== t.pts}
                                    title="Posunúť dole">▼</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminGroupStandings() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');
    const [syncing, setSyncing] = useState(false);
    const [msg,     setMsg]     = useState('');

    const load = useCallback(() => {
        setLoading(true);
        apiFetch('v1/group-standings')
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSync = async () => {
        setSyncing(true); setMsg('');
        try {
            await syncGroupStandings();
            setMsg('✓ Synchronizované');
            load();
        } catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setSyncing(false); }
    };

    const handleReset = async () => {
        if (!confirm('Vymazať uloženú tabuľku a vrátiť live výpočet?')) return;
        setSyncing(true); setMsg('');
        try {
            await resetGroupStandings();
            setMsg('✓ Reset — zobrazuje sa live výpočet');
            load();
        } catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setSyncing(false); }
    };

    const handleFinalize = async (phase) => {
        setSyncing(true); setMsg('');
        try {
            const teams = data[phase] || [];
            for (let i = 0; i < teams.length; i++) {
                await updateGroupStanding({ phase, team: teams[i].team, rank: i + 1, finalized: true });
            }
            setMsg(`✓ Skupina ${phase} finalizovaná`);
            load();
        } catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setSyncing(false); }
    };

    const handleMove = useCallback(async (phase, fromIdx, toIdx) => {
        const teams = [...(data[phase] || [])];
        const a = teams[fromIdx];
        const b = teams[toIdx];
        // Swap ranks in DB
        await updateGroupStanding({ phase, team: a.team, rank: toIdx + 1 });
        await updateGroupStanding({ phase, team: b.team, rank: fromIdx + 1 });
        // Update local state
        const updated = [...teams];
        updated[fromIdx] = { ...b, rank: fromIdx + 1 };
        updated[toIdx]   = { ...a, rank: toIdx + 1 };
        setData(prev => ({ ...prev, [phase]: updated }));
    }, [data]);

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;
    if (!data)   return null;

    const isFinalized = ph => data[ph]?.some(t => t.finalized);
    const hasStored   = ph => (data[ph]?.length || 0) > 0;

    return (
        <div>
            <div className={styles.toolbar}>
                <button className={styles.btnSync} onClick={handleSync} disabled={syncing}>
                    {syncing ? '…' : '↺ Synchronizovať z výsledkov'}
                </button>
                {(hasStored('A') || hasStored('B')) && (
                    <button className={styles.btnReset} onClick={handleReset} disabled={syncing}>
                        ✕ Reset (live)
                    </button>
                )}
                {hasStored('A') && !isFinalized('A') && (
                    <button className={styles.btnFinalize} onClick={() => handleFinalize('A')} disabled={syncing}>
                        ✓ Finalizovať A
                    </button>
                )}
                {hasStored('B') && !isFinalized('B') && (
                    <button className={styles.btnFinalize} onClick={() => handleFinalize('B')} disabled={syncing}>
                        ✓ Finalizovať B
                    </button>
                )}
            </div>
            {msg && <p className={styles.msg}>{msg}</p>}
            <div className={gsStyles.wrap}>
                <GroupTable phase="A" teams={data.A || []} finalized={isFinalized('A')} onMove={handleMove} />
                <GroupTable phase="B" teams={data.B || []} finalized={isFinalized('B')} onMove={handleMove} />
            </div>
        </div>
    );
}
