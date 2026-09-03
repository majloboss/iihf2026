import { useEffect, useState } from 'react';
import { getUclStandings, recalcUcl } from '../../api/ucl';
import { saveUclStandingsOrder } from '../../api/uclAdmin';
import Bracket from '../../components/Bracket';
import { useCompetition } from '../../context/CompetitionContext';
import styles from '../user/GroupStandings.module.css';

// Postupové pásma podľa umiestnenia v ligovej fáze.
const ZONES = {
    R16: { color: '#28a745', label: 'Priamy postup do osemfinále (1.–8.)' },
    PO:  { color: '#ffc107', label: 'Play-off o osemfinále (9.–24.)' },
    OUT: { color: '#dc3545', label: 'Vyradenie (25.–36.)' },
};

const zoneOf = rank => (rank <= 8 ? 'R16' : rank <= 24 ? 'PO' : 'OUT');

export default function UclAdminStandings() {
    const { activeCompetition } = useCompetition();
    const competitionId = activeCompetition?.id;
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    // Kým sa poradie neuloží, drží sa len v prehliadači.
    const [zmenene, setZmenene] = useState(false);
    // Kým beží ligová fáza, zaujíma tabuľka; v play-off skôr pavúk.
    const [pohlad, setPohlad] = useState('tabulka');

    const load = () => getUclStandings()
        .then(d => { setRows(d); setZmenene(false); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));

    useEffect(() => { load(); }, []);

    // Pri rovnosti bodov rozhodujú kritériá UEFA, ktoré aplikácia nepozná —
    // preto sa poradie musí dať prestaviť ručne. Vymeniť sa však dajú iba
    // kluby s rovnakým počtom bodov; poradie medzi rôznymi bodmi určujú
    // výsledky, nie admin.
    const daSaPresunut = (idx, smer) => {
        const ciel = idx + smer;
        if (ciel < 0 || ciel >= rows.length) return false;
        return rows[idx].pts === rows[ciel].pts;
    };

    const presun = (idx, smer) => {
        if (!daSaPresunut(idx, smer)) return;
        const ciel = idx + smer;
        const nove = [...rows];
        [nove[idx], nove[ciel]] = [nove[ciel], nove[idx]];
        setRows(nove.map((r, i) => ({ ...r, rank: i + 1, zone: zoneOf(i + 1) })));
        setZmenene(true);
        setMessage('');
    };

    const ulozit = async () => {
        setBusy(true); setError(''); setMessage('');
        try {
            await saveUclStandingsOrder(rows.map(r => r.team_id));
            setMessage('✓ Poradie uložené. Prepočet ho už neprepíše.');
            await load();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    const prepocitat = async () => {
        if (zmenene && !window.confirm('Máš neuložené poradie. Prepočtom o zmeny prídeš. Pokračovať?')) return;
        setBusy(true); setError(''); setMessage('');
        try {
            const r = await recalcUcl();
            setMessage(`✓ Prepočítané: ${r.standings_rows} tímov, ${r.tips_updated} tipov.`);
            await load();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    if (loading) return <p>Načítavam tabuľku…</p>;

    const rucne = rows.some(r => r.finalized);

    const zalozka = (kluc, popis) => (
        <button key={kluc} onClick={() => setPohlad(kluc)}
                style={{ padding: '6px 16px', border: 'none', background: 'none', cursor: 'pointer',
                         fontSize: '0.9rem', fontWeight: pohlad === kluc ? 700 : 400,
                         color: pohlad === kluc ? '#1a3a6b' : '#888',
                         borderBottom: `2px solid ${pohlad === kluc ? '#1a3a6b' : 'transparent'}`,
                         marginBottom: -1 }}>
            {popis}
        </button>
    );

    return (
        <div>
            <h2>Liga majstrov 2026/27</h2>

            <div style={{ display: 'flex', gap: 4, margin: '10px 0 14px',
                          borderBottom: '1px solid #e9ecef' }}>
                {zalozka('tabulka', 'Ligová tabuľka')}
                {zalozka('pavuk', 'Vyraďovacia časť')}
            </div>

            {pohlad === 'pavuk' && <Bracket competitionId={competitionId} />}

            {pohlad === 'tabulka' && <>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '4px 0 10px', maxWidth: 760 }}>
                Všetkých 36 klubov v jednej spoločnej tabuľke. Každý odohrá 8 zápasov
                (4 doma, 4 vonku) a s každým súperom sa stretne najviac raz.
                <br />
                Po ligovej fáze <strong>prvých osem</strong> postupuje priamo do osemfinále.
                Kluby na <strong>9. až 24. mieste</strong> hrajú baráž o play-off — dvojzápas,
                z ktorého víťazi doplnia osemfinále. Kluby od 25. miesta končia.
                <br />
                Osemfinále, štvrťfinále aj semifinále sa hrajú na dva zápasy so
                súčtom gólov; predĺženie sa hrá až v odvete pri rovnosti súčtu.
                <strong> Finále je jediný zápas bez odvety.</strong>
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.78rem' }}>
                {Object.entries(ZONES).map(([key, z]) => (
                    <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: z.color, display: 'inline-block' }} />
                        {z.label}
                    </span>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={ulozit} disabled={busy || !zmenene}
                        style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: zmenene ? 'pointer' : 'default',
                                 background: zmenene ? '#1a3a6b' : '#dee2e6', color: zmenene ? '#fff' : '#888',
                                 fontWeight: 600, fontSize: '0.82rem' }}>
                    {busy ? 'Ukladám…' : 'Uložiť poradie'}
                </button>
                <button onClick={prepocitat} disabled={busy}
                        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #dee2e6',
                                 background: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>
                    ↻ Prepočítať z výsledkov
                </button>
                {rucne && !zmenene && (
                    <span style={{ fontSize: '0.78rem', color: '#e67e22' }}>
                        Poradie je nastavené ručne — prepočet ho zachová.
                    </span>
                )}
                {zmenene && (
                    <span style={{ fontSize: '0.78rem', color: '#c0392b' }}>Neuložené zmeny</span>
                )}
            </div>

            {message && <p style={{ color: '#28a745', fontSize: '0.85rem' }}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

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
                                <th style={{ width: 70 }}>Poradie</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={r.team_id}>
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
                                    <td style={{ fontWeight: 700 }}>{r.pts}</td>
                                    <td>
                                        <span style={{ display: 'flex', gap: 2 }}>
                                            {[[-1, '▲', 'vyššie'], [1, '▼', 'nižšie']].map(([smer, znak, kam]) => {
                                                const mozne = daSaPresunut(i, smer);
                                                return (
                                                    <button key={smer} onClick={() => presun(i, smer)} disabled={!mozne}
                                                            title={mozne ? `O miesto ${kam}`
                                                                         : 'Vymeniť sa dajú len kluby s rovnakým počtom bodov'}
                                                            style={{ border: '1px solid #dee2e6', background: '#fff', borderRadius: 4,
                                                                     cursor: mozne ? 'pointer' : 'default', padding: '0 6px',
                                                                     opacity: mozne ? 1 : 0.3 }}>{znak}</button>
                                                );
                                            })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </>}
        </div>
    );
}
