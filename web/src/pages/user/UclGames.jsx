import { useEffect, useMemo, useState } from 'react';
import { getUclGames, saveUclTip } from '../../api/ucl';
import { asDate, canTip, isUntipped as isUntippedGame, isValidDate } from '../../utils/tipWindow';
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
// Dátum bez roka — súťaž beží v jednom ročníku.
const chipDay = key => {
    const [, m, d] = key.split('-');
    return m && d ? `${Number(d)}.${Number(m)}.` : key;
};

// Fázy v poradí, ako idú v súťaži. LF1–LF8 sú kolá ligovej fázy.
const PHASES = [
    ...Array.from({ length: 8 }, (_, i) => ({
        key: `LF${i + 1}`, label: `LF${i + 1}`, code: 'LEAGUE', round: i + 1,
        title: `Ligová fáza — ${i + 1}. kolo`,
    })),
    { key: 'BAR', label: 'BAR', code: 'PO',  title: 'Baráž o postup do play-off' },
    { key: 'R16', label: 'R16', code: 'R16', title: 'Osemfinále' },
    { key: 'QF',  label: 'QF',  code: 'QF',  title: 'Štvrťfinále' },
    { key: 'SF',  label: 'SF',  code: 'SF',  title: 'Semifinále' },
    { key: 'F',   label: 'F',   code: 'F',   title: 'Finále' },
];

// Farby filtrov podľa dôležitosti fázy — rovnaké ako v admine:
// ligová fáza modrá, vyraďovacia zelená, baráž hnedá, finále zlaté.
const phaseBtnClass = (p, on) => {
    const [zakladna, aktivna] =
          p.code === 'F'  ? [styles.pGold, styles.pGoldOn]
        : p.code === 'PO' ? [styles.pBronze, styles.pBronzeOn]
        : p.code === 'LEAGUE' ? [styles.pGroup, styles.pGroupOn]
        : [styles.pPlayoff, styles.pPlayoffOn];
    return [styles.pBtn, zakladna, on ? aktivna : ''].join(' ');
};

// Po predĺžení alebo penaltách sa ukáže aj konečný výsledok: 2:1 (4:3 pp).
function scoreText(g) {
    if (g.home_score_regular === null || g.away_score_regular === null) return null;
    const base = `${g.home_score_regular} : ${g.away_score_regular}`;
    const hasFinal = g.home_score_final !== null && g.away_score_final !== null;
    if (hasFinal) return `${base} (${g.home_score_final}:${g.away_score_final} pp)`;
    // Polčasové skóre poteší, kým zápas beží.
    const ht = g.home_score_halftime !== null && g.home_score_halftime !== undefined
            && g.away_score_halftime !== null && g.away_score_halftime !== undefined;
    return ht && !g.result_approved ? `${base} (${g.home_score_halftime}:${g.away_score_halftime})` : base;
}

// Klub v karte zápasu: logo, názov a pod ním štát s vlajkou — rovnako ako
// to má FIFA, len tam je štát reprezentácia a tu krajina klubu.
function Club({ name, logo, country, countryCode, flag, align }) {
    if (!name) return <span style={{ color: '#999', fontSize: '0.85rem' }}>zatiaľ neurčený</span>;
    const right = align === 'right';
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8,
                       justifyContent: right ? 'flex-end' : 'flex-start' }}>
            {right && <ClubText name={name} country={country} countryCode={countryCode} flag={flag} right />}
            {logo
                ? <img src={`/logos/ucl2026/${logo}`} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: 28, flexShrink: 0 }} />}
            {!right && <ClubText name={name} country={country} countryCode={countryCode} flag={flag} />}
        </span>
    );
}

function ClubText({ name, country, countryCode, flag, right }) {
    return (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0,
                       alignItems: right ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontWeight: 500, lineHeight: 1.2 }}>{name}</span>
            {(country || countryCode) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                               fontSize: '0.72rem', color: '#888', lineHeight: 1.3 }}>
                    {flag && <img src={`/flags/${flag}`} alt="" style={{ width: 14, height: 10, objectFit: 'cover', flexShrink: 0 }}
                                  onError={e => { e.currentTarget.style.display = 'none'; }} />}
                    <span>{country || countryCode}</span>
                </span>
            )}
        </span>
    );
}

