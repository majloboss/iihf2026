import { useEffect, useState } from 'react';
import { createUclCountry, deleteUclCountry, getUclCountries, updateUclCountry } from '../../api/uclAdmin';
import styles from './Admin.module.css';

// Poradie zodpoveda ciselniku v DB (migracia 055).
// source_id a flag_check su technicke stlpce zo zdrojoveho CSV, v rozhrani sa neukazuju.
const FIELDS = [
    { key: 'country_code',    label: 'Kód štátu',   width: 100, mono: true, required: true, upper: true, maxLength: 6, placeholder: 'SVK' },
    { key: 'country_code2',   label: 'Kód 2',       width: 90,  mono: true, upper: true, maxLength: 6, placeholder: 'SK' },
    { key: 'sport_code_fifa', label: 'FIFA',        width: 80,  mono: true, upper: true, maxLength: 3, placeholder: 'GER' },
    { key: 'sport_code_iihf', label: 'IIHF',        width: 80,  mono: true, upper: true, maxLength: 3, placeholder: 'SLO' },
    { key: 'sport_code_uefa', label: 'UEFA',        width: 80,  mono: true, upper: true, maxLength: 3, placeholder: 'SVN' },
    { key: 'name_sk',         label: 'Názov SK',    width: 180, required: true, maxLength: 100, placeholder: 'Slovensko' },
    { key: 'name_sk_long',    label: 'Názov SK dlhý', width: 220, maxLength: 150, placeholder: 'Slovenská republika' },
    { key: 'name_en',         label: 'Názov EN',    width: 180, required: true, maxLength: 100, placeholder: 'Slovakia' },
    { key: 'name_original',   label: 'Názov pôvodný', width: 180, maxLength: 100, placeholder: 'Slovensko' },
    { key: 'flag_file',       label: 'Vlajka malá', width: 170, maxLength: 255, placeholder: 'flag_sk_24.png' },
    { key: 'flag_file_big',   label: 'Vlajka veľká', width: 170, maxLength: 255, placeholder: 'flag_sk_240.png' },
];

const EMPTY = { ...Object.fromEntries(FIELDS.map(f => [f.key, ''])), is_active: true };

export default function UclCountryCatalog({ onChanged = () => {} }) {
    const [countries, setCountries] = useState([]);
    const [draft, setDraft] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [filter, setFilter] = useState('');

    const load = () => getUclCountries().then(setCountries).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const reset = () => { setEditing(null); setDraft(EMPTY); };
    const save = async e => {
        e.preventDefault(); setError(''); setMessage('');
        try {
            if (editing) await updateUclCountry({ ...draft, old_country_code: editing });
            else await createUclCountry(draft);
            await load(); onChanged(); reset(); setMessage('✓ Štát bol uložený.');
        } catch (err) { setError(err.message); }
    };
    // Do draftu iba editovatelne polia; team_count je pocitany udaj, nie stlpec ciselnika.
    const edit = country => {
        setEditing(country.country_code);
        setDraft({
            ...Object.fromEntries(FIELDS.map(f => [f.key, country[f.key] ?? ''])),
            is_active: country.is_active !== false,
        });
        setMessage(''); setError('');
    };
    const remove = async country => {
        if (!window.confirm(`Odstrániť štát ${country.name_sk}?`)) return;
        try { await deleteUclCountry(country.country_code); await load(); onChanged(); setMessage('✓ Štát bol odstránený.'); }
        catch (err) { setError(err.message); }
    };

    const needle = filter.trim().toLowerCase();
    const shown = needle
        ? countries.filter(c => FIELDS.some(f => String(c[f.key] ?? '').toLowerCase().includes(needle)))
        : countries;

    const field = (f, extra = {}) => <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 2, ...extra.labelStyle }}>
        <span style={{ fontSize: '0.75rem', color: '#555' }}>{f.label}{f.required && ' *'}</span>
        <input
            value={draft[f.key] ?? ''}
            onChange={e => setDraft({ ...draft, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
            maxLength={f.maxLength}
            required={f.required}
            placeholder={f.placeholder}
            className={f.mono ? styles.mono : undefined}
            style={{ width: extra.width ?? f.width }}
        />
    </label>;

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
                    {FIELDS.map(f => field(f, { width: '100%' }))}
                    <label className={styles.uclEditorFull} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={draft.is_active !== false} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                        <span>Aktívny štát</span>
                    </label>
                    <div className={styles.uclEditorFull} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        {draft.flag_file && <img src={`/flags/${draft.flag_file}`} alt="malá vlajka" style={{ width: 40, height: 26, objectFit: 'cover', border: '1px solid #ddd' }} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />}
                        {draft.flag_file_big && <img src={`/flags/${draft.flag_file_big}`} alt="veľká vlajka" style={{ width: 72, height: 46, objectFit: 'cover', border: '1px solid #ddd' }} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />}
                    </div>
                </div>
                {error && <p className={styles.error}>✗ {error}</p>}
                <div className={styles.uclEditorActions}>
                    <button className={styles.btn} type="submit">Uložiť zmeny</button>
                    <button className={styles.btnSmall} type="button" onClick={reset}>Zrušiť</button>
                </div>
            </form>
        </div>}
        {!editing && <form onSubmit={save} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {FIELDS.map(f => field(f))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30 }}>
                <input type="checkbox" checked={draft.is_active !== false} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
                <span style={{ fontSize: '0.8rem' }}>Aktívny</span>
            </label>
            <button className={styles.btn} type="submit" style={{ height: 30 }}>Pridať štát</button>
        </form>}
        <div style={{ marginTop: 12 }}>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Hľadať štát, kód alebo športový kód…" style={{ width: '100%', maxWidth: 340, padding: '6px 10px' }} />
        </div>
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>✗ {error}</p>}
        <div style={{ overflowX: 'auto' }}><table className={styles.table} style={{ marginTop: 8, whiteSpace: 'nowrap' }}>
            <thead><tr>
                <th>Vlajka</th>
                {FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                <th>Aktívny</th><th>Tímy</th><th>Akcie</th>
            </tr></thead>
            <tbody>{shown.map(country => <tr key={country.country_code}>
                <td>{country.flag_file
                    ? <img src={`/flags/${country.flag_file}`} alt={country.name_sk} style={{ width: 28, height: 18, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                    : '—'}</td>
                {FIELDS.map(f => <td key={f.key} className={f.mono ? styles.mono : undefined}>
                    {country[f.key] === null || country[f.key] === undefined || country[f.key] === '' ? '—' : country[f.key]}
                </td>)}
                <td>{country.is_active === false ? '—' : '✓'}</td>
                <td>{Number(country.team_count) || 0}</td>
                <td><div className={styles.actions}><button className={styles.btnSmall} onClick={() => edit(country)}>Upraviť</button><button className={styles.btnSmallDanger} onClick={() => remove(country)}>Zmazať</button></div></td>
            </tr>)}</tbody>
        </table></div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#777' }}>Štátov v číselníku: {countries.length}{needle && ` · zobrazených: ${shown.length}`}</p>
    </div>;
}
