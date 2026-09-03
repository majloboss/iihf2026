import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import styles from '../pages/user/Games.module.css';

// Filter fáz a kôl nad zápasmi.
//
// Zoznam sa načíta z číselníka podľa súťaže, takže skratky, farby aj poradie
// určuje admin — nie regulárne výrazy v kóde, ktoré sa museli písať zvlášť
// pre každú súťaž.
//
// Fázy s rovnakým `group` sa zbalia za jedno tlačidlo a rozbalia až po
// kliknutí: dvanásť skupín FIFA by sa inak do riadku nezmestilo.
//
// Poradie je vo všetkých súťažiach rovnaké:
//
//     prefix (1x2) · ALL · extra · číselník · koniec (TAB)
//
// `extra` je ďalší filter mimo číselníka — v UCL sú to KLUBY, ktoré filtrujú
// podľa klubu, nie podľa fázy. `koniec` stojí celkom vpravo a filter to už
// nie je: TAB prepína na tabuľky.

const TRIEDY = {
    GROUP:   ['pGroup', 'pGroupOn'],
    PLAYOFF: ['pPlayoff', 'pPlayoffOn'],
    PLAYIN:  ['pPlayin', 'pPlayinOn'],
    BRONZE:  ['pBronze', 'pBronzeOn'],
    GOLD:    ['pGold', 'pGoldOn'],
    NEUTRAL: ['pBtn', 'pGroupOn'],
};

const triedaFazy = (farba, aktivna) => {
    const [zakl, on] = TRIEDY[farba] ?? TRIEDY.NEUTRAL;
    return [styles.pBtn, styles[zakl], aktivna ? styles[on] : ''].join(' ');
};

export default function PhaseFilter({
    competitionId,
    hodnota,           // vybraný kód zápasu; '' = všetko
    onZmena,
    vsetkyPopis = 'ALL',
    onVsetky = null,   // ALL ruší všetky filtre obrazovky, nielen fázu
    extra = null,      // ďalší filter mimo číselníka (napr. KLUBY)
    prefix = null,     // pred prvým tlačidlom (napr. 1x2)
    koniec = null,     // celkom vpravo, mimo filtrov (napr. TAB)
}) {
    const [fazy, setFazy]     = useState([]);
    const [rozbalene, setRoz] = useState(null);   // otvorená zbalená skupina

    useEffect(() => {
        if (!competitionId) return;
        let zive = true;
        apiFetch(`v1/phases?competition_id=${competitionId}`)
            .then(d => { if (zive) setFazy(d); })
            .catch(() => { if (zive) setFazy([]); });
        return () => { zive = false; };
    }, [competitionId]);

    if (!fazy.length) return null;

    // Zbalené skupiny v poradí, v akom sa objavia; ostatné fázy samostatne.
    //
    // Skupina s jedinou položkou sa nezbaľuje — tlačidlo by po kliknutí ukázalo
    // samo seba. Týka sa to fáz na jeden zápas: finále, zápas o bronz aj celá
    // IIHF, kde sa nehrajú dvojzápasy.
    const skupiny = [];
    for (const f of fazy) {
        if (!f.group) continue;
        let s = skupiny.find(x => x.kod === f.group);
        if (!s) skupiny.push({ kod: f.group, farba: f.color, nazov: f.phase_name, polozky: [f] });
        else s.polozky.push(f);
    }

    const zbalene = skupiny.filter(s => s.polozky.length > 1);
    const riadok = [];
    const hotove = new Set();
    for (const f of fazy) {
        const s = f.group && zbalene.find(x => x.kod === f.group);
        if (!s) { riadok.push({ typ: 'faza', f }); continue; }
        if (hotove.has(s.kod)) continue;
        hotove.add(s.kod);
        riadok.push({ typ: 'skupina', s });
    }

    // Kým je vybraté kolo zo zbalenej skupiny, skupina zostáva otvorená —
    // inak by výber zmizol z dohľadu.
    const vybranaSkupina = zbalene.find(s => s.polozky.some(p => p.code === hodnota));
    const otvorena = rozbalene ?? vybranaSkupina?.kod ?? null;
    const detail = zbalene.find(s => s.kod === otvorena);

    return (
        <>
            <div className={styles.filtersWrap}>
                {prefix}

                <button onClick={() => { (onVsetky ?? onZmena)(''); setRoz(null); }}
                        title="Zrušiť všetky filtre"
                        className={triedaFazy('NEUTRAL', hodnota === '')}>
                    {vsetkyPopis}
                </button>

                {extra}

                {riadok.map((p, i) => p.typ === 'faza' ? (
                    <span key={p.f.code} className={styles.tipWrap} data-tip={p.f.title}>
                        <button title={p.f.title}
                                onClick={() => { onZmena(hodnota === p.f.code ? '' : p.f.code); setRoz(null); }}
                                className={triedaFazy(p.f.color, hodnota === p.f.code)}>
                            {p.f.label}
                        </button>
                    </span>
                ) : (
                    <span key={`g-${p.s.kod}-${i}`} className={styles.tipWrap}
                          data-tip={p.s.nazov || `${p.s.polozky.length} kôl`}>
                        <button title={p.s.nazov || `${p.s.polozky.length} kôl`}
                                onClick={() => setRoz(otvorena === p.s.kod ? null : p.s.kod)}
                                className={triedaFazy(p.s.farba, otvorena === p.s.kod)}>
                            {p.s.kod}
                        </button>
                    </span>
                ))}

                {koniec}
            </div>

            {/* Rozbalená skupina — vlastný riadok pod filtrom. */}
            {detail && (
                <div className={styles.filtersWrap} style={{ marginTop: 6 }}>
                    {detail.polozky.map(f => (
                        <span key={f.code} className={styles.tipWrap} data-tip={f.title}>
                            <button title={f.title}
                                    onClick={() => onZmena(hodnota === f.code ? '' : f.code)}
                                    className={triedaFazy(f.color, hodnota === f.code)}>
                                {f.label}
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}
