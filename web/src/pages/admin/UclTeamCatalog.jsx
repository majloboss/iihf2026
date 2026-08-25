import { useEffect, useState } from 'react';
import { createUclTeam, deleteUclTeam, getUclTeams, updateUclTeam } from '../../api/uclAdmin';
import styles from './Admin.module.css';

const emptyTeam = { team_code: '', team_name: '', country_code: '', country_name: '', logo_file: '' };

export default function UclTeamCatalog() {
    const [teams, setTeams] = useState([]);
    const [draft, setDraft] = useState(emptyTeam);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = () => getUclTeams()
        .then(setTeams)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    const change = (field, value) => setDraft(current => ({ ...current, [field]: value }));

    const reset = () => { setEditingId(null); setDraft(emptyTeam); };

    const save = async (event) => {
        event.preventDefault();
        setSaving(true); setError(''); setMessage('');
        try {
            const saved = editingId
                ? await updateUclTeam({ ...draft, team_id: editingId })
                : await createUclTeam(draft);
            setTeams(current => editingId
                ? current.map(team => team.team_id === editingId ? saved : team)
                : [...current, saved].sort((a, b) => a.team_name.localeCompare(b.team_name, 'sk')));
            setMessage(editingId ? '✓ Klub bol uložený.' : '✓ Klub bol pridaný.');
            reset();
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const edit = (team) => {
        setEditingId(team.team_id);
        setDraft({
            team_code: team.team_code ?? '', team_name: team.team_name ?? '',
            country_code: team.country_code ?? '', country_name: team.country_name ?? '',
            logo_file: team.logo_file ?? '',
        });
        setMessage(''); setError('');
    };

    const remove = async (team) => {
        if (!window.confirm(`Odstrániť klub ${team.team_name}?`)) return;
        setError(''); setMessage('');
        try {
            await deleteUclTeam(team.team_id);
            setTeams(current => current.filter(item => item.team_id !== team.team_id));
            if (editingId === team.team_id) reset();
            setMessage('✓ Klub bol odstránený.');
        } catch (e) { setError(e.message); }
    };

    if (loading) return <p>Načítavam kluby…</p>;

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #0d6efd' }}>
            <h3 style={{ margin: '0 0 4px', color: '#0d6efd' }}>⚽ Kluby</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#666' }}>
                Číselník klubov Ligy majstrov UEFA 2026/27. Zobrazenie klubu: názov + kód štátu.
            </p>

            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, alignItems: 'end', marginBottom: 16 }}>
                <label>Kód klubu<input value={draft.team_code} onChange={e => change('team_code', e.target.value)} maxLength={20} required placeholder="SLOVAN" /></label>
                <label>Názov klubu<input value={draft.team_name} onChange={e => change('team_name', e.target.value)} maxLength={100} required placeholder="Slovan Bratislava" /></label>
                <label>Kód štátu<input value={draft.country_code} onChange={e => change('country_code', e.target.value.toUpperCase())} maxLength={3} placeholder="SVK" /></label>
                <label>Štát<input value={draft.country_name} onChange={e => change('country_name', e.target.value)} maxLength={100} placeholder="Slovakia" /></label>
                <label>Súbor loga<input value={draft.logo_file} onChange={e => change('logo_file', e.target.value)} placeholder="s_bratislavasvk_logo.png" /></label>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.btn} type="submit" disabled={saving}>{saving ? 'Ukladám…' : editingId ? 'Uložiť' : 'Pridať klub'}</button>
                    {editingId && <button className={styles.btnSmall} type="button" onClick={reset}>Zrušiť</button>}
                </div>
            </form>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            <div style={{ overflowX: 'auto' }}>
                <table className={styles.table} style={{ marginTop: 8 }}>
                    <thead><tr><th>Logo</th><th>Kód</th><th>Klub</th><th>Štát</th><th>Kód štátu</th><th>Akcie</th></tr></thead>
                    <tbody>
                        {teams.map(team => (
                            <tr key={team.team_id}>
                                <td>{team.logo_file
                                    ? <img src={`/logos/ucl2026/${team.logo_file}`} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    : <span className={styles.unused}>—</span>}</td>
                                <td className={styles.mono}>{team.team_code}</td>
                                <td><strong>{team.team_name}</strong></td>
                                <td>{team.country_name || <span className={styles.unused}>—</span>}</td>
                                <td className={styles.mono}>{team.country_code || <span className={styles.unused}>—</span>}</td>
                                <td><div className={styles.actions}>
                                    <button className={styles.btnSmall} onClick={() => edit(team)}>Upraviť</button>
                                    <button className={styles.btnSmallDanger} onClick={() => remove(team)}>Zmazať</button>
                                </div></td>
                            </tr>
                        ))}
                        {teams.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>Číselník je zatiaľ prázdny.</td></tr>}
                    </tbody>
                </table>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#777' }}>Klubov v číselníku: {teams.length}</p>
        </div>
    );
}
