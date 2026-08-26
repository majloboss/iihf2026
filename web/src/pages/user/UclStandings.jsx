import { useEffect, useState } from 'react';
import { getUclStandings } from '../../api/ucl';
import styles from './GroupStandings.module.css';

// Postupové pásma podľa umiestnenia v ligovej fáze.
const ZONES = {
    R16: { color: '#28a745', label: 'Priamy postup do osemfinále (1.–8.)' },
    PO:  { color: '#ffc107', label: 'Play-off o osemfinále (9.–24.)' },
    OUT: { color: '#dc3545', label: 'Vyradenie (25.–36.)' },
};

export default function UclStandings() {
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUclStandings().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
    }, []);

    if (loading) return <p>Načítavam tabuľku…</p>;
    if (error) return <p className={styles.error}>✗ {error}</p>;

    return (
        <div>
            <h2>Ligová tabuľka — Liga majstrov</h2>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '4px 0 14px' }}>
                Všetkých 36 klubov v jednej spoločnej tabuľke. Každý odohrá 8 zápasov.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.78rem' }}>
                {Object.entries(ZONES).map(([key, z]) => (
                    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: z.color, display: 'inline-block' }} />
                        {z.label}
                    </span>
                ))}
            </div>

            {rows.length === 0 && <p style={{ color: '#888' }}>Tabuľka sa naplní po prvých odohraných zápasoch.</p>}

            {rows.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: 34 }}>#</th>
                                <th>Klub</th>
                                <th title="Odohrané">Z</th>
                                <th title="Výhry">V</th>
                                <th title="Remízy">R</th>
                                <th title="Prehry">P</th>
                                <th title="Skóre">Skóre</th>
                                <th title="Rozdiel">+/−</th>
                                <th title="Body">B</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.team}>
                                    <td style={{ borderLeft: `3px solid ${ZONES[r.zone]?.color || 'transparent'}`, fontWeight: 600 }}>
                                        {r.rank}
                                    </td>
                                    <td>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {r.logo_file && <img src={`/logos/ucl2026/${r.logo_file}`} alt=""
                                                style={{ width: 22, height: 22, objectFit: 'contain' }}
                                                onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />}
                                            <span>{r.team_name}</span>
                                            {r.country_code && <span style={{ color: '#999', fontSize: '0.78rem' }}>({r.country_code})</span>}
                                        </span>
                                    </td>
                                    <td>{r.gp}</td>
                                    <td>{r.w}</td>
                                    <td>{r.d}</td>
                                    <td>{r.l}</td>
                                    <td>{r.gf}:{r.ga}</td>
                                    <td>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                                    <td><strong>{r.pts}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
