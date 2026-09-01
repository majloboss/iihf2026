import { useEffect, useState } from 'react';
import { getUclStandings, getUclBracket } from '../../api/ucl';
import UclBracket from './UclBracket';
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
    // Kým beží ligová fáza, zaujíma tabuľka; v play-off skôr pavúk.
    const [pohlad, setPohlad] = useState(null);
    // null = ešte sa nevie, či beží play-off
    const [jePlayoff, setJePlayoff] = useState(null);

    useEffect(() => {
        getUclStandings().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
        // Po schvaleni vysledku sa meni poradie, preto sa tabulka sama obnovuje.
        const iv = setInterval(() => { getUclStandings().then(setRows).catch(() => {}); }, 30000);
        return () => clearInterval(iv);
    }, []);

    // Ligová fáza skončila vtedy, keď sú zostavené dvojice baráže — dovtedy
    // sa nedajú určiť. Pavúk sa načítava aj tak, takže netreba ďalšie volanie.
    useEffect(() => {
        getUclBracket()
            .then(fazy => setJePlayoff(fazy.some(f => f.ready)))
            // Keď sa pavúka nepodarí načítať, zostane predvolená tabuľka —
            // obrazovka nesmie ostať visieť na "Načítavam".
            .catch(() => setJePlayoff(false));
    }, []);

    // Predvolená záložka sa zvolí až keď sa vie, v ktorej fáze súťaž je;
    // po prepnutí používateľom sa už nemení.
    useEffect(() => {
        if (jePlayoff === null) return;
        setPohlad(cur => cur ?? (jePlayoff ? 'pavuk' : 'tabulka'));
    }, [jePlayoff]);

    // Kým sa nevie, ktorá fáza beží, nevykreslí sa ani jedna záložka — inak by
    // pohľad preblikol z tabuľky na pavúka.
    if (loading || pohlad === null) return <p>Načítavam tabuľku…</p>;
    if (error) return <p className={styles.error}>✗ {error}</p>;

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
                {/* Po ligovej fáze je dôležitejší pavúk, preto ide dopredu. */}
                {jePlayoff === true
                    ? <>{zalozka('pavuk', 'Play-off')}{zalozka('tabulka', 'Ligová fáza')}</>
                    : <>{zalozka('tabulka', 'Ligová fáza')}{zalozka('pavuk', 'Play-off')}</>}
            </div>

            {pohlad === 'pavuk' && <UclBracket />}

            {pohlad === 'tabulka' && <>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '4px 0 14px', maxWidth: 760 }}>
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
            </>}
        </div>
    );
}
