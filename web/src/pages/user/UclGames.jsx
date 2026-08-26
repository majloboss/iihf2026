import { useEffect, useMemo, useState } from 'react';
import { getUclGames, saveUclTip } from '../../api/ucl';
import styles from './Games.module.css';

// start_time je naive UTC, preto ho tak treba aj interpretovať.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const isValid = d => d instanceof Date && !Number.isNaN(d.getTime());
const dayKey = s => {
    const d = asDate(s);
    return isValid(d) ? d.toISOString().slice(0, 10) : '';
};
const timeFmtRaw = new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const dayFmtRaw = new Intl.DateTimeFormat('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const timeFmt = s => { const d = asDate(s); return isValid(d) ? timeFmtRaw.format(d) : '—'; };
const dayFmt = s => { const d = asDate(s); return isValid(d) ? dayFmtRaw.format(d) : '—'; };
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

function Club({ name, logo, align }) {
    if (!name) return <span style={{ color: '#999', fontSize: '0.85rem' }}>zatiaľ neurčený</span>;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
            {align === 'right' && <span>{name}</span>}
            {logo
                ? <img src={`/logos/ucl2026/${logo}`} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: 24 }} />}
            {align !== 'right' && <span>{name}</span>}
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
    }, []);

    const matchesPhase = (g) => {
        if (!phase) return true;
        const p = PHASES.find(x => x.key === phase);
        if (!p) return true;
        if (g.game_type_code !== p.code) return false;
        return p.round ? Number(g.round_no) === p.round : true;
    };
    const matchesClub = (g) => !club || g.home_code === club || g.away_code === club;
    const isUntipped = (g) =>
        g.home_team_id && g.away_team_id && g.tips_open
        && g.home_score_tip == null && asDate(g.start_time) - Date.now() > 5 * 60000;

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
                        className={phase === p.key ? styles.btnTabulkyActive : styles.btnTabulky}
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
                        const closed = !g.tips_open || asDate(g.start_time) <= new Date();
                        const hasResult = g.home_score_regular !== null && g.away_score_regular !== null;
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
                                    <Club name={g.home_name} logo={g.home_logo} align="right" />
                                    <strong style={{ color: hasResult ? '#1a3a6b' : '#bbb' }}>
                                        {hasResult ? `${g.home_score_regular} : ${g.away_score_regular}` : 'vs'}
                                    </strong>
                                    <Club name={g.away_name} logo={g.away_logo} />
                                </div>

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
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
