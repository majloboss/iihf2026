import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBracket } from '../api/bracket';
import { useAuth } from '../context/AuthContext';

// Pavúk vyraďovacej časti — spoločný pre všetky súťaže.
//
// Fázy idú vedľa seba zľava doprava, dvojice pod sebou; pri užšej obrazovke
// sa zalomia. Rozdiely medzi súťažami rieši API: UCL hrá dvojzápasy a má
// logá klubov, FIFA a IIHF jednozápasové kolá a vlajky reprezentácií.

const asDate = s => new Date(String(s).replace(' ', 'T') + 'Z');
// Deň zápasu pre filter cieľovej obrazovky; rovnaký tvar používajú Zápasy
// aj adminove Výsledky.
const dayKey = s => {
    const d = asDate(s);
    if (Number.isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const denFmt = s => {
    const d = asDate(s);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' });
};

// Klub ma v `logo` nazov suboru, reprezentacia kod timu — z toho sa nazov
// vlajky sklada podla konvencie (/flags/fifa_flag_mex.png).
const obrazokTimu = (logo, styl, slug) => {
    if (!logo) return null;
    if (styl === 'club') return `/logos/${slug}/${logo}`;
    const predpona = slug === 'fifa2026' ? 'fifa_flag' : 'team_flag';
    return `/flags/${predpona}_${String(logo).toLowerCase()}.png`;
};

function Tim({ tim, skore = [], vitaz, rozhodnute, cielUrl, faza, styl, slug }) {
    const prazdny = !tim.name;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                      background: vitaz ? '#eaf7ee' : 'transparent',
                      borderRadius: 4, minWidth: 0 }}>
            {tim.logo
                ? <img src={obrazokTimu(tim.logo, styl, slug)} alt=""
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
            {skore.map((z, i) => {
                const obsah = (
                    <>
                        {z.g === null ? '–' : z.g}
                        {z.pen !== null && (
                            <sup style={{ fontSize: '0.62rem', color: '#dc3545' }}>({z.pen})</sup>
                        )}
                    </>
                );
                const styl = { width: 22, textAlign: 'center', flexShrink: 0,
                               fontWeight: vitaz ? 700 : 400, fontSize: '0.82rem',
                               fontVariantNumeric: 'tabular-nums', textDecoration: 'none',
                               color: z.g === null ? '#ccc' : vitaz ? '#1a7f37' : '#666' };
                // Kliknutie na výsledok otvorí zápasy toho dňa — admin vo
                // Výsledkoch, kde ich môže rovno upraviť, hráč v Zápasoch.
                return z.kluc
                    ? <Link key={i} to={`${cielUrl}?faza=${faza}&den=${z.kluc}`}
                            title={`${z.den} — otvoriť zápasy`} style={styl}>{obsah}</Link>
                    : <span key={i} title={z.den} style={styl}>{obsah}</span>;
            })}
        </div>
    );
}

function Dvojica({ tie, cielUrl, faza, styl, slug }) {
    const rozhodnute = tie.winner_id !== null;
    const zapasy = [tie.first_leg, tie.second_leg].filter(Boolean);

    // Nasadený tím baráž nehrá a čaká na súpera — v strome stojí sám.
    if (tie.seeded) {
        return (
            <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
                          padding: 6, marginBottom: 10 }}>
                <Tim tim={tie.team_a} vitaz={false} rozhodnute={false}
                     styl={styl} slug={slug} />
            </div>
        );
    }

    // Skóre po 90 minútach; keď sa hralo predĺženie, ide konečný stav do
    // zátvorky — inak by nebolo vidieť, ako sa dvojica rozhodla.
    const skoreTimu = strana => zapasy.map(z => ({
        g:   strana === 'a' ? z.hs : z.ag,
        pen: (z.hf !== null && z.af !== null) ? (strana === 'a' ? z.hf : z.af) : null,
        den: denFmt(z.start_time),
        kluc: dayKey(z.start_time),
    }));

    return (
        <div style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 8,
                      padding: 6, marginBottom: 10 }}>
            <Tim tim={tie.team_a} skore={skoreTimu('a')} cielUrl={cielUrl} faza={faza}
                 styl={styl} slug={slug}
                 vitaz={rozhodnute && tie.winner_id === tie.team_a.id} rozhodnute={rozhodnute} />
            <Tim tim={tie.team_b} skore={skoreTimu('b')} cielUrl={cielUrl} faza={faza}
                 styl={styl} slug={slug}
                 vitaz={rozhodnute && tie.winner_id === tie.team_b.id} rozhodnute={rozhodnute} />

        </div>
    );
}

