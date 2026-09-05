import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getUclGames, saveUclTip } from '../../api/ucl';
import { asDate, canTip, isUntipped as isUntippedGame, isValidDate, uclScoreText as scoreText } from '../../utils/tipWindow';
import UclZapas from '../../components/UclZapas';
import PhaseFilter from '../../components/PhaseFilter';
import usePhases from '../../hooks/usePhases';
import { useCompetition } from '../../context/CompetitionContext';
import UclGroupTips from './UclGroupTips';
import styles from './Games.module.css';

// start_time je naive UTC, preto ho tak treba aj interpretovať.
// Zoskupenie podľa miestneho dňa, nie podľa UTC — inak by neskorý zápas
// spadol pod nasledujúci dátum.
const dayKey = s => {
    const d = asDate(s);
    if (!isValidDate(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const timeFmtRaw = new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit' });
const dayFmtRaw = new Intl.DateTimeFormat('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' });
const timeFmt = s => { const d = asDate(s); return isValidDate(d) ? timeFmtRaw.format(d) : '—'; };
const dayFmt = s => { const d = asDate(s); return isValidDate(d) ? dayFmtRaw.format(d) : '—'; };
// Dnešok v tvare kľúča hracieho dňa — kalendár ho zvýrazní.
const dnesK = new Date().toLocaleDateString('sv-SE');

// Fázy v poradí, ako idú v súťaži. LF1–LF8 sú kolá ligovej fázy.



export default function UclGames() {
    const [games, setGames] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Filtre
    // Odkaz z pavúka predvolí fázu aj deň: /games?faza=SF&den=2027-05-04.
    // Fáza je skratka kola z číselníka (LF3, BAR-1, R16-2, F).
    const navigate = useNavigate();
    const { activeCompetition } = useCompetition();
    const competitionId = activeCompetition?.id;
    const { sediFaze } = usePhases(competitionId);

    const [searchParams] = useSearchParams();
    const [phase, setPhase] = useState(() => searchParams.get('faza') || '');
    const [onlyUntipped, setOnlyUntipped] = useState(false);
    const [club, setClub] = useState('');
    // Logá klubov zaberajú celý riadok, preto sa ukážu až na vyžiadanie.
    const [zobrazKluby, setZobrazKluby] = useState(false);
    const [day, setDay] = useState(() => searchParams.get('den') || '');

    useEffect(() => {
        getUclGames().then(setGames).catch(e => setError(e.message)).finally(() => setLoading(false));
        // Vysledky a priebezne skore sa menia pocas zapasu, rovnako ako v prehlade.
        // Bez obnovy by hrac videl stary stav, kym stranku sam nenacita.
        const iv = setInterval(() => { getUclGames().then(setGames).catch(() => {}); }, 30000);
        return () => clearInterval(iv);
    }, []);

    // Skratku kola nesie zápas z číselníka. Kým nebeží migrácia 075, príde
    // z API `navrh_kolo` — tá istá hodnota, akú migrácia priradí.
    const kolo = (g) => g.match_stat_code ?? g.navrh_kolo;
    const matchesPhase = (g) => sediFaze(kolo(g), phase);
    const matchesClub = (g) => !club || g.home_code === club || g.away_code === club;
    const isUntipped = (g) => isUntippedGame(g);

    // Kluby a dni sa ponúkajú podľa ostatných filtrov, nech nevznikne prázdny výber.
    const clubs = useMemo(() => {
        const map = new Map();
        for (const g of games) {
            if (!matchesPhase(g)) continue;
            for (const side of ['home', 'away']) {
                const code = g[`${side}_code`];
                if (code && !map.has(code)) map.set(code, { code, name: g[`${side}_name`], logo: g[`${side}_logo`] });
            }
        }
        return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, 'sk'));
    }, [games, phase]);

    const days = useMemo(() => [...new Set(games
        .filter(g => matchesPhase(g) && matchesClub(g))
        .map(g => dayKey(g.start_time)))].sort(), [games, phase, club]);

    const filtered = useMemo(() => games.filter(g =>
        matchesPhase(g) && matchesClub(g)
        && (!day || dayKey(g.start_time) === day)
        && (!onlyUntipped || isUntipped(g))
    ), [games, phase, club, day, onlyUntipped]);

    // Zoskupenie podľa dní pre prehľadnejší výpis.
    const byDay = useMemo(() => {
        const map = new Map();
        for (const g of filtered) {
            const k = dayKey(g.start_time);
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(g);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [filtered]);

    const draftOf = (g, side) => {
        const d = drafts[g.game_id];
        if (d && d[side] !== undefined) return d[side];
        const v = side === 'home' ? g.home_score_tip : g.away_score_tip;
        return v === null || v === undefined ? '' : String(v);
    };
    const setDraft = (id, side, value) =>
        setDrafts(cur => ({ ...cur, [id]: { ...cur[id], [side]: value.replace(/[^0-9]/g, '').slice(0, 2) } }));

    const save = async (g) => {
        const home = draftOf(g, 'home'), away = draftOf(g, 'away');
        if (home === '' || away === '') { setError('Vyplň oba tipy.'); return; }
        setSaving(g.game_id); setError(''); setMessage('');
        try {
            await saveUclTip(g.game_id, Number(home), Number(away));
            setGames(cur => cur.map(x => x.game_id === g.game_id
                ? { ...x, home_score_tip: Number(home), away_score_tip: Number(away) } : x));
            setMessage('✓ Tip bol uložený.');
        } catch (e) { setError(e.message); }
        finally { setSaving(null); }
    };

    const resetAll = () => { setPhase(''); setClub(''); setDay(''); setOnlyUntipped(false); };
    const anyFilter = phase || club || day || onlyUntipped;

    if (loading) return <p>Načítavam zápasy…</p>;

    return (
        <div>
            {/* Filter kôl — skratky, farby aj zbaľovanie určuje číselník. */}
            <div style={{ marginTop: 12 }}>
                <PhaseFilter
                    competitionId={competitionId}
                    hodnota={phase}
                    onZmena={kod => { setPhase(kod); setDay(''); }}
                    onVsetky={resetAll}
                    ineFiltre={Boolean(club || day || onlyUntipped)}
                    prefix={
                        <button
                            className={onlyUntipped ? styles.untippedBtnOn : styles.untippedBtn}
                            onClick={() => setOnlyUntipped(v => !v)}
                            title="Zobraz iba zápasy, ktoré si ešte netipoval">
                            1<span style={{ fontSize: '0.7em', verticalAlign: 'middle' }}>x</span>2
                        </button>
                    }
                    // Kluby nie sú fáza — filtrujú naprieč kolami.
                    extra={clubs.length > 0 && (
                        <button
                            className={zobrazKluby ? styles.btnTabulkyActive : styles.btnTabulky}
                            onClick={() => setZobrazKluby(v => !v)}
                            title="Filtrovať podľa klubu">
                            KLUB{club ? ` (${club})` : ''}
                        </button>
                    )}
                    // TAB nefiltruje — prepne na tabuľky, ako vo FIFA a IIHF.
                    koniec={
                        <button
                            className={styles.btnTabulky}
                            onClick={() => navigate('/tabulky')}
                            title="Tabuľky">
                            TAB
                        </button>
                    }
                />
            </div>

            {/* Logá klubov — až po kliknutí na KLUB */}
            {zobrazKluby && clubs.length > 0 && (
                <div className={styles.clubsRow}>
                    {clubs.map(c => (
                        <button key={c.code} title={c.name}
                            className={club === c.code ? `${styles.flagBtn} ${styles.flagBtnActive}` : styles.flagBtn}
                            onClick={() => { setClub(cur => cur === c.code ? '' : c.code); setDay(''); }}>
                            {c.logo
                                ? <img src={`/logos/ucl2026/${c.logo}`} alt="" className={styles.clubLogo}
                                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                                : <span style={{ height: 26 }} />}
                            <span className={styles.clubCode}>{c.code}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* 3. riadok — hracie dni */}
            {days.length > 0 && (
                <div className={styles.calRow}>
                    {days.map(dk => {
                        const d = new Date(dk + 'T12:00:00');
                        return (
                            <button key={dk}
                                className={[styles.calDay,
                                            dk === dnesK ? styles.calDayToday : '',
                                            dk === day ? styles.calDayActive : ''].join(' ')}
                                onClick={() => setDay(cur => cur === dk ? '' : dk)}>
                                <span className={styles.calDayWeekday}>
                                    {d.toLocaleDateString('sk-SK', { weekday: 'short' })}
                                </span>
                                <span className={styles.calDayNum}>{d.getDate()}</span>
                                <span className={styles.calDayMonth}>{d.getMonth() + 1}.</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {anyFilter && (
                <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#777' }}>
                    Zobrazených {filtered.length} z {games.length} zápasov ·{' '}
                    <button onClick={resetAll} style={{ border: 'none', background: 'none', color: '#1a3a6b', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                        zrušiť filtre
                    </button>
                </p>
            )}

            {message && <p className={styles.success}>{message}</p>}
            {error && <p className={styles.error}>✗ {error}</p>}

            {filtered.length === 0 && <p className={styles.empty}>Žiadne zápasy nezodpovedajú filtru.</p>}

            {byDay.map(([d, list]) => (
                <div key={d} style={{ marginTop: 16 }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#666' }}>
                        {dayFmt(list[0].start_time)}
                    </h4>
                    {list.map(g => {
                        const known = g.home_team_id && g.away_team_id;
                        const closed = !canTip(g);
                        const started = isValidDate(asDate(g.start_time)) && asDate(g.start_time) <= new Date();
                        // Skóre je aj priebežné z livescore, nielen zadaný výsledok.
                        const hasResult = scoreText(g) !== null;
                        // Zapas uz zacal, ale vysledok este nie je schvaleny.
                        const jeLive = started && !g.result_approved;
                        return (
                            <div key={g.game_id} className={styles.card}
                                 style={{ padding: 12, marginBottom: 6 }}>
                                {/* Dátum sa opakuje aj v karte: pri skrolovaní hlavička
                                    dňa zmizne a bez neho sa človek stratí. */}
                                <UclZapas g={g}
                                    termin={<>
                                        <div style={{ whiteSpace: 'nowrap' }}>{dayFmt(g.start_time)}</div>
                                        <div style={{ whiteSpace: 'nowrap' }}>{timeFmt(g.start_time)}</div>
                                        <div style={{ color: '#999' }}>
                                            {kolo(g)}
                                        </div>
                                    </>}
                                    stred={
                                        <span style={{ display: 'flex', flexDirection: 'column',
                                                       alignItems: 'center', gap: 3 }}>
                                            {jeLive && <span className="liveBadge">LIVE</span>}
                                            <strong style={{ color: jeLive ? '#dc3545' : hasResult ? '#1a3a6b' : '#bbb' }}>
                                                {hasResult ? scoreText(g) : 'vs'}
                                            </strong>
                                        </span>}
                                    akcia={known && !closed && (
                                        <button onClick={() => save(g)} disabled={saving === g.game_id}>
                                            {saving === g.game_id ? '…' : 'OK'}
                                        </button>)}
                                    size={28}>
                                    {!known
                                        ? <span style={{ gridColumn: '1 / 4', textAlign: 'center',
                                                         fontSize: '0.78rem', color: '#999' }}>čaká na súperov</span>
                                        : closed
                                            ? <span style={{ gridColumn: '1 / 4', textAlign: 'center',
                                                             fontSize: '0.82rem' }}>
                                                {g.home_score_tip !== null
                                                    ? <>Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong>
                                                        {g.points_earned !== null && <> · {g.points_earned} b.</>}</>
                                                    : <span style={{ color: '#999' }}>netipoval si</span>}
                                              </span>
                                            : <>
                                                <span style={{ gridColumn: 1, justifySelf: 'end' }}>
                                                    <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                                                           inputMode="numeric" style={{ width: 36, padding: '4px 0', textAlign: 'center' }} aria-label="Tip domáci" />
                                                </span>
                                                <span style={{ gridColumn: 2, textAlign: 'center' }}>:</span>
                                                <span style={{ gridColumn: 3, justifySelf: 'start' }}>
                                                    <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                                                           inputMode="numeric" style={{ width: 36, padding: '4px 0', textAlign: 'center' }} aria-label="Tip hostia" />
                                                </span>
                                              </>}
                                </UclZapas>

                                {started && <UclGroupTips game={g} />}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
