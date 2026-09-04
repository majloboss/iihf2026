import { useEffect, useMemo, useState } from 'react';
import { editUclGame, getUclGames, recalcUcl } from '../../api/ucl';
import usePhases from '../../hooks/usePhases';
import { useCompetition } from '../../context/CompetitionContext';
import { getUclTeams } from '../../api/uclAdmin';
import AdminGamesTable from './AdminGamesTable';
import gStyles from '../user/Games.module.css';
import styles from './Admin.module.css';

const PHASES = {
    LEAGUE: 'Ligová fáza',
    PO: 'Baráž o play-off',
    R16: 'Osemfinále',
    QF: 'Štvrťfinále',
    SF: 'Semifinále',
    F: 'Finále',
};

// Farby filtrov podla dolezitosti fazy.
const phaseBtnClass = (code, on) => {
    const [zakladna, aktivna] =
          code === 'F'  ? [gStyles.pGold, gStyles.pGoldOn]
        : code === 'PO' ? [gStyles.pBronze, gStyles.pBronzeOn]
        : code === 'LEAGUE' ? [gStyles.pGroup, gStyles.pGroupOn]
        : [gStyles.pPlayoff, gStyles.pPlayoffOn];
    return [gStyles.pBtn, zakladna, on ? aktivna : ''].join(' ');
};

// V stlpci Faza je malo miesta, preto kratke oznacenie: LF1-LF8 podla kola.
const shortPhase = g => g.round_no ? `LF${g.round_no}`
    : ({ PO: 'Baráž', R16: 'R16', QF: 'ŠF', SF: 'SF', F: 'Finále' }[g.game_type_code] || g.game_type_code);

