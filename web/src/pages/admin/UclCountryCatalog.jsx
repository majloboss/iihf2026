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

// Prehlad zobrazuje kazdy stat na dvoch riadkoch: nazvy hore, kody dole.
const NAME_FIELDS = ['name_sk', 'name_sk_long', 'name_en', 'name_original'];
const CODE_FIELDS = ['country_code', 'country_code2', 'sport_code_fifa', 'sport_code_iihf', 'sport_code_uefa'];
const fieldOf = key => FIELDS.find(f => f.key === key);
const show = v => (v === null || v === undefined || v === '' ? '—' : v);

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
        <div style={{ overflowX: 'auto' }}><table className={styles.table} style={{ marginTop: 8 }}>
            <thead><tr>
                <th style={{ width: 40 }}>Vlajka</th>
                <th>Štát</th>
                <th style={{ width: 70 }}>Aktívny</th>
                <th style={{ width: 60 }}>Tímy</th>
                <th style={{ width: 150 }}>Akcie</th>
            </tr></thead>
            <tbody>{shown.map(country => <tr key={country.country_code}>
                <td style={{ verticalAlign: 'top', paddingTop: 10 }}>
                    {country.flag_file
                        ? <img src={`/flags/${country.flag_file}`} alt={country.name_sk} style={{ width: 28, height: 18, objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                        : '—'}
                </td>
                <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', alignItems: 'baseline' }}>
                        <strong>{country.name_sk}</strong>
                        {NAME_FIELDS.slice(1).map(k => country[k] && country[k] !== country.name_sk
                            ? <span key={k} style={{ color: '#666', fontSize: '0.85rem' }}>{country[k]}</span>
                            : null)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 3, fontSize: '0.78rem' }}>
                        {CODE_FIELDS.map(k => <span key={k} style={{ color: country[k] ? '#333' : '#bbb' }}>
                            <span style={{ color: '#888' }}>{fieldOf(k).label}:</span>{' '}
                            <span className={styles.mono}>{show(country[k])}</span>
                        </span>)}
                        <span style={{ color: '#888' }}>
                            Vlajky: <span className={styles.mono} style={{ color: country.flag_file ? '#333' : '#bbb' }}>{show(country.flag_file)}</span>
                            {' / '}
                            <span className={styles.mono} style={{ color: country.flag_file_big ? '#333' : '#bbb' }}>{show(country.flag_file_big)}</span>
                        </span>
                    </div>
                </td>
                <td style={{ verticalAlign: 'top', paddingTop: 10 }}>{country.is_active === false ? '—' : '✓'}</td>
                <td style={{ verticalAlign: 'top', paddingTop: 10 }}>{Number(country.team_count) || 0}</td>
                <td style={{ verticalAlign: 'top', paddingTop: 6 }}><div className={styles.actions}><button className={styles.btnSmall} onClick={() => edit(country)}>Upraviť</button><button className={styles.btnSmallDanger} onClick={() => remove(country)}>Zmazať</button></div></td>
            </tr>)}</tbody>
        </table></div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#777' }}>Štátov v číselníku: {countries.length}{needle && ` · zobrazených: ${shown.length}`}</p>
    </div>;
}