export default function UclGames() {
    const [games, setGames] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Filtre
    const [phase, setPhase] = useState('');
    const [onlyUntipped, setOnlyUntipped] = useState(false);
    const [club, setClub] = useState('');
    const [day, setDay] = useState('');

    useEffect(() => {
        getUclGames().then(setGames).catch(e => setError(e.message)).finally(() => setLoading(false));
        // Vysledky a priebezne skore sa menia pocas zapasu, rovnako ako v prehlade.
        // Bez obnovy by hrac videl stary stav, kym stranku sam nenacita.
        const iv = setInterval(() => { getUclGames().then(setGames).catch(() => {}); }, 30000);
        return () => clearInterval(iv);
    }, []);

    const matchesPhase = (g) => {
        if (!phase) return true;
        const p = PHASES.find(x => x.key === phase);
        if (!p) return true;
        if (g.game_type_code !== p.code) return false;
        return p.round ? Number(g.round_no) === p.round : true;
    };
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

    const untippedCount = games.filter(isUntipped).length;

    return (
        <div>
            <h2>Zápasy — Liga majstrov</h2>

            {/* 1. riadok — fázy a nenatipované */}
            <div className={styles.filters} style={{ marginTop: 12 }}>
                <button
                    className={onlyUntipped ? styles.btnTabulkyActive : styles.btnTabulky}
                    onClick={() => setOnlyUntipped(v => !v)}
                    title="Zobraz iba zápasy, ktoré si ešte netipoval">
                    1x2{untippedCount > 0 ? ` (${untippedCount})` : ''}
                </button>
                {PHASES.map(p => (
                    <button key={p.key} title={p.title}
                        className={phaseBtnClass(p, phase === p.key)}
                        onClick={() => { setPhase(cur => cur === p.key ? '' : p.key); setDay(''); }}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* 2. riadok — kluby, 9 v riadku */}
            {clubs.length > 0 && (
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
                <div className={styles.filters} style={{ marginTop: 10 }}>
                    {days.map(d => (
                        <button key={d}
                            className={day === d ? styles.btnTabulkyActive : styles.btnTabulky}
                            onClick={() => setDay(cur => cur === d ? '' : d)}>
                            {chipDay(d)}
                        </button>
                    ))}
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
                        const hasResult = g.home_score_regular !== null && g.away_score_regular !== null;
                        // Zapas uz zacal, ale vysledok este nie je schvaleny.
                        const jeLive = started && !g.result_approved;
                        return (
                            <div key={g.game_id} className={styles.card}
                                 style={{ padding: 12, marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                                <div style={{ minWidth: 92, fontSize: '0.78rem', color: '#666' }}>
                                    {timeFmt(g.start_time)}
                                    <div style={{ fontSize: '0.7rem', color: '#999' }}>
                                        {g.round_no ? `LF${g.round_no}` : g.game_type_code}
                                    </div>
                                </div>

                                <div style={{ flex: 1, minWidth: 250, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
                                    <Club name={g.home_name} logo={g.home_logo} country={g.home_country}
                                          countryCode={g.home_country_code} flag={g.home_flag} align="right" />
                                    {/* Rozohraty zapas sa oznaci rovnako ako v prehlade. */}
                                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        {jeLive && <span className="liveBadge">LIVE</span>}
                                        <strong style={{ color: jeLive ? '#dc3545' : hasResult ? '#1a3a6b' : '#bbb' }}>
                                            {hasResult ? scoreText(g) : 'vs'}
                                        </strong>
                                    </span>
                                    <Club name={g.away_name} logo={g.away_logo} country={g.away_country}
                                          countryCode={g.away_country_code} flag={g.away_flag} />
                                </div>

                                {(g.venue || g.flashscore_url) && (
                                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                  gap: 6, fontSize: '0.75rem', color: '#999', order: 5 }}>
                                        {g.venue && (
                                            <span>
                                                {g.venue}
                                                {/* Klub nemusi hrat doma na svojom stadione —
                                                    napriklad ked sa jeho krajina nehra. */}
                                                {g.home_club_venue && g.venue !== g.home_club_venue && (
                                                    <span style={{ color: '#c0392b' }}> (iný štadión)</span>
                                                )}
                                            </span>
                                        )}
                                        {g.flashscore_url && (
                                            <a href={g.flashscore_url} target="_blank" rel="noopener noreferrer"
                                               title="Sledovať na FlashScore" style={{ display: 'flex', alignItems: 'center' }}>
                                                <img src="/flashscore.png" alt="FlashScore" style={{ width: 14, height: 14 }} />
                                            </a>
                                        )}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {!known
                                        ? <span style={{ fontSize: '0.78rem', color: '#999' }}>čaká na súperov</span>
                                        : closed
                                            ? <span style={{ fontSize: '0.82rem' }}>
                                                {g.home_score_tip !== null
                                                    ? <>Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong>
                                                        {g.points_earned !== null && <> · {g.points_earned} b.</>}</>
                                                    : <span style={{ color: '#999' }}>netipoval si</span>}
                                              </span>
                                            : <>
                                                <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                                                       inputMode="numeric" style={{ width: 40, textAlign: 'center' }} aria-label="Tip domáci" />
                                                <span>:</span>
                                                <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                                                       inputMode="numeric" style={{ width: 40, textAlign: 'center' }} aria-label="Tip hostia" />
                                                <button onClick={() => save(g)} disabled={saving === g.game_id}>
                                                    {saving === g.game_id ? '…' : 'Uložiť'}
                                                </button>
                                              </>}
                                </div>

                                {started && <UclGroupTips game={g} />}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
