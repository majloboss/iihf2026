import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getUclGames, recalcUcl, updateUclGameResult } from '../../api/ucl';
import PhaseFilter from '../../components/PhaseFilter';
import usePhases from '../../hooks/usePhases';
import { useCompetition } from '../../context/CompetitionContext';
import { getUclAdminTips, setUclLive, clearUclLive } from '../../api/uclAdmin';
import UclTieSummary from '../../components/UclTieSummary';
import gStyles from '../user/Games.module.css';
import styles from './AdminResults.module.css';

// Fázy v poradí súťaže. LF1–LF8 sú kolá ligovej fázy, zvyšok vyraďovacia časť.
const PHASE_LABEL = {
    LEAGUE: 'Ligová fáza', PO: 'Baráž o play-off', R16: 'Osemfinále',
    QF: 'Štvrťfinále', SF: 'Semifinále', F: 'Finále',
};

// start_time chodí ako naive UTC.
const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const dayKey = s => {
    const d = asDate(s);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Priebežné body počas zápasu — rovnaký vzorec ako serverový prepočet.
const calcLivePoints = (tip1, tip2, game) => {
    const s1 = game.home_score_regular != null ? game.home_score_regular : game.ls_home;
    const s2 = game.away_score_regular != null ? game.away_score_regular : game.ls_away;
    if (s1 == null || s2 == null || tip1 == null || tip2 == null) return null;
    // Vyraďovacia časť má vyššie bodovanie; pozná sa podľa farby z číselníka.
    const winPts = game.phase_color && game.phase_color !== 'GROUP' ? 5 : 3;
    const sign = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
    return (sign(tip1, tip2) === sign(s1, s2) ? winPts : 0)
        + (tip1 === s1 ? 1 : 0) + (tip2 === s2 ? 1 : 0);
};

// Logo je vzdy vlavo od nazvu, pod nazvom stat s vlajkou — rovnako ako to
// vidi pouzivatel na svojej karte zapasu.
function ClubBlock({ name, logo, country, countryCode, flag, isLeft }) {
    if (!name) {
        return (
            <div className={`${gStyles.team} ${isLeft ? gStyles.teamLeft : gStyles.teamRight}`}>
                <span className={gStyles.teamCode} style={{ color: '#bbb' }}>TBD</span>
            </div>
        );
    }
    return (
        <div className={`${gStyles.team} ${isLeft ? gStyles.teamLeft : gStyles.teamRight}`}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {logo
                    ? <img src={`/logos/ucl2026/${logo}`} alt=""
                           style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }}
                           onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                    : <span style={{ width: 26, flexShrink: 0 }} />}
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{name}</span>
                    {(country || countryCode) && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4,
                                       fontSize: '0.72rem', color: '#888', lineHeight: 1.3 }}>
                            {flag && <img src={`/flags/${flag}`} alt=""
                                          style={{ width: 14, height: 10, objectFit: 'cover', flexShrink: 0 }}
                                          onError={e => { e.currentTarget.style.display = 'none'; }} />}
                            <span>{country || countryCode}</span>
                        </span>
                    )}
                </span>
            </span>
        </div>
    );
}

