import { useEffect, useMemo, useState } from 'react';
import { editUclGame, getUclGames, recalcUcl, updateUclGameResult } from '../../api/ucl';
import { getUclTeams } from '../../api/uclAdmin';
import styles from './Admin.module.css';

const PHASES = {
    LEAGUE: 'Ligová fáza',
    PO: 'Baráž o play-off',
    R16: 'Osemfinále',
    QF: 'Štvrťfinále',
    SF: 'Semifinále',
    F: 'Finále',
};

// start_time je naive UTC.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const toInput = s => {
    const d = asDate(s);
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};
const dayFmt = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function UclAdminGames() {
    const [games, setGames] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [phase, setPhase] = useState('LEAGUE');
    const [editing, setEditing] = useState(null);
    const [scores, setScores] = useState({});
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = () => Promise.all([getUclGames(), getUclTeams()])
        .then(([g, c]) => { setGames(g); setClubs(c); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const byPhase = useMemo(() => {
        const map = {};
        for (const g of games) (map[g.game_type_code] = map[g.game_type_code] || []).push(g);
        return map;
    }, [games]);

    const scoreOf = (g, side) => {
        const s = scores[g.game_id];
        if (s && s[side] !== undefined) return s[side];
        const v = side === 'home' ? g.home_score_regular : g.away_score_regular;
        return v === null || v === undefined ? '' : String(v);
    };
    const setScore = (id, side, value) =>
        setScores(cur => ({ ...cur, [id]: { ...cur[id], [side]: value.replace(/[^0-9]/g, '').slice(0, 2) } }));

    const saveResult = async (g, approve) => {
        const home = scoreOf(g, 'home'), away = scoreOf(g, 'away');
        if (approve && (home === '' || away === '')) { setError('Na schválenie treba vyplniť skóre.'); return; }
        setBusy(g.game_id); setError(''); setMessage('');
        try {
            await updateUclGameResult({
                game_id: g.game_id,
                home_score_regular: home === '' ? null : Number(home),
                away_score_regular: away === '' ? null : Number(away),
                result_approved: approve,
            });
            await load();
            setMessage(approve ? '✓ Výsledok schválený, tabuľka a body prepočítané.' : '✓ Skóre uložené.');
        } catch (e) { setError(e.message); }
        finally { setBusy(null); }
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        setBusy(editing.game_id); setError(''); setMessage('');
        try {
            await editUclGame({
                game_id: editing.game_id,
                home_team_id: editing.home_team_id || null,
                away_team_id: editing.away_team_id || null,
                start_time: editing.start_time.replace('T', ' ') + ':00',
                venue: editing.venue || '',
                tips_open: editing.tips_open,
            });
            setEditing(null);
            await load();
            setMessage('✓ Zápas bol upravený.');
        } catch (err) { setError(err.message); }
        finally { setBusy(null); }
    };

    const recalc = async () => {
        setBusy('recalc'); setError(''); setMessage('');
        try {
            const r = await recalcUcl();
            setMessage(`✓ Prepočítané: ${r.standings_rows} tímov v tabuľke, ${r.tips_updated} tipov.`);
            await load();
        } catch (e) { setError(e.message); }
        finally { setBusy(null); }
    };

    if (loading) return <p>Načítavam zápasy…</p>;
    const list = byPhase[phase] || [];

    return (
        <div>
            <h2>Zápasy — Liga majstrov</h2>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0', borderBottom: '2px solid #e9ecef' }}>
                {Object.entries(PHASES).map(([key, label]) => (
                    <button key={key} onClick={() => setPhase(key)}
                        style={{
                            padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '0.88rem', fontWeight: 600, marginBottom: -2,
                            borderBottom: '2px solid ' + (phase === key ? '#1a3a6b' : 'transparent'),
                            color: phase === key ? '#1a3a6b' : '#999',
                        }}>
                        {label}{byPhase[key]?.length ? ` (${byPhase[key].length})` : ''}
                    </button>
                ))}
                <button className={styles.btnSmall} onClick={recalc} disabled={busy === 'recalc'} style={{ marginLeft: 'auto' }}>
                    {busy === 'recalc' ? 'Prepočítavam…' : 'Prepočítať tabuľku a body'}
                </button>
            </div>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {editing && (
                <div className={styles.uclEditorBackdrop} role="dialog" aria-modal="true">
                    <form className={styles.uclEditor} onSubmit={saveEdit}>
                        <div className={styles.uclEditorHeader}>
                            <div><h3>Upraviť zápas</h3><p>{editing.game_type_name}</p></div>
                            <button className={styles.uclEditorClose} type="button" onClick={() => setEditing(null)}>×</button>
                        </div>
                        <div className={styles.uclEditorFields}>
                            <label>Domáci
                                <select value={editing.home_team_id || ''} onChange={e => setEditing({ ...editing, home_team_id: e.target.value })}>
                                    <option value="">— neurčený —</option>
                                    {clubs.map(c => <option key={c.team_id} value={c.team_id}>{c.team_name}</option>)}
                                </select>
                            </label>
                            <label>Hostia
                                <select value={editing.away_team_id || ''} onChange={e => setEditing({ ...editing, away_team_id: e.target.value })}>
                                    <option value="">— neurčený —</option>
                                    {clubs.map(c => <option key={c.team_id} value={c.team_id}>{c.team_name}</option>)}
                                </select>
                            </label>
                            <label>Začiatok
                                <input type="datetime-local" value={editing.start_time}
                                       onChange={e => setEditing({ ...editing, start_time: e.target.value })} required />
                            </label>
                            <label>Štadión
                                <input value={editing.venue} maxLength={100}
                                       onChange={e => setEditing({ ...editing, venue: e.target.value })} />
                            </label>
                            <label className={styles.uclEditorFull} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={editing.tips_open}
                                       onChange={e => setEditing({ ...editing, tips_open: e.target.checked })} />
                                <span>Tipovanie otvorené</span>
                            </label>
                        </div>
                        <div className={styles.uclEditorActions}>
                            <button className={styles.btn} type="submit">Uložiť</button>
                            <button className={styles.btnSmall} type="button" onClick={() => setEditing(null)}>Zrušiť</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table}>
                    <thead><tr><th>Termín</th><th>Zápas</th><th>Výsledok</th><th>Stav</th><th>Akcie</th></tr></thead>
                    <tbody>
                        {list.map(g => (
                            <tr key={g.game_id}>
                                <td style={{ whiteSpace: 'nowrap' }}>{dayFmt.format(asDate(g.start_time))}</td>
                                <td>
                                    {g.home_name && g.away_name
                                        ? <>{g.home_name} <span style={{ color: '#999' }}>—</span> {g.away_name}</>
                                        : <span className={styles.unused}>tímy zatiaľ neurčené</span>}
                                </td>
                                <td>
                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <input value={scoreOf(g, 'home')} onChange={e => setScore(g.game_id, 'home', e.target.value)}
                                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} disabled={!g.home_team_id} />
                                        <span>:</span>
                                        <input value={scoreOf(g, 'away')} onChange={e => setScore(g.game_id, 'away', e.target.value)}
                                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} disabled={!g.home_team_id} />
                                    </span>
                                </td>
                                <td>{g.result_approved
                                    ? <span style={{ color: '#28a745' }}>schválený</span>
                                    : <span className={styles.unused}>{g.tips_open ? 'tipovanie beží' : 'uzavretý'}</span>}</td>
                                <td><div className={styles.actions}>
                                    <button className={styles.btnSmall} disabled={!g.home_team_id || busy === g.game_id}
                                            onClick={() => saveResult(g, false)}>Uložiť</button>
                                    <button className={styles.btnSmall} disabled={!g.home_team_id || busy === g.game_id}
                                            onClick={() => saveResult(g, true)}>Schváliť</button>
                                    <button className={styles.btnSmall} onClick={() => setEditing({
                                        game_id: g.game_id, game_type_name: g.game_type_name,
                                        home_team_id: g.home_team_id || '', away_team_id: g.away_team_id || '',
                                        start_time: toInput(g.start_time), venue: g.venue || '', tips_open: g.tips_open,
                                    })}>Upraviť</button>
                                </div></td>
                            </tr>
                        ))}
                        {list.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>
                            V tejto fáze zatiaľ nie sú zápasy.
                        </td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
