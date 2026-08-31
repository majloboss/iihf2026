import { useEffect, useState } from 'react';
import { getUclBracket } from '../../api/ucl';

// Pavúk vyraďovacej časti. Fázy idú vedľa seba zľava doprava, dvojice pod sebou.
// Pri užšej obrazovke sa fázy zalomia pod seba.

const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const denFmt = s => {
    const d = asDate(s);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
};

function Tim({ tim, goly, vitaz, rozhodnute }) {
    const prazdny = !tim.name;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                      background: vitaz ? '#eaf7ee' : 'transparent',
                      borderRadius: 4, minWidth: 0 }}>
            {tim.logo
                ? <img src={`/logos/ucl2026/${tim.logo}`} alt=""
                       style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
                       onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />
                : <span style={{ width: 20, flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem',
                           fontWeight: vitaz ? 700 : 400,
                           color: prazdny ? '#bbb' : rozhodnute && !vitaz ? '#999' : '#222',
                           overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tim.name || 'zatiaľ neurčený'}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.85rem',
                           fontVariantNumeric: 'tabular-nums',
                           color: goly === null ? '#ccc' : vitaz ? '#1a7f37' : '#666' }}>
                {goly === null ? '–' : goly}
            </span>
        </div>
    );
}

function Dvojica({ tie }) {
    const rozhodnute = tie.winner_id !== null;
    const zapasy = [tie.first_leg, tie.second_leg].filter(Boolean);

    return (
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
                      padding: 6, marginBottom: 10 }}>
            <Tim tim={tie.team_a} goly={tie.goals_a}
                 vitaz={rozhodnute && tie.winner_id === tie.team_a.id} rozhodnute={rozhodnute} />
            <Tim tim={tie.team_b} goly={tie.goals_b}
                 vitaz={rozhodnute && tie.winner_id === tie.team_b.id} rozhodnute={rozhodnute} />

            {/* Výsledky jednotlivých zápasov — súčet sám osebe nepovie, ako sa hralo. */}
            {zapasy.some(z => z.hs !== null) && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center',
                              fontSize: '0.7rem', color: '#999', marginTop: 3 }}>
                    {zapasy.map(z => (
                        <span key={z.game_id} title={denFmt(z.start_time)}>
                            {z.hs === null ? '–' : `${z.hs}:${z.ag}`}
                            {z.hf !== null && z.af !== null && (
                                <span style={{ color: '#dc3545' }}> ({z.hf}:{z.af} pp)</span>
                            )}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function UclBracket() {
    const [fazy, setFazy] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const nacitaj = () => getUclBracket().then(setFazy).catch(e => setError(e.message));
        nacitaj().finally(() => setLoading(false));
        // Po schválení výsledku sa mení postup, preto sa pavúk sám obnovuje.
        const iv = setInterval(() => { getUclBracket().then(setFazy).catch(() => {}); }, 30000);
        return () => clearInterval(iv);
    }, []);

    if (loading) return <p>Načítavam pavúka…</p>;
    if (error) return <p style={{ color: '#c0392b' }}>✗ {error}</p>;
    if (!fazy.length) return null;

    return (
        <div>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 12px', maxWidth: 760 }}>
                Dvojice sa hrajú na dva zápasy, rozhoduje <strong>súčet gólov</strong>.
                Pri rovnosti sa v odvete hrá predĺženie. Finále je jediný zápas.
                Čísla vpravo sú súčet za dvojicu, pod nimi výsledky jednotlivých zápasov.
            </p>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start',
                          overflowX: 'auto', paddingBottom: 8 }}>
                {fazy.map(f => (
                    <div key={f.phase} style={{ flex: '0 0 230px', minWidth: 230 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a3a6b',
                                      marginBottom: 8, textAlign: 'center' }}>
                            {f.name}
                        </div>
                        {f.ties.length === 0
                            ? <div style={{ fontSize: '0.78rem', color: '#bbb', textAlign: 'center' }}>
                                  zatiaľ bez dvojíc
                              </div>
                            : f.ties.map((t, i) => <Dvojica key={t.tie_id ?? i} tie={t} />)}
                    </div>
                ))}
            </div>
        </div>
    );
}
