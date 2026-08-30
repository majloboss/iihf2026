import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUclGames, saveUclTip } from '../../api/ucl';
import { apiFetch } from '../../api/client';
import { asDate, canTip, isValidDate, uclScoreText as scoreText } from '../../utils/tipWindow';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import UclClub, { UclVenue } from '../../components/UclClub';
import UclGroupTips from './UclGroupTips';

// start_time je naive UTC, preto ho tak treba aj interpretovať.
const dayFmtRaw = new Intl.DateTimeFormat('sk-SK', {
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
});
// Neplatný dátum by vo format() vyhodil výnimku a zhodil stránku.
function dayFmt(value) {
    const d = new Date(String(value).replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime()) ? '—' : dayFmtRaw.format(d);
}



// Krátke označenie fázy, rovnaké ako v zozname zápasov.
const shortPhase = g => g.round_no ? `LF${g.round_no}`
    : ({ PO: 'BAR', R16: 'R16', QF: 'QF', SF: 'SF', F: 'F' }[g.game_type_code] || g.game_type_code);

// Poradie hracov v tipovacej skupine: prve tri miesta a k nim vlastny riadok,
// ak je hrac nizsie. Rovnaka logika ako vo FIFA.
function StandingsCard({ group, currentUserId }) {
    const top3 = group.members.slice(0, 3);
    const myIdx = group.members.findIndex(m => m.user_id === currentUserId);
    const showMe = myIdx > 2;

    const medal = rank => (rank === 1 ? '#f5a623' : rank === 2 ? '#9b9b9b' : rank === 3 ? '#c47b3a' : '#aaa');

    const Row = ({ m, rank }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                      borderBottom: '1px solid #f1f3f5',
                      background: m.user_id === currentUserId ? '#f0f5ff' : 'transparent' }}>
            <span style={{ width: 22, fontSize: '0.8rem', fontWeight: 700, color: medal(rank), flexShrink: 0 }}>
                {rank}.
            </span>
            <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0,
                           fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.avatar
                    ? <img src={m.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#e9ecef', flexShrink: 0,
                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     fontSize: '0.72rem', fontWeight: 700, color: '#888' }}>
                        {m.username[0].toUpperCase()}
                      </span>}
                {m.username}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1a3a6b' }}>{m.total_points}b</span>
        </div>
    );

    return (
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                      overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.85rem',
                          color: '#1a3a6b', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
                {group.name}
            </div>
            <div style={{ padding: '4px 0' }}>
                {top3.map((m, i) => <Row key={m.user_id} m={m} rank={i + 1} />)}
                {showMe && (
                    <>
                        <div style={{ textAlign: 'center', color: '#ccc', fontSize: '0.78rem', padding: '2px 0' }}>…</div>
                        <Row m={group.members[myIdx]} rank={myIdx + 1} />
                    </>
                )}
            </div>
        </div>
    );
}

