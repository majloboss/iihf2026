import { useEffect, useState } from 'react';
import { createUclCountry, deleteUclCountry, getUclCountries, updateUclCountry } from '../../api/uclAdmin';
import styles from './Admin.module.css';

export default function UclCountryCatalog({ onChanged }) {
    const [countries, setCountries] = useState([]);
    const [draft, setDraft] = useState({ country_code: '', country_name: '' });
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const load = () => getUclCountries().then(setCountries).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);
    const reset = () => { setEditing(null); setDraft({ country_code: '', country_name: '' }); };
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
        if (!window.confirm(`Odstrániť štát ${country.country_name}?`)) return;
        try { await deleteUclCountry(country.country_code); await load(); onChanged(); setMessage('✓ Štát bol odstránený.'); }
        catch (err) { setError(err.message); }
    };

    return <div className={styles.card} style={{ padding: 20, marginTop: 12, borderLeft: '4px solid #6f42c1' }}>
        <h3 style={{ margin: '0 0 4px', color: '#6f42c1' }}>🌍 Štáty</h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>Číselník štátov používaný klubmi.</p>
        <form onSubmit={save} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
            <label>Kód štátu<input value={draft.country_code} onChange={e => setDraft({ ...draft, country_code: e.target.value.toUpperCase() })} maxLength={3} required disabled={!!editing} placeholder="SVK" /></label>
            <label>Názov štátu<input value={draft.country_name} onChange={e => setDraft({ ...draft, country_name: e.target.value })} maxLength={100} required placeholder="Slovakia" /></label>
            <button className={styles.btn} type="submit">{editing ? 'Uložiť štát' : 'Pridať štát'}</button>
            {editing && <button className={styles.btnSmall} type="button" onClick={reset}>Zrušiť</button>}
        </form>
        {message && <p className={styles.success}>{message}</p>}
        {error && <p className={styles.error}>✗ {error}</p>}
        <div style={{ overflowX: 'auto' }}><table className={styles.table} style={{ marginTop: 8 }}>
            <thead><tr><th>Kód</th><th>Štát</th><th>Akcie</th></tr></thead>
            <tbody>{countries.map(country => <tr key={country.country_code}>
                <td className={styles.mono}>{country.country_code}</td><td>{country.country_name}</td>
                <td><div className={styles.actions}><button className={styles.btnSmall} onClick={() => edit(country)}>Upraviť</button><button className={styles.btnSmallDanger} onClick={() => remove(country)}>Zmazať</button></div></td>
            </tr>)}</tbody>
        </table></div>
        <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#777' }}>Štátov v číselníku: {countries.length}</p>
    </div>;
}
