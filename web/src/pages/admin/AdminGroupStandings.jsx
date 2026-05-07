import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { syncGroupStandings, updateGroupStanding, resetGroupStandings } from '../../api/admin';
import styles from './AdminGroupStandings.module.css';
import gsStyles from '../user/GroupStandings.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;
const FIELDS = ['rank','gp','w','d','l','gf','ga','pts'];

function EditRow({ team, row, onSave, onCancel }) {
    const [vals, setVals] = useState({ ...row });
    const set = (f, v) => setVals(p => ({ ...p, [f]: v === '' ? '' : parseInt(v) || 0 }));

    return (
        <tr className={styles.editRow}>
            <td><input type="number" min="1" max="16" value={vals.rank} onChange={e => set('rank', e.target.value)} className={styles.numIn} style={{width:40}} /></td>
            <td>
                <div className={gsStyles.teamCell}>
                    <img src={FLAG_URL(team)} className={gsStyles.flag} alt="" onError={e => e.target.style.display='none'} />
                    {team}
                </div>
            </td>
            {['gp','w','d','l'].map(f => (
                <td key={f}><input type="number" min="0" max="56" value={vals[f]} onChange={e => set(f, e.target.value)} className={styles.numIn} /></td>
            ))}
            <td>
                <span className={styles.goalsCell}>
                    <input type="number" min="0" max="999" value={vals.gf} onChange={e => set('gf', e.target.value)} className={styles.numIn} />
                    :
                    <input type="number" min="0" max="999" value={vals.ga} onChange={e => set('ga', e.target.value)} className={styles.numIn} />
                </span>
            </td>
            <td>{vals.gf - vals.ga}</td>
            <td><input type="number" min="0" max="999" value={vals.pts} onChange={e => set('pts', e.target.value)} className={styles.numIn} /></td>
            <td>
                <button className={styles.btnOk} onClick={() => onSave(vals)}>✓</button>
                <button className={styles.btnCancel} onClick={onCancel}>✕</button>
            </td>
        </tr>
    );
}

function GroupTable({ phase, teams, finalized, onTeamSave }) {
    const [editTeam, setEditTeam] = useState(null);
    const [saving, setSaving] = useState(false);

    const handleSave = async (team, vals) => {
        setSaving(true);
        try {
            await updateGroupStanding({ phase, team, ...vals });
            onTeamSave(phase, team, vals);
            setEditTeam(null);
        } catch (e) {
            alert(e.message);
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
                    {teams.map((t) => {
                        if (editTeam === t.team) {
                            return (
                                <EditRow key={t.team} team={t.team} row={t}
                                    onSave={vals => handleSave(t.team, vals)}
                                    onCancel={() => setEditTeam(null)} />
                            );
                        }
                        const qi = t.rank - 1;
                        return (
                            <tr key={t.team} className={qi < 4 ? (qi === 3 ? gsStyles['last-qualified'] : gsStyles.qualified) : ''}>
                                <td className={gsStyles.left}><span className={gsStyles.rank}>{t.rank}.</span></td>
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
                                <td>
                                    <button className={styles.btnEdit} onClick={() => setEditTeam(t.team)} disabled={saving}>✎</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminGroupStandings() {
    const [data,     setData]     = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState('');
    const [syncing,  setSyncing]  = useState(false);
    const [msg,      setMsg]      = useState('');

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
            for (const t of teams) {
                await updateGroupStanding({ phase, team: t.team, finalized: true });
            }
            setMsg(`✓ Skupina ${phase} finalizovaná`);
            load();
        } catch (e) { setMsg('Chyba: ' + e.message); }
        finally { setSyncing(false); }
    };

    const handleTeamSave = (phase, team, vals) => {
        setData(prev => ({
            ...prev,
            [phase]: prev[phase].map(t => t.team === team
                ? { ...t, ...vals, gd: vals.gf - vals.ga }
                : t
            ).sort((a, b) => a.rank - b.rank)
        }));
    };

    if (loading) return <p>Načítavam…</p>;
    if (error)   return <p style={{color:'red'}}>Chyba: {error}</p>;
    if (!data)   return null;

    const isFinalized = (ph) => data[ph]?.some(t => t.finalized);
    const hasStored   = (ph) => (data[ph]?.length || 0) > 0;

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
                <GroupTable phase="A" teams={data.A || []} finalized={isFinalized('A')} onTeamSave={handleTeamSave} />
                <GroupTable phase="B" teams={data.B || []} finalized={isFinalized('B')} onTeamSave={handleTeamSave} />
            </div>
        </div>
    );
}
