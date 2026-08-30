import { useEffect, useState } from 'react';
import {
    getUclPdfStatus, loadUclGamesFromPdf,
    getUclTipsStatus, generateUclTips,
    getUclResultsStatus, generateUclResults,
} from '../../api/uclAdmin';
import styles from './Admin.module.css';

const PHASE_LABELS = {
    LEAGUE: 'Ligová fáza',
    PO: 'Baráž o play-off',
    R16: 'Osemfinále',
    QF: 'Štvrťfinále',
    SF: 'Semifinále',
    F: 'Finále',
};

// starts_at je naive UTC — zobraz ho ako dátum bez posunu.
const fmt = s => (s ? new Date(String(s).replace(' ', 'T') + 'Z').toLocaleDateString('sk-SK') : '—');

// Spoločný obal sekcie, aby všetky tri vyzerali rovnako.
function Section({ color, title, children }) {
    return (
        <div className={styles.card} style={{ padding: 20, marginTop: 16, borderLeft: `4px solid ${color}` }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '1rem', color }}>{title}</h3>
            {children}
        </div>
    );
}

const hint = { margin: '0 0 14px', fontSize: '0.82rem', color: '#666' };
const row = { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 };
const checkbox = { display: 'flex', alignItems: 'center', gap: 6 };
const note = { margin: '0 0 12px', fontSize: '0.8rem', color: '#666' };

