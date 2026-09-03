import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';

// Štatistiky hráča v aktuálnej súťaži.
//
// Počíta sa len z vyhodnotených tipov — tip na neodohraný zápas by skresľoval
// priemer aj úspešnosť. Kým súťaž nezačala, obrazovka to povie namiesto toho,
// aby ukazovala samé nuly.

function Dlazdica({ popis, hodnota, poznamka, farba = '#1a3a6b' }) {
    return (
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10,
                      padding: '12px 14px', minWidth: 0 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: farba, lineHeight: 1.1 }}>
                {hodnota}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#666', marginTop: 2 }}>{popis}</div>
            {poznamka && (
                <div style={{ fontSize: '0.72rem', color: '#999', marginTop: 2 }}>{poznamka}</div>
            )}
        </div>
    );
}

// Podiel v percentách; pri nule tipov by delenie dalo NaN.
const podiel = (cast, celok) => (celok ? Math.round((cast / celok) * 100) : 0);

export default function Statistiky() {
    const { activeCompetition, competitions } = useCompetition();
    // Predvolí sa aktuálna súťaž; 'all' sčíta všetky, kde hráč tipoval.
    // Vlastná voľba má prednosť, preto sa drží zvlášť od aktívnej súťaže.
    const [zvolene, setZvolene]  = useState(null);
    const vyber = zvolene ?? (activeCompetition?.id ? String(activeCompetition.id) : null);
    const setVyber = setZvolene;

    const [data, setData]       = useState(null);
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!vyber) return;
        let zive = true;
        apiFetch(`v1/player-stats?competition_id=${vyber}`)
            .then(d => { if (zive) { setData(d); setError(''); } })
            .catch(e => { if (zive) setError(e.message); })
            .finally(() => { if (zive) setLoading(false); });
        return () => { zive = false; };
    }, [vyber]);

    const combo = (
        <div style={{ marginBottom: 14 }}>
            <select value={vyber ?? ''} onChange={e => setVyber(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.88rem', maxWidth: 320 }}>
                {(competitions ?? []).map(c => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
                <option value="all">Všetky súťaže</option>
            </select>
        </div>
    );

    if (loading) return <>{combo}<p style={{ color: '#888' }}>Načítavam…</p></>;
    if (error)   return <>{combo}<p style={{ color: '#c0392b' }}>✗ {error}</p></>;
    if (!data)   return combo;

    if (!data.tips) {
        return (
            <>
                {combo}
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                    Zatiaľ nemáš vyhodnotený žiadny tip. Štatistiky sa ukážu po prvom
                    zápase so schváleným výsledkom.
                </p>
            </>
        );
    }

    const maxVRozlozeni = Math.max(...data.distribution.map(d => d.pocet), 1);
    const odVedenia = data.leader_points != null ? data.leader_points - data.points : null;

    return (
        <div>
            {combo}

            {/* ── Súhrn ─────────────────────────────────────────── */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 20,
                          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                <Dlazdica popis="bodov celkom" hodnota={data.points}
                          poznamka={`z ${data.tips} tipov`} />
                <Dlazdica popis="priemer na zápas" hodnota={data.avg} />
                <Dlazdica popis="presných tipov" hodnota={data.exact} farba="#1a7f37"
                          poznamka={`${podiel(data.exact, data.tips)} % · za ${data.max_possible} b`} />
                <Dlazdica popis="tipov s bodom" hodnota={data.scored}
                          poznamka={`${podiel(data.scored, data.tips)} % úspešnosť`} />
                {data.rank && (
                    <Dlazdica popis="miesto v poradí" hodnota={`${data.rank}.`}
                              poznamka={`z ${data.players} hráčov`}
                              farba={data.rank <= 3 ? '#1a7f37' : '#1a3a6b'} />
                )}
                {odVedenia != null && odVedenia > 0 && (
                    <Dlazdica popis="na vedúceho" hodnota={`−${odVedenia}`}
                              farba="#c0392b" poznamka="bodov" />
                )}
            </div>

            {/* ── Rozloženie bodov ──────────────────────────────── */}
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 8px' }}>Ako často koľko bodov</h3>
            <div style={{ marginBottom: 20 }}>
                {data.distribution.map(d => (
                    <div key={d.body} style={{ display: 'flex', alignItems: 'center',
                                               gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 42, fontSize: '0.8rem', color: '#666',
                                       textAlign: 'right', flexShrink: 0 }}>
                            {d.body} b
                        </span>
                        {/* Pruh v pomere k najčastejšej hodnote, nech je vidieť rozdiely. */}
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: 'block', height: 16, borderRadius: 3,
                                           width: `${(d.pocet / maxVRozlozeni) * 100}%`,
                                           background: d.body === data.max_possible ? '#1a7f37'
                                                     : d.body === 0 ? '#dee2e6' : '#1a3a6b',
                                           minWidth: 2 }} />
                        </span>
                        {/* Počet aj percento majú vlastný stĺpec zarovnaný
                            doprava, aby čísla pod sebou lícovali bez ohľadu na
                            počet číslic. */}
                        <span style={{ fontSize: '0.78rem', color: '#888', flexShrink: 0,
                                       whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                            <span style={{ display: 'inline-block', width: 62, textAlign: 'right' }}>
                                {d.pocet}/{data.tips}
                            </span>
                            <span style={{ display: 'inline-block', width: 46, textAlign: 'right' }}>
                                {podiel(d.pocet, data.tips)} %
                            </span>
                        </span>
                    </div>
                ))}
            </div>

            {/* ── Po súťažiach ──────────────────────────────────── */}
            {data.all && data.competitions.length > 0 && (
                <>
                    <h3 style={{ fontSize: '0.95rem', margin: '0 0 8px' }}>Podľa súťaže</h3>
                    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse',
                                        fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ color: '#666', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 8px 4px 0', fontWeight: 500 }}>Súťaž</th>
                                    <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Tipov</th>
                                    <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Bodov</th>
                                    <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Priemer</th>
                                    <th style={{ padding: '4px 0 4px 8px', fontWeight: 500, textAlign: 'right' }}>Miesto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.competitions.map(c => (
                                    <tr key={c.id} style={{ borderTop: '1px solid #f1f3f5' }}>
                                        <td style={{ padding: '5px 8px 5px 0' }}>{c.name}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>{c.tips}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{c.points}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>{c.avg}</td>
                                        <td style={{ padding: '5px 0 5px 8px', textAlign: 'right',
                                                     color: c.rank <= 3 ? '#1a7f37' : '#888',
                                                     fontWeight: c.rank <= 3 ? 600 : 400 }}>
                                            {c.rank}. z {c.players}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ── Po kolách ─────────────────────────────────────── */}
            {data.phases.length > 1 && (
                <>
                    <h3 style={{ fontSize: '0.95rem', margin: '0 0 8px' }}>Podľa kola</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse',
                                        fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ color: '#666', textAlign: 'left' }}>
                                    <th style={{ padding: '4px 8px 4px 0', fontWeight: 500 }}>Kolo</th>
                                    <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Tipov</th>
                                    <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Bodov</th>
                                    <th style={{ padding: '4px 0 4px 8px', fontWeight: 500, textAlign: 'right' }}>Priemer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.phases.map((f, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #f1f3f5' }}>
                                        <td style={{ padding: '5px 8px 5px 0' }}>{f.faza}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#888' }}>{f.tipov}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{f.body}</td>
                                        <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: '#888' }}>
                                            {(f.body / f.tipov).toFixed(1)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