// Tipy všetkých hráčov vrátane tých, čo netipovali — admin ich potrebuje vidieť.
function TipsPanel({ gameId, game }) {
    const [tips, setTips] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');

    // Body sa prepočítajú až pri uložení výsledku. Keď má admin tipy rozbalené
    // už predtým, zostali by v nich prázdne — preto sa načítajú znovu vždy, keď
    // sa zmení skóre alebo schválenie zápasu.
    const skore = `${game?.home_score_regular}:${game?.away_score_regular}:${game?.result_approved}`;

    useEffect(() => {
        setLoading(true);
        getUclAdminTips(gameId).then(setTips).catch(e => setErr(e.message)).finally(() => setLoading(false));
    }, [gameId, skore]);

    if (loading) return <div className={styles.tipsLoading}>Načítavam tipy…</div>;
    if (err) return <div className={styles.tipsErr}>{err}</div>;
    if (!tips || tips.length === 0) return <div className={styles.tipsEmpty}>Žiadne tipy</div>;

    const isLive = game && !game.result_approved
        && (game.ls_home != null || game.home_score_regular != null);

    return (
        <table className={styles.tipsTable}>
            <thead><tr><th>Hráč</th><th>Tip</th><th>Body</th><th>Čas tipu</th></tr></thead>
            <tbody>
                {tips.map(t => {
                    const livePts = isLive ? calcLivePoints(t.tip1, t.tip2, game) : null;
                    return (
                        <tr key={t.user_id} className={t.tip1 == null ? styles.tipRowUntipped : ''}>
                            <td className={styles.tipUser}>
                                {t.avatar
                                    ? <img src={t.avatar} className={styles.tipAvatar} alt="" />
                                    : <span className={styles.tipAvatarPh}>{t.username[0].toUpperCase()}</span>}
                                {t.username}
                            </td>
                            <td className={styles.tipScore}>{t.tip1 != null ? `${t.tip1}:${t.tip2}` : '—'}</td>
                            <td className={livePts != null ? styles.tipPtsLive : styles.tipPts}>
                                {livePts != null ? `+${livePts}b` : (t.points != null ? `+${t.points}b` : '—')}
                            </td>
                            <td className={styles.tipTime}>
                                {t.updated_at ? new Date(t.updated_at).toLocaleString('sk-SK') : '—'}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function ResultCard({ game: initGame, onChanged }) {
    const [game, setGame] = useState(initGame);
    useEffect(() => { setGame(initGame); }, [initGame]);

    const [h90, setH90] = useState(game.home_score_regular != null ? String(game.home_score_regular) : '');
    const [a90, setA90] = useState(game.away_score_regular != null ? String(game.away_score_regular) : '');
    const [hFin, setHFin] = useState(game.home_score_final != null ? String(game.home_score_final) : '');
    const [aFin, setAFin] = useState(game.away_score_final != null ? String(game.away_score_final) : '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [err, setErr] = useState('');
    const [open, setOpen] = useState(false);

    // Priebezne skore — bezne ho plni livescore, admin ho vie prepisat.
    const [ls1, setLs1] = useState(game.ls_home != null ? String(game.ls_home) : '0');
    const [ls2, setLs2] = useState(game.ls_away != null ? String(game.ls_away) : '0');
    const [lsSaving, setLsSaving] = useState(false);
    const [lsErr, setLsErr] = useState('');

    const saveLs = async () => {
        if (ls1 === '' || ls2 === '') { setLsErr('Zadaj skóre'); return; }
        setLsSaving(true); setLsErr('');
        try {
            await setUclLive(game.game_id, parseInt(ls1), parseInt(ls2));
            setGame(g => ({ ...g, ls_home: parseInt(ls1), ls_away: parseInt(ls2),
                                  ls_status: 'ručne', ls_updated_at: new Date().toISOString() }));
        } catch (e) { setLsErr(e.message); }
        finally { setLsSaving(false); }
    };

    const clearLs = async () => {
        setLsSaving(true); setLsErr('');
        try {
            await clearUclLive(game.game_id);
            setGame(g => ({ ...g, ls_home: null, ls_away: null, ls_status: null, ls_updated_at: null }));
        } catch (e) { setLsErr(e.message); }
        finally { setLsSaving(false); }
    };

    const finished = game.result_approved;
    const started = asDate(game.start_time) <= new Date();
    const teamsSet = game.home_team_id && game.away_team_id;

    // Predĺženie sa hrá len vo finále a v odvete. Vo finále rozhoduje remíza
    // po 90 minútach, v odvete rovnaký SÚČET za dvojicu — jednotlivý zápas
    // môže skončiť 2:0 a dvojica aj tak visieť.
    const jeFinale = game.game_type_code === 'F';
    const jeOdveta = Number(game.leg) === 2;

    const zadane = h90 !== '' && a90 !== '';
    const maPrvyZapas = game.first_leg_home !== null && game.first_leg_home !== undefined;

    const remizaNaSucet = zadane && maPrvyZapas
        && (Number(game.first_leg_home) + parseInt(h90))
        === (Number(game.first_leg_away) + parseInt(a90));

    const needsET = zadane && (
        jeFinale ? parseInt(h90) === parseInt(a90)
      : jeOdveta ? remizaNaSucet
      : false);

    // Postupujúceho určí súčet za dvojicu, nie výsledok tohto zápasu.
    // Odveta môže skončiť remízou a dvojica byť rozhodnutá: pri súčte 2:2
    // dá hosť v predĺžení dva góly, odveta končí 2:2 a dvojica 4:2.
    // Doplní sa preto toľko gólov, aby bol súčet o jeden v prospech víťaza.
    // Súčet za dvojicu po predĺžení či penaltách. O postupe rozhoduje on,
    // nie výsledok odvety: tá môže skončiť remízou a dvojica byť rozhodnutá.
    // Vo finále sa nič nepripočítava, hrá sa na jeden zápas.
    const sucetPoET = (() => {
        if (hFin === '' || aFin === '') return null;
        const h = parseInt(hFin) + (jeFinale ? 0 : Number(game.first_leg_home));
        const a = parseInt(aFin) + (jeFinale ? 0 : Number(game.first_leg_away));
        if (Number.isNaN(h) || Number.isNaN(a)) return null;
        return { h, a, rozhodnute: h !== a,
                 kto: h > a ? (game.home_name || 'domáci') : (game.away_name || 'hostia') };
    })();

    // Konečný výsledok nemôže byť nižší ako po 90 minútach — góly z riadneho
    // času v ňom už sú. Polia sa preto predvyplnia a admin len dopíše, čo
    // padlo v predĺžení alebo na penalty.
    //
    // Keď admin zmení skóre po 90 minútach, predvyplnenie sa zopakuje —
    // inak by v poliach zostal starý, už neplatný základ. Prepíše sa iba
    // hodnota, ktorú admin sám neupravil nad rámec 90 minút.
    useEffect(() => {
        if (!needsET) return;
        setHFin(cur => (cur === '' || Number(cur) < Number(h90)) ? h90 : cur);
        setAFin(cur => (cur === '' || Number(cur) < Number(a90)) ? a90 : cur);
    }, [needsET, h90, a90]);

    const save = async () => {
        if (h90 === '' || a90 === '') { setErr('Zadaj skóre po 90 min'); return; }
        setSaving(true); setErr(''); setSaved(false);
        try {
            await updateUclGameResult({
                game_id: game.game_id,
                home_score_regular: parseInt(h90),
                away_score_regular: parseInt(a90),
                home_score_final: needsET && hFin !== '' ? parseInt(hFin) : null,
                away_score_final: needsET && aFin !== '' ? parseInt(aFin) : null,
                result_approved: true,
            });
            setGame(g => ({ ...g, home_score_regular: parseInt(h90), away_score_regular: parseInt(a90),
                                  result_approved: true }));
            setSaved(true);
            onChanged?.();
        } catch (e) { setErr(e.message); }
        finally { setSaving(false); }
    };

    const kolo = game.round_no ? `LF${game.round_no}` : (PHASE_LABEL[game.game_type_code] || game.game_type_code);
    const cas = asDate(game.start_time).toLocaleString('sk-SK',
        { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    const jeLive = started && !finished;

    return (
        <div className={`${gStyles.card} ${finished ? gStyles.cardFinished : ''} ${jeLive ? gStyles.cardLive : ''}`}>
            <div className={styles.cardHead}>
                <span className={styles.cardMeta}>{kolo} • #{game.game_id}</span>
                <span className={styles.cardMeta}>{cas}</span>
            </div>

            <div className={gStyles.matchRow}>
                <ClubBlock name={game.home_name} logo={game.home_logo} country={game.home_country}
                           countryCode={game.home_country_code} flag={game.home_flag} isLeft />
                <div className={gStyles.vs}>
                    {game.home_score_regular != null
                        ? <span className={styles.result}>
                            {game.home_score_regular}:{game.away_score_regular}
                            {game.home_score_final != null &&
                                <span className={styles.resultOT}> ({game.home_score_final}:{game.away_score_final} pp)</span>}
                          </span>
                        : 'vs'}
                </div>
                <ClubBlock name={game.away_name} logo={game.away_logo} country={game.away_country}
                           countryCode={game.away_country_code} flag={game.away_flag} />
            </div>
            {/* Pri odvete rozhoduje sucet za dvojicu, nie vysledok jedneho zapasu. */}
            <UclTieSummary game={game} />

            {(game.venue || game.flashscore_url) && (
                <div className={styles.cardVenue}>
                    {game.venue && <span>{game.venue}</span>}
                    {game.flashscore_url && (
                        <a href={game.flashscore_url} target="_blank" rel="noopener noreferrer"
                           title="Sledovať na FlashScore" style={{ display: 'flex', alignItems: 'center' }}>
                            <img src="/flashscore.png" alt="FlashScore" style={{ width: 18, height: 18 }} />
                        </a>
                    )}
                </div>
            )}

            {!teamsSet && (
                <div className={styles.cardVenue} style={{ color: '#aaa' }}>
                    Zápas ešte nemá určené tímy — dopĺňajú sa podľa výsledkov.
                </div>
            )}

            {teamsSet && !started && !finished && (
                <div className={styles.cardVenue} style={{ color: '#aaa' }}>Zápas ešte nezačal</div>
            )}

            {/* Kým zápas beží, dá sa priebežné skóre opraviť ručne — feed
                z Flashscore môže vypadnúť alebo hlásiť nezmysel. */}
            {teamsSet && started && !finished && (
                <div className={styles.lsManualBlock}>
                    <span className={styles.lsManualLabel}>
                        Živé skóre
                        {game.ls_home != null && (
                            <span style={{ color: '#dc3545' }}>
                                {' '}· LIVE {game.ls_home}:{game.ls_away}
                                {game.ls_status ? ` (${game.ls_status})` : ''}
                            </span>
                        )}
                    </span>
                    <div className={styles.lsManualRow}>
                        <input type="number" min="0" max="99" value={ls1}
                               onChange={e => setLs1(e.target.value)} className={styles.scoreIn} />
                        <span className={styles.colon}>:</span>
                        <input type="number" min="0" max="99" value={ls2}
                               onChange={e => setLs2(e.target.value)} className={styles.scoreIn} />
                        <button className={styles.btnSaveLs} onClick={saveLs} disabled={lsSaving}>
                            {lsSaving ? '…' : 'Uložiť live'}
                        </button>
                        {game.ls_home != null && (
                            <button className={styles.btnSave} style={{ background: '#6c757d' }}
                                    onClick={clearLs} disabled={lsSaving}>Zrušiť live</button>
                        )}
                        {lsErr && <span className={styles.errMsg}>{lsErr}</span>}
                    </div>
                </div>
            )}

            {teamsSet && (started || finished) && (
                <div className={styles.editBlock}>
                    <div className={styles.editRow}>
                        <span style={{ fontSize: '0.78rem', color: '#888', minWidth: 60 }}>Po 90 min:</span>
                        <div className={styles.scoreBox}>
                            <input type="number" min="0" max="30" value={h90}
                                   onChange={e => setH90(e.target.value)} className={styles.scoreIn} />
                            <span className={styles.colon}>:</span>
                            <input type="number" min="0" max="30" value={a90}
                                   onChange={e => setA90(e.target.value)} className={styles.scoreIn} />
                        </div>
                        <button className={styles.btnSave} onClick={save} disabled={saving}>
                            {saving ? '…' : saved ? '✓ Uložené' : 'Uložiť výsledok'}
                        </button>
                        {!finished && game.ls_home != null && (
                            <button className={styles.btnTakeLS}
                                    onClick={() => { setH90(String(game.ls_home)); setA90(String(game.ls_away)); }}>
                                ↙ Prevziať Livescore
                            </button>
                        )}
                        {finished && <span style={{ fontSize: '0.78rem', color: '#28a745' }}>schválený</span>}
                        {err && <span className={styles.errMsg}>{err}</span>}
                    </div>

                    {/* Predĺženie sa hrá len v odvete a vo finále. */}
                    {needsET && (
                        <div className={styles.editRow} style={{ marginTop: 8 }}>
                            <span style={{ fontSize: '0.78rem', color: '#dc3545', minWidth: 60 }}>Po ET/pen:</span>
                            <div className={styles.scoreBox}>
                                <input type="number" min="0" max="30" value={hFin}
                                       onChange={e => setHFin(e.target.value)} className={styles.scoreIn} />
                                <span className={styles.colon}>:</span>
                                <input type="number" min="0" max="30" value={aFin}
                                       onChange={e => setAFin(e.target.value)} className={styles.scoreIn} />
                            </div>
                            {/* Súčet za dvojicu sa prepočítava pri písaní — admin
                                vidí hneď, či je postupujúci určený. V predĺžení
                                môže padnúť aj päť gólov, pri penaltách sa pripíše
                                jeden; oboje sa zadáva do rovnakých polí. */}
                            {sucetPoET && (
                                <span style={{ fontSize: '0.75rem', whiteSpace: 'nowrap',
                                               color: sucetPoET.rozhodnute ? '#1a7f37' : '#dc3545' }}>
                                    dvojica {sucetPoET.h}:{sucetPoET.a}
                                    {sucetPoET.rozhodnute
                                        ? ' → postupujú ' + sucetPoET.kto
                                        : ' → nerozhodnuté'}
                                </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: '#bbb', width: '100%' }}>
                                {jeFinale
                                    ? 'remíza vo finále → zadaj výsledok po predĺžení alebo penaltách'
                                    : 'rovnaký súčet za dvojicu → zadaj výsledok odvety po predĺžení alebo penaltách'}
                                ; penalty sa rátajú ako jeden gól
                            </span>
                        </div>
                    )}
                </div>
            )}

            <button className={styles.toggleTips} onClick={() => setOpen(o => !o)}>
                {open ? '▲ Skryť tipy' : '▼ Tipy hráčov'}
            </button>
            {open && <TipsPanel gameId={game.game_id} game={game} />}
        </div>
    );
}

export default function UclAdminResults() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchParams] = useSearchParams();
    // Odkaz z pavúka predvolí fázu aj deň: /admin/results?faza=SF&den=2027-05-04.
    // Fázy vyraďovacej časti majú tu rovnaký kľúč ako kód zápasu.
    const { activeCompetition } = useCompetition();
    const competitionId = activeCompetition?.id;
    const { sediFaze } = usePhases(competitionId);

    const [phase, setPhase] = useState(() => {
        const kod = searchParams.get('faza');
        return kod || 'all';
    });
    const [selectedDay, setSelectedDay] = useState(() => searchParams.get('den') || null);
    const [recalcing, setRecalcing] = useState(false);
    const [recalcMsg, setRecalcMsg] = useState('');

    const load = () => getUclGames()
        .then(g => { setGames(g); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });

    useEffect(() => { load(); }, []);

    const handleRecalc = async () => {
        setRecalcing(true); setRecalcMsg('');
        try {
            const r = await recalcUcl();
            setRecalcMsg(`✓ Prepočítané: ${r.standings_rows} tímov, ${r.tips_updated} tipov`);
            load();
        } catch (e) { setRecalcMsg(`Chyba: ${e.message}`); }
        finally { setRecalcing(false); }
    };

    // Skratku kola nesie zápas z číselníka; výber môže byť aj celá skupina
    // (BAR zahrnie BAR-1 aj BAR-2).
    const vyhovuje = g => phase === 'all' || sediFaze(g.match_stat_code, phase);

    const filtered = games
        .filter(g => vyhovuje(g) && (!selectedDay || dayKey(g.start_time) === selectedDay))
        .sort((a, b) => a.game_id - b.game_id);

    const allDays = [...new Set(games.filter(vyhovuje).map(g => dayKey(g.start_time)))].sort();
    const todayK = dayKey(new Date().toISOString().replace('T', ' ').slice(0, 19));

    if (loading) return <p style={{ padding: 20 }}>Načítavam…</p>;
    if (error) return <p style={{ color: 'red', padding: 20 }}>Chyba: {error}</p>;

    return (
        <div className={gStyles.wrap}>
            <div className={gStyles.topBar}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Rovnaké farebné ikony ako v Zápasoch — skratky, farby aj
                    zbaľovanie určuje číselník. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <PhaseFilter competitionId={competitionId}
                                 hodnota={phase === 'all' ? '' : phase}
                                 onZmena={kod => { setPhase(kod === '' ? 'all' : kod); setSelectedDay(null); }} />
                </div>
                <button className={styles.btnRecalc} onClick={handleRecalc} disabled={recalcing}
                        style={{ flex: '0 0 auto', whiteSpace: 'nowrap' }}>
                    {recalcing ? 'Prepočítavam…' : '↻ Prepočítať body'}
                </button>
              </div>
                {recalcMsg && (
                    <div className={recalcMsg.startsWith('✓') ? styles.recalcOk : styles.recalcErr}
                         style={{ marginTop: 6 }}>{recalcMsg}</div>
                )}
            </div>

            <div className={gStyles.calRow}>
                {allDays.map(dk => {
                    const d = new Date(dk + 'T12:00:00');
                    return (
                        <button key={dk}
                                className={`${gStyles.calDay} ${dk === todayK ? gStyles.calDayToday : ''} ${dk === selectedDay ? gStyles.calDayActive : ''}`}
                                onClick={() => setSelectedDay(selectedDay === dk ? null : dk)}>
                            <span className={gStyles.calDayWeekday}>{d.toLocaleDateString('sk-SK', { weekday: 'short' })}</span>
                            <span className={gStyles.calDayNum}>{d.getDate()}</span>
                            <span className={gStyles.calDayMonth}>{d.getMonth() + 1}.</span>
                        </button>
                    );
                })}
            </div>

            {filtered.map(g => <ResultCard key={g.game_id} game={g} onChanged={load} />)}
            {filtered.length === 0 && <p className={gStyles.empty}>Žiadne zápasy</p>}
        </div>
    );
}
