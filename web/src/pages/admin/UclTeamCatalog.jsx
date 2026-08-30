import { useEffect, useState } from 'react';
import { createUclTeam, deleteUclTeam, getUclCountries, getUclTeams, updateUclTeam } from '../../api/uclAdmin';
import styles from './Admin.module.css';

const emptyTeam = { team_code: '', team_name: '', country_code: '', logo_file: '', home_venue: '', is_active: true };

export default function UclTeamCatalog() {
    const [teams, setTeams] = useState([]);
    const [countries, setCountries] = useState([]);
    const [draft, setDraft] = useState(emptyTeam);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');

    const load = () => Promise.all([getUclTeams(), getUclCountries()])
        .then(([teamRows, countryRows]) => { setTeams(teamRows); setCountries(countryRows); })
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
            if (editingId) await load();
            else setTeams(current => [...current, saved].sort((a, b) => a.team_name.localeCompare(b.team_name, 'sk')));
            setMessage(editingId ? '✓ Klub bol uložený.' : '✓ Klub bol pridaný.');
            reset();
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const edit = (team) => {
        setEditingId(team.team_id);
        setDraft({
            team_code: team.team_code ?? '', team_name: team.team_name ?? '',
            country_code: team.country_code ?? '',
            logo_file: team.logo_file ?? '',
            home_venue: team.home_venue ?? '',
            is_active: team.is_active !== false,
        });
        setMessage(''); setError('');
    };

    // Klub bez zapasov sa zmaze, klub s historiou sa iba deaktivuje. Rozhoduje server.
    const remove = async (team) => {
        const used = Number(team.game_count) > 0;
        const question = used
            ? `Klub ${team.team_name} má odohrané alebo naplánované zápasy, preto sa nezmaže, iba deaktivuje. Pokračovať?`
            : `Odstrániť klub ${team.team_name}?`;
        if (!window.confirm(question)) return;
        setError(''); setMessage('');
        try {
            const res = await deleteUclTeam(team.team_id);
            if (res?.deactivated) {
                setTeams(current => current.map(item => item.team_id === team.team_id ? { ...item, is_active: false } : item));
                setMessage('✓ Klub bol deaktivovaný.');
            } else {
                setTeams(current => current.filter(item => item.team_id !== team.team_id));
                setMessage('✓ Klub bol odstránený.');
            }
            if (editingId === team.team_id) reset();
        } catch (e) { setError(e.message); }
    };

    const toggleActive = async (team) => {
        setError(''); setMessage('');
        try {
            await updateUclTeam({ ...team, is_active: !(team.is_active !== false) });
            setTeams(current => current.map(item => item.team_id === team.team_id
                ? { ...item, is_active: !(item.is_active !== false) } : item));
            setMessage(team.is_active !== false ? '✓ Klub bol deaktivovaný.' : '✓ Klub bol aktivovaný.');
        } catch (e) { setError(e.message); }
    };

    const needle = filter.trim().toLowerCase();
    const shownTeams = needle
        ? teams.filter(t => [t.team_name, t.team_code, t.country_name, t.country_display_code, t.country_code, t.home_venue]
            .some(v => String(v ?? '').toLowerCase().includes(needle)))
        : teams;

    if (loading) return <p>Načítavam kluby…</p>;

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #0d6efd' }}>
            {editingId && (
                <div className={styles.uclEditorBackdrop} role="dialog" aria-modal="true" aria-labelledby="ucl-editor-title">
                    <form className={styles.uclEditor} onSubmit={save}>
                        <div className={styles.uclEditorHeader}>
                            <div>
                                <h3 id="ucl-editor-title">Upraviť klub</h3>
                                <p>{draft.team_name || 'Nový klub'}</p>
                            </div>
                            <button className={styles.uclEditorClose} type="button" onClick={reset} aria-label="Zavrieť">×</button>
                        </div>
                        <div className={styles.uclEditorFields}>
                            <label>Kód klubu<input value={draft.team_code} onChange={e => change('team_code', e.target.value)} maxLength={20} required /></label>
                            <label>Názov klubu<input value={draft.team_name} onChange={e => change('team_name', e.target.value)} maxLength={100} required /></label>
                            <label>Štát<select value={draft.country_code} onChange={e => change('country_code', e.target.value)} required><option value="">Vyber štát</option>{countries.map(country => <option key={country.country_code} value={country.country_code}>{country.name_sk} ({country.sport_code_uefa || country.country_code})</option>)}</select></label>
                            <label className={styles.uclEditorFull}>Súbor loga<input value={draft.logo_file} onChange={e => change('logo_file', e.target.value)} placeholder="s_bratislava_logo.png" /></label>
                            <label className={styles.uclEditorFull}>Domáci štadión<input value={draft.home_venue} onChange={e => change('home_venue', e.target.value)} maxLength={200} placeholder="Tehelné pole" /></label>
                        </div>
                        {error && <p className={styles.error}>✗ {error}</p>}
                        <div className={styles.uclEditorActions}>
                            <button className={styles.btn} type="submit" disabled={saving}>{saving ? 'Ukladám…' : 'Uložiť zmeny'}</button>
                            <button className={styles.btnSmall} type="button" onClick={reset}>Zrušiť</button>
                        </div>
                    </form>
                </div>
            )}
            <h3 style={{ margin: '0 0 4px', color: '#0d6efd' }}>⚽ Kluby</h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#666' }}>
                Trvalý číselník klubov UEFA naprieč ročníkmi. Zobrazenie klubu: názov + kód štátu.
                Klub, ktorý sa v aktuálnom ročníku nekvalifikoval, v číselníku zostáva.
            </p>

            <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, alignItems: 'end', marginBottom: 16 }}>
                <label>Kód klubu<input value={draft.team_code} onChange={e => change('team_code', e.target.value)} maxLength={20} required placeholder="SLOVAN" /></label>
                <label>Názov klubu<input value={draft.team_name} onChange={e => change('team_name', e.target.value)} maxLength={100} required placeholder="Slovan Bratislava" /></label>
                <label>Štát<select value={draft.country_code} onChange={e => change('country_code', e.target.value)} required><option value="">Vyber štát</option>{countries.map(country => <option key={country.country_code} value={country.country_code}>{country.name_sk} ({country.sport_code_uefa || country.country_code})</option>)}</select></label>
                <label>Súbor loga<input value={draft.logo_file} onChange={e => change('logo_file', e.target.value)} placeholder="s_bratislavasvk_logo.png" /></label>
                <label>Domáci štadión<input value={draft.home_venue} onChange={e => change('home_venue', e.target.value)} maxLength={200} placeholder="Tehelné pole" /></label>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className={styles.btn} type="submit" disabled={saving}>{saving ? 'Ukladám…' : 'Pridať klub'}</button>
                </div>
            </form>

            <div style={{ marginTop: 12 }}>
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Hľadať klub, kód alebo štát…" style={{ width: '100%', maxWidth: 340, padding: '6px 10px' }} />
            </div>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            <div style={{ overflowX: 'auto' }}>
                <table className={`${styles.table} ${styles.uclTeamsTable}`} style={{ marginTop: 8 }}>
                    <thead><tr><th>Logo</th><th>Kód</th><th>Klub</th><th>Štát</th><th>Kód štátu</th><th>Domáci štadión</th><th>Zápasy</th><th>Stav</th><th>Akcie</th></tr></thead>
                    <tbody>
                        {shownTeams.map(team => (
                            <tr key={team.team_id} style={team.is_active === false ? { opacity: 0.55 } : undefined}>
                                <td>{team.logo_file
                                    ? <img src={`/logos/ucl2026/${team.logo_file}`} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                                    : <span className={styles.unused}>—</span>}</td>
                                <td className={styles.mono}>{team.team_code}</td>
                                <td><strong>{team.team_name}</strong></td>
                                <td>{team.country_name || <span className={styles.unused}>—</span>}</td>
                                <td className={styles.mono}>{team.country_display_code || <span className={styles.unused}>—</span>}</td>
                                <td>{team.home_venue || <span className={styles.unused}>—</span>}</td>
                                <td>{Number(team.game_count) || 0}</td>
                                <td>{team.is_active === false
                                    ? <span className={styles.unused}>neaktívny</span>
                                    : '✓'}</td>
                                <td><div className={styles.actions}>
                                    <button className={styles.btnSmall} onClick={() => edit(team)}>Upraviť</button>
                                    <button className={styles.btnSmall} onClick={() => toggleActive(team)}>
                                        {team.is_active === false ? 'Aktivovať' : 'Deaktivovať'}
                                    </button>
                                    {Number(team.game_count) === 0 && <button className={styles.btnSmallDanger} onClick={() => remove(team)}>Zmazať</button>}
                                </div></td>
                            </tr>
                        ))}
                        {shownTeams.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: '#888' }}>
                            {teams.length === 0 ? 'Číselník je zatiaľ prázdny.' : 'Žiadny klub nezodpovedá hľadaniu.'}
                        </td></tr>}
                    </tbody>
                </table>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: '#777' }}>Klubov v číselníku: {teams.length}{needle && ` · zobrazených: ${shownTeams.length}`}</p>
        </div>
    );
}