// ────────────────────────────────────────────────────────────
// 1. Načítať zápasy z PDF
// ────────────────────────────────────────────────────────────
function LoadFromPdf({ onChange }) {
    const [status, setStatus] = useState(null);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = () => getUclPdfStatus().then(setStatus).catch(e => setError(e.message));
    useEffect(() => { load(); }, []);

    const run = async () => {
        const tips = Number(status?.tips) || 0;
        if (tips > 0 && !confirm) {
            setError(`Na zápasoch visí ${tips} tipov. Zapni Zmazať aj tipy, ak ich chceš prepísať.`);
            return;
        }
        if (!window.confirm(
            'Naozaj načítať zápasy z PDF? Prepíšu sa všetky zápasy, výsledky'
            + (tips > 0 ? ` aj ${tips} tipov.` : '.'))) return;

        setBusy(true); setError(''); setMessage('');
        try {
            const res = await loadUclGamesFromPdf({ confirm });
            setMessage(`✓ Načítaných ${res.total} zápasov`
                + (res.tips_deleted > 0 ? `, zmazaných ${res.tips_deleted} tipov.` : '.'));
            await load();
            onChange?.();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    const hasTable = status?.has_pdf_table;

    return (
        <Section color="#0d6efd" title="📥 Načítať zápasy z PDF">
            <p style={hint}>
                Načíta originálnu verziu zápasov z tabuľky <code>games_pdf</code> — dvojice, kolá
                aj termíny presne podľa zdrojového rozpisu. Zápasy v súťaži sa nahradia,
                takže sa dá kedykoľvek vrátiť k čistému stavu.
            </p>

            {hasTable === false && (
                <p className={styles.error}>
                    ✗ Tabuľka <code>games_pdf</code> neexistuje — najprv spusti migráciu 062.
                </p>
            )}

            <div style={row}>
                <label style={checkbox}>
                    <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />
                    <span style={{ fontSize: '0.8rem' }}>Zmazať aj tipy</span>
                </label>
                <button className={styles.btn} onClick={run} disabled={busy || !hasTable}>
                    {busy ? 'Načítavam…' : 'Načítať zápasy z PDF'}
                </button>
            </div>

            {hasTable && (
                <p style={note}>
                    V <code>games_pdf</code>: <strong>{status.total_pdf}</strong> zápasov &nbsp;|&nbsp;
                    v súťaži: <strong>{status.total_games}</strong> &nbsp;|&nbsp;
                    tipov: <strong>{status.tips}</strong>
                </p>
            )}

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {status?.phases?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table className={styles.table} style={{ marginTop: 8 }}>
                        <thead><tr><th>Fáza</th><th>Zápasov</th><th>S tímami</th><th>Od</th><th>Do</th></tr></thead>
                        <tbody>
                            {status.phases.map(p => (
                                <tr key={p.phase}>
                                    <td>{PHASE_LABELS[p.phase] || p.phase}</td>
                                    <td>{p.games}</td>
                                    <td>{Number(p.with_teams) > 0
                                        ? p.with_teams
                                        : <span className={styles.unused}>čaká na žreb</span>}</td>
                                    <td>{fmt(p.first_game)}</td>
                                    <td>{fmt(p.last_game)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Section>
    );
}

// ────────────────────────────────────────────────────────────
// 2. Generuj tipy hráčov LF
// ────────────────────────────────────────────────────────────
function GenerateTips({ reloadKey, onChange }) {
    const [status, setStatus] = useState(null);
    const [replace, setReplace] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = () => getUclTipsStatus().then(setStatus).catch(e => setError(e.message));
    useEffect(() => { load(); }, [reloadKey]);

    const run = async () => {
        const existing = Number(status?.existing_tips) || 0;
        if (replace && existing > 0 && !window.confirm(
            `Naozaj prepísať ${existing} existujúcich tipov?`)) return;

        setBusy(true); setError(''); setMessage('');
        try {
            const res = await generateUclTips({ replace });
            setMessage(`✓ Vytvorených ${res.created} tipov — ${res.users} hráčov × ${res.games} zápasov.`
                + (res.scored > 0 ? ` Obodovaných ${res.scored}.` : ''));
            await load();
            onChange?.();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    const games = Number(status?.league_games) || 0;

    return (
        <Section color="#6f42c1" title="🎯 Generuj tipy hráčov LF">
            <p style={hint}>
                Vygeneruje tipy všetkých hráčov na všetky zápasy ligovej fázy. Skóre je náhodné,
                ale s realistickým rozložením gólov — najčastejšie 0 až 2. Bez prepísania sa
                doplnia iba chýbajúce tipy.
            </p>

            <div style={row}>
                <label style={checkbox}>
                    <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
                    <span style={{ fontSize: '0.8rem' }}>Prepísať existujúce</span>
                </label>
                <button className={styles.btn} onClick={run} disabled={busy || games === 0}>
                    {busy ? 'Generujem…' : 'Vygenerovať tipy'}
                </button>
            </div>

            {status && (
                <p style={{ ...note, color: games === 0 ? '#c0392b' : '#666' }}>
                    Hráčov: <strong>{status.users}</strong> &nbsp;|&nbsp;
                    zápasov ligovej fázy: <strong>{games}</strong> &nbsp;|&nbsp;
                    existujúcich tipov: <strong>{status.existing_tips}</strong> z {status.possible_tips}
                    {games === 0 && ' — najprv načítaj zápasy z PDF.'}
                </p>
            )}

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}
        </Section>
    );
}

// ────────────────────────────────────────────────────────────
// 3. Generuj výsledky LF
// ────────────────────────────────────────────────────────────
function GenerateResults({ reloadKey, onChange }) {
    const [status, setStatus] = useState(null);
    const [replace, setReplace] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const load = () => getUclResultsStatus().then(setStatus).catch(e => setError(e.message));
    useEffect(() => { load(); }, [reloadKey]);

    const run = async () => {
        const done = Number(status?.with_result) || 0;
        if (replace && done > 0 && !window.confirm(
            `Naozaj prepísať výsledky dohraných zápasov? Zadaných je ${done}.`)) return;

        setBusy(true); setError(''); setMessage('');
        try {
            const res = await generateUclResults({ replace });
            setMessage(`✓ Vygenerovaných ${res.updated} výsledkov, tabuľka má ${res.standings_rows} tímov,`
                + ` obodovaných ${res.tips_scored} tipov.`);
            await load();
            onChange?.();
        } catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };

    const games = Number(status?.league_games) || 0;
    // Bez prepisovania ma zmysel spustit len vtedy, ked nieco caka na vysledok.
    const nothingToDo = games === 0
        || Number(status?.finished) === 0
        || (!replace && Number(status?.pending) === 0);

    return (
        <Section color="#198754" title="⚽ Generuj výsledky LF">
            <p style={hint}>
                Vygeneruje výsledky <strong>dohraných</strong> zápasov ligovej fázy a rovno ich schváli
                — prepočíta sa ligová tabuľka aj body za tipy. Za dohraný sa považuje zápas, ktorému
                od výkopu ubehli aspoň {status?.match_hours ?? 3} hodiny, takže pri posúvaní termínov
                sa vždy doplní presne to, čo už malo byť odohrané. Predĺženie sa v ligovej fáze nehrá,
                remíza je platný výsledok.
            </p>

            <div style={row}>
                <label style={checkbox}>
                    <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
                    <span style={{ fontSize: '0.8rem' }}>Prepísať existujúce</span>
                </label>
                <button className={styles.btn} onClick={run} disabled={busy || nothingToDo}>
                    {busy ? 'Generujem…' : 'Vygenerovať výsledky'}
                </button>
            </div>

            {status && (
                <p style={{ ...note, color: games === 0 ? '#c0392b' : '#666' }}>
                    Zápasov ligovej fázy: <strong>{games}</strong> &nbsp;|&nbsp;
                    dohraných: <strong>{status.finished}</strong> &nbsp;|&nbsp;
                    čaká na výsledok: <strong>{status.pending}</strong> &nbsp;|&nbsp;
                    schválených: <strong>{status.approved}</strong>
                    {games === 0 && ' — najprv načítaj zápasy z PDF.'}
                </p>
            )}

            {status && games > 0 && Number(status.finished) === 0 && (
                <p style={note}>
                    Zatiaľ nie je dohraný ani jeden zápas — v správe zápasov posuň termíny do minulosti.
                </p>
            )}

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}
        </Section>
    );
}

export default function UclTestTools() {
    // Načítanie z PDF prepíše zápasy aj tipy, preto si ostatné sekcie
    // po ňom obnovia svoj stav.
    const [reloadKey, setReloadKey] = useState(0);
    const refresh = () => setReloadKey(k => k + 1);

    return (
        <>
            <LoadFromPdf onChange={refresh} />
            <GenerateTips reloadKey={reloadKey} onChange={refresh} />
            <GenerateResults reloadKey={reloadKey} onChange={refresh} />
        </>
    );
}
