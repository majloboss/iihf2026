import { useEffect, useState } from 'react';
import { createUclCountry, deleteUclCountry, getUclCountries, updateUclCountry } from '../../api/uclAdmin';
import styles from './Admin.module.css';

export default function UclCountryCatalog({ onChanged = () => {} }) {
    const [countries, setCountries] = useState([]);
    const [draft, setDraft] = useState({ country_code: '', name_sk: '', name_en: '', name_original: '', flag_file: '' });
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = () => getUclCountries().then(setCountries).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const reset = () => { setEditing(null); setDraft({ country_code: '', name_sk: '', name_en: '', name_original: '', flag_file: '' }); };
    const save = async e => {
        e.preventDefault(); setError(''); setMessage('');
        try {
            if (editing) await updateUclCountry({ ...draft, old_country_code: editing });
            else await createUclCountry(draft);
            await load(); onChanged(); reset(); setMessage('✓ Štát bol uložený.');
        } catch (err) { setError(err.message); }
    };
    const edit = country => { setEditing(country.country_code); setDraft(country); setMessage(''); setError(''); };
    const remove = async country => {
        if (!window.confirm(`Odstrániť štát ${country.name_sk}?`)) return;
        try { await deleteUclCountry(country.country_code); await load(); onChanged(); setMessage('✓ Štát bol odstránený.'); }
        catch (err) { setError(err.message); }
    };

    return <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #6f42c1' }}>
        <h3 style={{ margin: '0 0 4px', color: '#6f42c1' }}>🌍 Štáty</h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>Spoločný číselník štátov používaný klubmi.</p>
        {editing && <div className={styles.uclEditorBackdrop} role="dialog" aria-modal="true" aria-labelledby="country-editor-title">
            <form className={styles.uclEditor} onSubmit={save}>
                <div className={styles.uclEditorHeader}>
                    <div>
                        <h3 id="country-editor-title">Upraviť štát</h3>
                        <p>{draft.name_sk || draft.name_en || draft.country_code}</p>
                    </div>
                    <button className={styles.uclEditorClose} type="button" onClick={reset} aria-label="Zavrieť">×</button>
                </div>
                <div className={styles.uclEditorFields}>
                    <label>Kód štátu<input value={draft.country_code} onChange={e => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} maxLength={3} required /></label>
                    <label>Slovenský názov<input value={draft.name_sk} onChange={e => setDraft({ ...draft, name_sk: e.target.value })} maxLength={100} required /></label>
                    <label>Anglický názov<input value={draft.name_en} onChange={e => setDraft({ ...draft, name_en: e.target.value })} maxLength={100} required /></label>
                    <label>Originálny názov<input value={draft.name_original} onChange={e => setDraft({ ...draft, name_original: e.target.value })} maxLength={100} /></label>
                    <label className={styles.uclEditorFull}>Súbor vlajky<input value={draft.flag_file} onChange={e => setDraft({ ...draft, flag_file: e.target.value })} maxLength={255} placeholder="svk.png" /></label>
                </div>
                {error && <p className={styles.error}>✗ {error}</p>}
                <div className={styles.uclEditorActions}>
                    <button className={styles.btn} type="submit">Uložiť zmeny</button>
                    <button className={styles.btnSmall} type="button" onClick={reset}>Zrušiť</button>
                </div>
            </form>
        </div>}
        {!editing && <form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <label>Kód štátu<input value={draft.country_code} onChange={e => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} maxLength={3} required placeholder="SVK" /></label>
            <label>Slovenský názov<input value={draft.name_sk} onChange={e => setDraft({ ...draft, name_sk: e.target.value })} maxLength={100} required placeholder="Slovensko" /></label>
            <label>Anglický názov<input value={draft.name_en} onChange={e => setDraft({ ...draft, name_en: e.target.value })} maxLength={100} required placeholder="Slovakia" /></label>
            <label>Originálny názov<input value={draft.name_original} onChange={e => setDraft({ ...draft, name_original: e.target.value })} maxLength={100} placeholder="Slovensko" /></label>
            <label>Vlajka<input value={draft.flag_file} onChange={e => setDraft({ ...draft, flag_file: e.target.value })} maxLength={255} placeholder="svk.png" /></label>
            <button className={styles.btn} type="submit">Pridať štát</button>
        </form>}
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>✗ {error}</p>}
        <div style={{ overflowX: 'auto' }}><table className={styles.table} style={{ marginTop: 8 }}>
            <thead><tr><th>Vlajka</th><th>Kód</th><th>Slovensky</th><th>Anglicky</th><th>Originál</th><th>Akcie</th></tr></thead>
            <tbody>{countries.map(country => <tr key={country.country_code}>
                <td>{country.flag_file ? <img src={country.flag_file.startsWith('fifa_flag_') || country.flag_file.startsWith('team_flag_')
                    ? `/flags/${country.flag_file}`
                    : `/flags/${country.flag_file}`} alt={country.name_sk} style={{ width: 28, height: 18, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} /> : '—'}</td>
                <td className={styles.mono}>{country.country_code}</td>
                <td>{country.name_sk}</td>
                <td>{country.name_en}</td>
                <td>{country.name_original || '—'}</td>
                <td><div className={styles.actions}><button className={styles.btnSmall} onClick={() => edit(country)}>Upraviť</button><button className={styles.btnSmallDanger} onClick={() => remove(country)}>Zmazať</button></div></td>
            </tr>)}</tbody>
        </table></div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#777' }}>Štátov v číselníku: {countries.length}</p>
    </div>;
}
