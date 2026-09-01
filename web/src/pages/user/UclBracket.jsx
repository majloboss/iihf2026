import { useEffect, useState } from 'react';
import { getUclBracket } from '../../api/ucl';

// Pavúk vyraďovacej časti. Fázy idú vedľa seba zľava doprava, dvojice pod sebou.
// Pri užšej obrazovke sa fázy zalomia pod seba.

const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
const denFmt = s => {
    const d = asDate(s);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
};

function Tim({ tim, skore = [], vitaz, rozhodnute }) {
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
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ display: 'block', fontSize: '0.82rem',
                               fontWeight: vitaz ? 700 : 400,
                               color: prazdny ? '#bbb' : rozhodnute && !vitaz ? '#999' : '#222',
                               overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tim.name || 'zatiaľ neurčený'}
                </span>
                {/* Odkiaľ tím prišiel — inak sa v ďalšej fáze zjaví odnikiaľ. */}
                {tim.origin && (
                    <span style={{ display: 'block', fontSize: '0.65rem', color: '#aaa',
                                   overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tim.origin}
                    </span>
                )}
            </span>
            {/* Góly za každý zápas zvlášť, ako na FlashScore. Skóre po predĺžení
                či penaltách ide malým číslom do zátvorky vedľa neho. */}
            {skore.map((z, i) => (
                <span key={i} title={z.den} style={{ width: 22, textAlign: 'center', flexShrink: 0,
                                       fontWeight: vitaz ? 700 : 400, fontSize: '0.82rem',
                                       fontVariantNumeric: 'tabular-nums',
                                       color: z.g === null ? '#ccc' : vitaz ? '#1a7f37' : '#666' }}>
                    {z.g === null ? '–' : z.g}
                    {z.pen !== null && (
                        <sup style={{ fontSize: '0.62rem', color: '#dc3545' }}>({z.pen})</sup>
                    )}
                </span>
            ))}
        </div>
    );
}

function Dvojica({ tie }) {
    const rozhodnute = tie.winner_id !== null;
    const zapasy = [tie.first_leg, tie.second_leg].filter(Boolean);

    // Nasadený tím baráž nehrá a čaká na súpera — v strome stojí sám.
    if (tie.seeded) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
                          padding: 6, marginBottom: 10 }}>
                <Tim tim={tie.team_a} vitaz={false} rozhodnute={false} />
            </div>
        );
    }

    // Skóre po 90 minútach; keď sa hralo predĺženie, ide konečný stav do
    // zátvorky — inak by nebolo vidieť, ako sa dvojica rozhodla.
    const skoreTimu = strana => zapasy.map(z => ({
        g:   strana === 'a' ? z.hs : z.ag,
        pen: (z.hf !== null && z.af !== null) ? (strana === 'a' ? z.hf : z.af) : null,
        den: denFmt(z.start_time),
    }));

    return (
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
                      padding: 6, marginBottom: 10 }}>
            <Tim tim={tie.team_a} skore={skoreTimu('a')}
                 vitaz={rozhodnute && tie.winner_id === tie.team_a.id} rozhodnute={rozhodnute} />
            <Tim tim={tie.team_b} skore={skoreTimu('b')}
                 vitaz={rozhodnute && tie.winner_id === tie.team_b.id} rozhodnute={rozhodnute} />

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
