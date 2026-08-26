import { useEffect, useState } from 'react';
import { generateUclGames, getUclGamesStatus } from '../../api/uclAdmin';
import styles from './Admin.module.css';

const PHASE_LABELS = {
    LEAGUE: 'Ligová fáza',
    PO: 'Baráž o play-off',
    R16: 'Osemfinále',
    QF: 'Štvrťfinále',
    SF: 'Semifinále',
    F: 'Finále',
};

const fmt = iso => (iso ? new Date(iso).toLocaleDateString('sk-SK') : '—');

export default function UclGameGenerator() {
    const [status, setStatus] = useState(null);
    const [leagueStart, setLeagueStart] = useState('2026-09-05');
    const [playoffStart, setPlayoffStart] = useState('2027-03-01');
    const [seed, setSeed] = useState(2026);
    const [replace, setReplace] = useState(false);
    const [running, setRunning] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = () => getUclGamesStatus().then(setStatus).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);

    const generate = async () => {
        const existing = Number(status?.total_games) || 0;
        if (existing > 0 && !replace) {
            setError('V súťaži už sú zápasy. Zapni Nahradiť existujúce, ak ich chceš prepísať.');
            return;
        }
        if (existing > 0 && !window.confirm(
            `Naozaj prepísať ${existing} existujúcich zápasov? Zmažú sa aj zadané výsledky a tipy k nim.`)) return;

        setRunning(true); setError(''); setMessage('');
        try {
            const res = await generateUclGames({ league_start: leagueStart, playoff_start: playoffStart, seed: Number(seed), replace });
            setMessage(`✓ Vygenerovaných ${res.total} zápasov (ligová fáza ${res.created.LEAGUE}, play-off ${res.total - res.created.LEAGUE}).`);
            await load();
        } catch (e) { setError(e.message); }
        finally { setRunning(false); }
    };

    const clubs = Number(status?.active_clubs) || 0;
    const enoughClubs = clubs >= 36;

    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: '4px solid #0d6efd' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#0d6efd' }}>🎲 Rozlosovanie zápasov</h3>
            <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: '#666' }}>
                Vygeneruje kostru súťaže. Ligová fáza dostane náhodné dvojice z číselníka klubov,
                play-off sa založí s prázdnymi tímami — tie sa doplnia podľa výsledkov.
                Po skutočnom žrebe stačí dvojice opraviť v správe zápasov.
            </p>

            <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', margin: '0 0 16px', fontSize: '0.82rem', color: '#555' }}>
                <strong>Formát:</strong> 36 klubov v jednej tabuľke, každý 8 zápasov (4 doma, 4 vonku), bez odviet.
                Kolo v utorok a stredu, každé dva týždne.
                Play-off: miesta 9–24 hrajú o postup (zápas + odveta), víťazi sa pripoja k tímom z miest 1–8.
                Všetky kolá na dva zápasy okrem finále, o 3. miesto sa nehrá.
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>Začiatok ligovej fázy</span>
                    <input type="date" value={leagueStart} onChange={e => setLeagueStart(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>Začiatok play-off</span>
                    <input type="date" value={playoffStart} onChange={e => setPlayoffStart(e.target.value)} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>Seed žrebu</span>
                    <input type="number" value={seed} onChange={e => setSeed(e.target.value)} style={{ width: 100 }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 30 }}>
                    <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
                    <span style={{ fontSize: '0.8rem' }}>Nahradiť existujúce</span>
                </label>
                <button className={styles.btn} onClick={generate} disabled={running || !enoughClubs} style={{ height: 32 }}>
                    {running ? 'Generujem…' : 'Vygenerovať rozlosovanie'}
                </button>
            </div>

            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: enoughClubs ? '#666' : '#c0392b' }}>
                Aktívnych klubov v číselníku: <strong>{clubs}</strong>
                {enoughClubs ? ' — ligová fáza použije náhodných 36.' : ' — na ligovú fázu treba aspoň 36.'}
            </p>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {status?.phases?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table} style={{ marginTop: 8 }}>
                        <thead><tr><th>Fáza</th><th>Zápasov</th><th>S tímami</th><th>Od</th><th>Do</th></tr></thead>
                        <tbody>
                            {status.phases.map(p => (
                                <tr key={p.game_type_code}>
                                    <td>{PHASE_LABELS[p.game_type_code] || p.game_type_code}</td>
                                    <td>{p.games}</td>
                                    <td>{Number(p.with_home) > 0
                                        ? p.with_home
                                        : <span className={styles.unused}>čaká na výsledky</span>}</td>
                                    <td>{fmt(p.first_game)}</td>
                                    <td>{fmt(p.last_game)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: '#777' }}>
                        Zápasov spolu: {status.total_games}
                    </p>
                </div>
            )}
        </div>
    );
}