// start_time je naive UTC.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const isValid = d => d instanceof Date && !Number.isNaN(d.getTime());
// DB -> formulár: naive UTC prepočítaj na miestny čas, v ktorom admin zadáva.
const toInput = s => {
    const d = asDate(s);
    if (!isValid(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// Formulár -> DB: miestny čas prepočítaj späť na naive UTC.
const fromInput = v => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} `
         + `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:00`;
};
const dayFmtRaw = new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
// Neplatny datum by vo format() vyhodil vynimku a zhodil stranku.
const dayFmt = s => { const d = asDate(s); return isValid(d) ? dayFmtRaw.format(d) : '—'; };

export default function UclAdminGames() {
    const { activeCompetition } = useCompetition();
    const { fazy } = usePhases(activeCompetition?.id);
    const [games, setGames] = useState([]);
    const [clubs, setClubs] = useState([]);
    const [phase, setPhase] = useState('all');
    const [round, setRound] = useState(null);
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = () => Promise.all([getUclGames(), getUclTeams()])
        .then(([g, c]) => { setGames(g); setClubs(c); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
    useEffect(() => { load(); }, []);

    const byPhase = useMemo(() => {
        const map = {};
        for (const g of games) (map[g.game_type_code] = map[g.game_type_code] || []).push(g);
        return map;
    }, [games]);

    // Zapas ma navrh skore z livescore, ktory admin este nepotvrdil.
    // Zadava sa na obrazovke Vysledky, tu je to iba upozornenie.
    const isSuggested = (g, side) => {
        const ulozene = side === 'home' ? g.home_score_regular : g.away_score_regular;
        if (ulozene !== null && ulozene !== undefined) return false;
        const live = side === 'home' ? g.ls_home : g.ls_away;
        return live !== null && live !== undefined;
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        setBusy(editing.game_id); setError(''); setMessage('');
        try {
            await editUclGame({
                game_id: editing.game_id,
                home_team_id: editing.home_team_id || null,
                away_team_id: editing.away_team_id || null,
                start_time: fromInput(editing.start_time),
                venue: editing.venue || '',
                flashscore_url: editing.flashscore_url || '',
                tips_open: editing.tips_open,
            });
            setEditing(null);
            await load();
            setMessage('✓ Zápas bol upravený.');
        } catch (err) { setError(err.message); }
        finally { setBusy(null); }
    };

    const recalc = async () => {
        setBusy('recalc'); setError(''); setMessage('');
        try {
            const r = await recalcUcl();
            setMessage(`✓ Prepočítané: ${r.standings_rows} tímov v tabuľke, ${r.tips_updated} tipov.`);
            await load();
        } catch (e) { setError(e.message); }
        finally { setBusy(null); }
    };

    if (loading) return <p>Načítavam zápasy…</p>;
    const list = (phase === 'all' ? games : (byPhase[phase] || []))
        .filter(g => phase !== 'LEAGUE' || !round || Number(g.round_no) === round)
        .sort((a, b) => a.game_id - b.game_id);
    const suggested = list.filter(g => isSuggested(g, 'home') || isSuggested(g, 'away')).length;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div className={gStyles.filters} style={{ alignItems: 'center' }}>
                        <button className={phaseBtnClass('LEAGUE', phase === 'all')}
                            onClick={() => { setPhase('all'); setRound(null); }}>ALL</button>
                        {/* Kola ligovej fazy su rovnocenne filtre, preto v jednom riadku. */}
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(r => (
                            <button key={r}
                                className={phaseBtnClass('LEAGUE', phase === 'LEAGUE' && round === r)}
                                onClick={() => { setPhase('LEAGUE'); setRound(r); }}>
                                LF{r}
                            </button>
                        ))}
                        {Object.entries(PHASES).filter(([key]) => key !== 'LEAGUE').map(([key, label]) => (
                            <button key={key} title={label}
                                className={phaseBtnClass(key, phase === key)}
                                onClick={() => { setPhase(key); setRound(null); }}>
                                {key === 'PO' ? 'BAR' : key}
                            </button>
                        ))}
                    </div>
                <button className={styles.btnSmall} onClick={recalc} disabled={busy === 'recalc'}
                        style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                    {busy === 'recalc' ? 'Prepočítavam…' : '↻ Prepočítať'}
                </button>
            </div>

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {suggested > 0 && (
                <p style={{ fontSize: '0.82rem', color: '#e67e22', margin: '0 0 10px' }}>
                    {suggested === 1
                        ? 'Jeden zápas má návrh skóre z livescore'
                        : `${suggested} zápasov má návrh skóre z livescore`}
                    {' '}(oranžovo) — skontroluj a schváľ.
                </p>
            )}

            {editing && (
                <div className={styles.uclEditorBackdrop} role="dialog" aria-modal="true">
                    <form className={styles.uclEditor} onSubmit={saveEdit}>
                        <div className={styles.uclEditorHeader}>
                            <div><h3>Upraviť zápas</h3><p>{editing.game_type_name}</p></div>
                            <button className={styles.uclEditorClose} type="button" onClick={() => setEditing(null)}>×</button>
                        </div>
                        <div className={styles.uclEditorFields}>
                            <label>Domáci
                                <select value={editing.home_team_id || ''} onChange={e => setEditing({ ...editing, home_team_id: e.target.value })}>
                                    <option value="">— neurčený —</option>
                                    {clubs.map(c => <option key={c.team_id} value={c.team_id}>{c.team_name}</option>)}
                                </select>
                            </label>
                            <label>Hostia
                                <select value={editing.away_team_id || ''} onChange={e => setEditing({ ...editing, away_team_id: e.target.value })}>
                                    <option value="">— neurčený —</option>
                                    {clubs.map(c => <option key={c.team_id} value={c.team_id}>{c.team_name}</option>)}
                                </select>
                            </label>
                            <label>Začiatok
                                <input type="datetime-local" value={editing.start_time}
                                       onChange={e => setEditing({ ...editing, start_time: e.target.value })} required />
                            </label>
                            {/* Fáza určuje, pod ktorým kolom sa zápas zobrazí vo
                                filtroch a v štatistikách.

                                Kým nebeží migrácia 075, stĺpec `phase_id` ešte
                                neexistuje a výber sa neuloží — preto je vidieť
                                aspoň to, čo zápas nesie dnes a čo mu migrácia
                                priradí. */}
                            <label className={styles.uclEditorFull}>Fáza / kolo
                                <select value={editing.phase_id || ''}
                                        onChange={e => setEditing({ ...editing, phase_id: e.target.value })}>
                                    <option value="">— neurčená —</option>
                                    {fazy.map(f => (
                                        <option key={f.code} value={f.id}>
                                            {f.label} — {f.title}
                                        </option>
                                    ))}
                                </select>
                                <small style={{ display: 'block', marginTop: 4, color: '#888',
                                                fontWeight: 400, lineHeight: 1.5 }}>
                                    V zápase je <code>{editing.game_type_code}</code>
                                    {editing.leg ? <>, odveta <code>{editing.leg}</code></> : null}
                                    {' · '}
                                    {editing.phase_id
                                        ? <>naviazané na <strong>{editing.match_stat_code}</strong></>
                                        : editing.navrh_kolo
                                            ? <>migrácia priradí <strong>{editing.navrh_kolo}</strong></>
                                            : <>bez fázy</>}
                                </small>
                            </label>
                            <label>Štadión
                                <input value={editing.venue} maxLength={100}
                                       onChange={e => setEditing({ ...editing, venue: e.target.value })} />
                            </label>
                            <label className={styles.uclEditorFull} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={editing.tips_open}
                                       onChange={e => setEditing({ ...editing, tips_open: e.target.checked })} />
                                <span>Tipovanie otvorené</span>
                            </label>
                        </div>
                        <div className={styles.uclEditorActions}>
                            <button className={styles.btn} type="submit">Uložiť</button>
                            <button className={styles.btnSmall} type="button" onClick={() => setEditing(null)}>Zrušiť</button>
                        </div>
                    </form>
                </div>
            )}

            <AdminGamesTable
                rows={list.map(g => {
                    const klub = (name, logo) => name
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            {logo && <img src={`/logos/ucl2026/${logo}`} alt=""
                                          style={{ width: 20, height: 20, objectFit: 'contain' }}
                                          onError={e => { e.target.style.display = 'none'; }} />}
                            {name}
                          </span>
                        : <span style={{ color: '#aaa' }}>TBD</span>;
                    return {
                        key: g.game_id,
                        number: g.game_id,
                        phaseLabel: shortPhase(g),
                        dateLocal: dayFmt(g.start_time),
                        homeCell: klub(g.home_name, g.home_logo),
                        awayCell: klub(g.away_name, g.away_logo),
                        result: g.home_score_regular != null
                            ? `${g.home_score_regular}:${g.away_score_regular}` : null,
                        venue: g.venue,
                        status: g.result_approved ? 'finished'
                            : (asDate(g.start_time) <= new Date() ? 'live' : 'scheduled'),
                        flashscore_url: g.flashscore_url,
                        raw: g,
                    };
                })}
                onEdit={g => setEditing({
                    game_id: g.game_id, game_type_name: g.game_type_name,
                    phase_id: g.phase_id ?? '',
                    match_stat_code: g.match_stat_code, navrh_kolo: g.navrh_kolo,
                    game_type_code: g.game_type_code, leg: g.leg,
                    home_team_id: g.home_team_id || '', away_team_id: g.away_team_id || '',
                    start_time: toInput(g.start_time), venue: g.venue || '',
                    flashscore_url: g.flashscore_url || '', tips_open: g.tips_open,
                })}
            />
            {list.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                    V tejto fáze zatiaľ nie sú zápasy.
                </p>
            )}
        </div>
    );
}