export default function UclDashboard() {
    const [games, setGames] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const [announcement, setAnnouncement] = useState(null);
    const [standings, setStandings] = useState([]);
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();

    useEffect(() => {
        getUclGames().then(setGames).catch(e => setError(e.message)).finally(() => setLoading(false));
        apiFetch('v1/announcement').then(setAnnouncement).catch(() => {});
        // Priebežné skóre a body sa menia počas zápasu.
        const iv = setInterval(() => { getUclGames().then(setGames).catch(() => {}); }, 30000);
        return () => clearInterval(iv);
    }, []);

    // Tipovacie skupiny patria ku konkrétnej súťaži, preto až keď je známa.
    useEffect(() => {
        if (!activeCompetition?.id) return;
        apiFetch(`v1/standings?competition_id=${activeCompetition.id}`)
            .then(setStandings).catch(() => {});
    }, [activeCompetition?.id]);

    // Zápas už začal, ale ešte nie je schválený výsledok.
    const live = useMemo(() => games
        .filter(g => g.home_team_id && g.away_team_id && !g.result_approved
                     && isValidDate(asDate(g.start_time)) && asDate(g.start_time) <= new Date())
        .sort((a, b) => asDate(a.start_time) - asDate(b.start_time)), [games]);

    // Zápasy, ktoré sa dajú tipovať — rovnaké pravidlo ako na serveri.
    const upcoming = useMemo(() => games
        .filter(g => canTip(g))
        .sort((a, b) => asDate(a.start_time) - asDate(b.start_time))
        .slice(0, 8), [games]);


    // Netipované zápasy, ktoré sa hrajú dnes alebo zajtra — na tie sa dá zabudnúť.
    const untipped = useMemo(() => {
        const dayOf = d => d.toLocaleDateString('sk-SK');
        const today = dayOf(new Date());
        const tomorrow = dayOf(new Date(Date.now() + 86400000));
        return games.filter(g => {
            if (!canTip(g) || g.home_score_tip != null) return false;
            const day = dayOf(asDate(g.start_time));
            return day === today || day === tomorrow;
        }).sort((a, b) => asDate(a.start_time) - asDate(b.start_time));
    }, [games]);

    // Zápasy z hornej sekcie sa v Najbližších neopakujú.
    // Musí stáť až za `untipped` — inak by sa použilo pred inicializáciou.
    const upcomingRest = useMemo(() => {
        const shown = new Set(untipped.map(g => g.game_id));
        return upcoming.filter(g => !shown.has(g.game_id));
    }, [upcoming, untipped]);

    const played = useMemo(() => games
        .filter(g => g.result_approved && g.home_score_tip !== null)
        .sort((a, b) => asDate(b.start_time) - asDate(a.start_time))
        .slice(0, 5), [games]);

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

    if (loading) return <p>Načítavam…</p>;

    return (
        <div>
            {announcement?.body && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe0a3', borderRadius: 10,
                              padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a67c00' }}>
                            📢 Oznam organizátora
                        </span>
                        <Link to="/spravy?tab=organizator" style={{ fontSize: '0.75rem', color: '#a67c00', whiteSpace: 'nowrap' }}>
                            História →
                        </Link>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.88rem' }}>{announcement.body}</div>
                </div>
            )}

            {message && <p style={{ color: '#28a745', fontSize: '0.85rem' }}>{message}</p>}
            {error && <p style={{ color: '#c0392b', fontSize: '0.85rem' }}>✗ {error}</p>}

            {live.length > 0 && (
                <>
                    <h3 style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#dc3545' }}>●</span> Prebiehajúce zápasy
                    </h3>
                    {live.map(g => (
                        <div key={g.game_id} style={{ background: '#fff', border: '1px solid #f2c2c2', borderRadius: 10,
                                                      padding: 12, marginBottom: 8 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                                <div style={{ minWidth: 120, fontSize: '0.78rem', color: '#666' }}>
                                    {dayFmt(g.start_time)}
                                </div>
                                {/* Odznak LIVE patrí k dvojici, nie k dátumu — inak visí
                                    mimo zápasu a čitateľ ho k nemu nepriradí. */}
                                <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                                    <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                                 countryCode={g.home_country_code} flag={g.home_flag} align="right" size={24} />
                                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <span className="liveBadge">LIVE</span>
                                        <strong style={{ color: '#dc3545' }}>
                                            {scoreText(g) ?? 'vs'}
                                        </strong>
                                    </span>
                                    <UclClub name={g.away_name} logo={g.away_logo} country={g.away_country}
                                 countryCode={g.away_country_code} flag={g.away_flag} size={24} />
                                </div>
                                <div style={{ fontSize: '0.82rem' }}>
                                    {g.home_score_tip !== null
                                        ? <>Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong></>
                                        : <span style={{ color: '#999' }}>netipoval si</span>}
                                </div>
                            </div>
                            <UclGroupTips game={g} />
                        </div>
                    ))}
                </>
            )}

            {untipped.length > 0 && (
                <>
                    <h3 style={{ marginTop: 20 }}>Netipované — dnes a zajtra</h3>
                    {untipped.map(g => (
                        <div key={g.game_id} style={{ background: '#fffbf0', border: '1px solid #ffe0a3', borderRadius: 10,
                                                      padding: 12, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <div style={{ minWidth: 120, fontSize: '0.78rem', color: '#666' }}>
                                {dayFmt(g.start_time)}
                                <div style={{ fontSize: '0.7rem', color: '#999' }}>{g.game_type_name}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                                <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                                 countryCode={g.home_country_code} flag={g.home_flag} align="right" size={24} />
                                <span style={{ color: '#bbb' }}>vs</span>
                                <UclClub name={g.away_name} logo={g.away_logo} country={g.away_country}
                                 countryCode={g.away_country_code} flag={g.away_flag} size={24} />
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                                       inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip domáci" />
                                <span>:</span>
                                <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                                       inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip hostia" />
                                <button onClick={() => save(g)} disabled={saving === g.game_id}>
                                    {saving === g.game_id ? '…' : 'Uložiť'}
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            <h3 style={{ marginTop: 20 }}>Najbližšie zápasy na tipovanie</h3>
            {upcomingRest.length === 0 && untipped.length === 0 && (
                <p style={{ color: '#888' }}>
                    Momentálne nie je čo tipovať. Play-off sa odomkne, keď budú známi postupujúci.
                </p>
            )}
            {upcomingRest.map(g => (
                <div key={g.game_id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                                              padding: 12, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    <div style={{ minWidth: 110, fontSize: '0.78rem', color: '#666' }}>
                        {dayFmt(g.start_time)}
                        <div style={{ fontSize: '0.7rem', color: '#999' }}>{shortPhase(g)}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                        <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                                 countryCode={g.home_country_code} flag={g.home_flag} align="right" size={24} />
                        <span style={{ color: '#bbb' }}>vs</span>
                        <UclClub name={g.away_name} logo={g.away_logo} country={g.away_country}
                                 countryCode={g.away_country_code} flag={g.away_flag} size={24} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input value={draftOf(g, 'home')} onChange={e => setDraft(g.game_id, 'home', e.target.value)}
                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip domáci" />
                        <span>:</span>
                        <input value={draftOf(g, 'away')} onChange={e => setDraft(g.game_id, 'away', e.target.value)}
                               inputMode="numeric" style={{ width: 38, textAlign: 'center' }} aria-label="Tip hostia" />
                        <button onClick={() => save(g)} disabled={saving === g.game_id}>
                            {saving === g.game_id ? '…' : 'Uložiť'}
                        </button>
                    </div>
                    <UclVenue game={g} />
                </div>
            ))}

            {played.length > 0 && (
                <>
                    <h3 style={{ marginTop: 24 }}>Posledné vyhodnotené</h3>
                    {played.map(g => (
                        <div key={g.game_id} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                                                      padding: 12, marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <div style={{ minWidth: 110, fontSize: '0.78rem', color: '#666' }}>
                                {dayFmt(g.start_time)}
                                <div style={{ fontSize: '0.7rem', color: '#999' }}>{shortPhase(g)}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 240, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
                                <UclClub name={g.home_name} logo={g.home_logo} country={g.home_country}
                                         countryCode={g.home_country_code} flag={g.home_flag} align="right" size={24} />
                                <strong style={{ color: '#1a3a6b' }}>{scoreText(g)}</strong>
                                <UclClub name={g.away_name} logo={g.away_logo} country={g.away_country}
                                         countryCode={g.away_country_code} flag={g.away_flag} size={24} />
                            </div>
                            <div style={{ fontSize: '0.82rem' }}>
                                Tip: <strong>{g.home_score_tip}:{g.away_score_tip}</strong>
                                {g.points_earned !== null && <> · <strong style={{ color: '#28a745' }}>{g.points_earned} b.</strong></>}
                            </div>
                            <UclVenue game={g} />
                        </div>
                    ))}
                </>
            )}

            <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h3 style={{ margin: 0 }}>Poradie v skupinách</h3>
                    <Link to="/standings" style={{ fontSize: '0.82rem' }}>Celé →</Link>
                </div>
                {standings.length === 0
                    ? <p style={{ color: '#aaa', fontSize: '0.88rem' }}>Nie si v žiadnej skupine</p>
                    : standings.map(g => (
                        <StandingsCard key={g.id} group={g} currentUserId={user?.user_id} />
                      ))}
            </div>

        </div>
    );
}