export default function Bracket({ competitionId }) {
    // Admin upravuje výsledky vo svojej obrazovke, hráč ich vidí v Zápasoch.
    const { user } = useAuth();
    const cielUrl = user?.role === 'admin' ? '/admin/results' : '/games';

    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!competitionId) return;
        let zive = true;
        const nacitaj = () => getBracket(competitionId)
            .then(d => { if (zive) setData(d); })
            .catch(e => { if (zive) setError(e.message); });
        nacitaj().finally(() => { if (zive) setLoading(false); });
        // Po schválení výsledku sa mení postup, preto sa pavúk sám obnovuje.
        const iv = setInterval(() => { getBracket(competitionId).then(d => {
            if (zive) setData(d);
        }).catch(() => {}); }, 30000);
        return () => { zive = false; clearInterval(iv); };
    }, [competitionId]);

    if (loading) return <p>Načítavam pavúka…</p>;
    if (error) return <p style={{ color: '#c0392b' }}>✗ {error}</p>;

    const fazy = data?.phases ?? [];
    const styl = data?.logo_style ?? 'club';
    const slug = data?.slug ?? '';
    // Prazdna zalozka vyzera ako chyba — radsej povedat, preco je prazdna.
    if (!fazy.length) return (
        <p style={{ color: '#888', fontSize: '0.85rem' }}>
            Táto súťaž nemá vyraďovaciu časť.
        </p>
    );
    const dvojzapasy = slug === 'ucl2026';

    return (
        <div>
            <p style={{ fontSize: '0.82rem', color: '#666', margin: '0 0 12px', maxWidth: 760 }}>
                {dvojzapasy ? <>
                    Dvojice sa hrajú na dva zápasy, rozhoduje <strong>súčet gólov</strong>.
                    Pri rovnosti sa v odvete hrá predĺženie. Finále je jediný zápas.
                    Čísla vpravo sú súčet za dvojicu, pod nimi výsledky jednotlivých zápasov.
                </> : <>
                    Vyraďovacia časť sa hrá na <strong>jeden zápas</strong>. Pri
                    nerozhodnom výsledku rozhoduje predĺženie, prípadne nájazdy.
                </>}
            </p>

            {/* alignItems: stretch — stĺpce musia byť rovnako vysoké, inak sa
                dvojice nemajú voči čomu centrovať. */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'stretch',
                          overflowX: 'auto', paddingBottom: 8 }}>
                {fazy.map(f => (
                    <div key={f.phase} style={{ flex: '0 0 230px', minWidth: 230,
                                                display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a3a6b',
                                      marginBottom: 8, textAlign: 'center' }}>
                            {f.name}
                        </div>
                        {f.ties.length === 0
                            ? <div style={{ fontSize: '0.78rem', color: '#bbb', textAlign: 'center' }}>
                                  zatiaľ bez dvojíc
                              </div>
                            : (
                                /* Každá dvojica sa zvisle vycentruje voči tým, z ktorých
                                   vzišla: v ďalšom stĺpci je ich polovica, takže na jednu
                                   pripadá dvojnásobná výška. Vyrieši to rovnomerné
                                   rozdelenie voľného miesta okolo riadkov. */
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                                              justifyContent: 'space-around' }}>
                                    {f.ties.map((t, i) => <Dvojica key={t.tie_id ?? i} tie={t} cielUrl={cielUrl} faza={f.phase} styl={styl} slug={slug} />)}
                                </div>
                              )}
                    </div>
                ))}
            </div>
        </div>
    );
}
