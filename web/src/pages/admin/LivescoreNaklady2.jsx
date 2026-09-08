import { useState, useEffect, Fragment } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
import admin from './Admin.module.css';
import styles from './AdminLivescore.module.css';

// Zalozka Naklady — jadrom tabulky je ZAPAS.
//
// Jeden riadok = jeden zapas obsluzeny jednym modelom. Ked sa model pocas
// zapasu zmenil, zapas ma viac riadkov — vidno tak, kolko stala ktora cast.
//
// Sumar nad tabulkou plati vzdy pre prave vyfiltrovane riadky, takze podla
// filtra sa da zistit cena dna, konkretneho zapasu alebo modelu.

const DNES = () => new Date().toISOString().slice(0, 10);

// Filtre prezijú odchod zo stránky, aby sa po návrate nemuseli klikať znova.
// Držia sa v localStorage, nie v URL — je to nastavenie prehľadu, nie adresa,
// ktorú by malo zmysel niekomu poslať.
const KLUC = 'livescore-naklady-filtre';

function ulozFiltre(f) {
    try { localStorage.setItem(KLUC, JSON.stringify(f)); } catch { /* privátne okno */ }
}

// Predvolba pri prvom príchode: aktuálna súťaž a dnešný deň. Týždňový rozsah
// ukazoval hlavne prázdno — náklady sa sledujú za deň, keď sa hrá.
function nacitajFiltre(aktualnaSutaz) {
    const zaklad = {
        competition_id: aktualnaSutaz ? String(aktualnaSutaz) : '',
        game: '', model: '', od: DNES(), do: DNES(),
    };
    try {
        const ulozene = JSON.parse(localStorage.getItem(KLUC) || 'null');
        // Súťaž sa preberá z uloženého len keď ju používateľ naozaj zvolil;
        // inak nasleduje prepínač súťaže v ľavom paneli.
        return ulozene ? { ...zaklad, ...ulozene } : zaklad;
    } catch {
        return zaklad;
    }
}

const cas = t => new Date(t + 'Z').toLocaleString('sk-SK',
    { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const den = d => new Date(d).toLocaleDateString('sk-SK',
    { day: 'numeric', month: 'numeric' });

export default function LivescoreNaklady2() {
    const [data, setData]   = useState(null);
    const [chyba, setChyba] = useState(null);
    const [caka, setCaka]   = useState(false);

    const { activeCompetition } = useCompetition();
    const [filtre, setFiltre] = useState(() => nacitajFiltre(activeCompetition?.id));

    // Rozbalene riadky: kluc riadku -> zoznam volani (null = prave sa nacita)
    const [detail, setDetail] = useState({});

    useEffect(() => { nacitat(); }, []);

    async function nacitat(f = filtre) {
        setCaka(true);
        setChyba(null);
        try {
            const q = Object.entries(f)
                .filter(([, v]) => v !== '' && v !== null)
                .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
                .join('&');
            setData(await apiFetch('v1/admin/livescore-naklady2?' + q));
        } catch (e) {
            setChyba(e.message);
        } finally {
            setCaka(false);
        }
    }

    function zmen(k, v) {
        const f = { ...filtre, [k]: v };
        setFiltre(f);
        ulozFiltre(f);
        // Zmena filtra prekresli tabulku, takze rozbalene riadky uz nesedia.
        setDetail({});
        nacitat(f);
    }

    // Jedno volanie obsluzi vsetky zapasy naraz, preto riadok casto zdruzuje
    // desiatky volani. Rozbalenie ukaze, kedy ktore bezalo a co vratilo.
    async function prepniDetail(r) {
        const kluc = r.kluc + '|' + r.model;
        if (kluc in detail) {
            setDetail(d => {
                const n = { ...d };
                delete n[kluc];
                return n;
            });
            return;
        }

        setDetail(d => ({ ...d, [kluc]: null }));
        try {
            const q = new URLSearchParams({
                // Riadok je zápas; volania sa dohľadajú podľa neho. Testovacie
                // volania zápas nemajú, tam sa hľadá podľa adresy.
                game_id: r.game_id ?? '',
                url:     r.game_id === null ? (r.url ?? '') : '',
                model:   r.model,
                od:      filtre.od,
                do:      filtre.do,
            }).toString();
            const res = await apiFetch('v1/admin/livescore-volania?' + q);
            setDetail(d => ({ ...d, [kluc]: res.volania }));
        } catch (e) {
            setDetail(d => ({ ...d, [kluc]: { chyba: e.message } }));
        }
    }

    const s = data?.sumar;

    return (
        <div>
            <p className={styles.popisJeden}>
                Jeden riadok = zápas obslúžený jedným modelom. Jedno volanie sa pýta na
                všetky zápasy naraz, preto sa jeho cena delí medzi tie, ktoré vtedy
                naozaj bežali. Kliknutím na riadok sa rozbalia jednotlivé volania.
            </p>

            {chyba && <div className={styles.chyba}>{chyba}</div>}

            {/* Filtre */}
            <div className={styles.formular}>
                <div className={styles.riadok}>
                    <label>
                        <span>Súťaž</span>
                        <select value={filtre.competition_id}
                                onChange={e => zmen('competition_id', e.target.value)}>
                            <option value="">— všetky —</option>
                            {(data?.filtre.sutaze ?? []).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                            <option value="test">TEST (testovacie volania)</option>
                        </select>
                    </label>

                    <label>
                        <span>Zápas</span>
                        <select value={filtre.game} onChange={e => zmen('game', e.target.value)}>
                            <option value="">— všetky —</option>
                            {(data?.filtre.zapasy ?? []).map(z => (
                                <option key={z.game_id} value={z.game_id}>
                                    {den(z.den)} · {z.nazov}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Model</span>
                        <select value={filtre.model} onChange={e => zmen('model', e.target.value)}>
                            <option value="">— všetky —</option>
                            {(data?.filtre.modely ?? []).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className={styles.riadok}>
                    <label>
                        <span>Hrací deň od</span>
                        <input type="date" value={filtre.od}
                               onChange={e => zmen('od', e.target.value)} />
                    </label>
                    <label>
                        <span>do</span>
                        <input type="date" value={filtre.do}
                               onChange={e => zmen('do', e.target.value)} />
                    </label>
                </div>
            </div>

            {/* Sumar pre aktualny filter */}
            {s && (
                <div className={styles.suhrn}>
                    <div className={styles.zvyraznene}>
                        <span>Cena spolu</span><strong>${s.cena.toFixed(4)}</strong></div>
                    <div><span>Zápasov</span><strong>{s.zapasov}</strong></div>
                    <div><span>Volaní</span>
                         <strong>{s.volani}
                            {s.volani > 0 &&
                                <em className={styles.pct}> · {Math.round(100 * s.uspesnych / s.volani)} % OK</em>}
                         </strong></div>
                    <div><span>Tokenov</span><strong>{s.tokenov.toLocaleString('sk')}</strong></div>
                    <div><span>Cena / zápas</span>
                         <strong>{s.cena_zapas !== null ? `$${s.cena_zapas.toFixed(5)}` : '—'}</strong></div>
                    <div><span>Cena / 1M tok.</span>
                         <strong>{s.cena_1m !== null ? `$${s.cena_1m.toFixed(3)}` : '—'}</strong></div>
                    <div><span>Modelov · dní</span><strong>{s.modelov} · {s.dni}</strong></div>
                </div>
            )}

            {caka && <p className={styles.popisJeden}>Načítavam…</p>}

            <table className={admin.table}>
                <thead>
                    <tr>
                        <th>Súťaž</th>
                        <th>Deň</th>
                        <th>Zápas</th>
                        <th>Model</th>
                        <th className={styles.cislo}>Volaní</th>
                        <th className={styles.cislo}>Minút</th>
                        <th className={styles.cislo}>Tokeny</th>
                        <th className={styles.cislo}>Cena</th>
                        <th className={styles.cislo}>$/1M</th>
                        <th>Naposledy</th>
                    </tr>
                </thead>
                <tbody>
                    {(data?.riadky ?? []).map(r => {
                      const kluc = r.kluc + '|' + r.model;
                      const otvorene = kluc in detail;
                      return (
                        <Fragment key={kluc}>
                        <tr onClick={() => prepniDetail(r)}
                            className={styles.riadokKlik}
                            title="Rozbalí jednotlivé volania">
                            <td data-label="Súťaž">
                                <span className={styles.sipka}>
                                    {otvorene ? '▾' : '▸'}</span>{' '}
                                {r.typ === 'test'
                                    ? <span className={styles.stitokTest}>TEST</span>
                                    : r.sutaz}
                            </td>
                            <td data-label="Deň">{den(r.hraci_den)}</td>
                            <td data-label="Zápas" className={styles.bunkaZapas}>
                                {r.zapas}
                                {r.url && (
                                    <a href={r.url} target="_blank" rel="noreferrer"
                                       className={styles.odkaz}>↗</a>
                                )}
                            </td>
                            <td data-label="Model" className={styles.bunkaModel}>
                                <code>{r.model}</code>
                            </td>
                            <td data-label="Volaní" className={styles.cislo}>
                                {r.volani}
                                {r.uspesnych < r.volani &&
                                    <em className={styles.zleCislo}> ({r.uspesnych} OK)</em>}
                            </td>
                            <td data-label="Minút" className={styles.cislo}>{r.minut}</td>
                            <td data-label="Tokeny" className={styles.cislo}>
                                {r.tokenov.toLocaleString('sk')}</td>
                            <td data-label="Cena" className={styles.cislo}>
                                ${r.cena.toFixed(5)}</td>
                            <td data-label="$/1M" className={styles.cislo}>
                                {r.cena_1m !== null ? `$${r.cena_1m.toFixed(3)}` : '—'}</td>
                            <td data-label="Naposledy" className={styles.bunkaCas}>
                                {cas(r.posledne)}</td>
                        </tr>

                        {otvorene && (
                            <tr className={styles.detailRiadok}>
                                <td colSpan={10}>
                                    {detail[kluc] === null && <p>Načítavam volania…</p>}
                                    {detail[kluc]?.chyba && (
                                        <p className={styles.chyba}>{detail[kluc].chyba}</p>
                                    )}
                                    {Array.isArray(detail[kluc]) && (
                                        <table className={styles.detailTabulka}>
                                            <thead>
                                                <tr>
                                                    <th>Čas</th><th>Stav</th>
                                                    <th>Sledované zápasy</th>
                                                    <th className={styles.cislo}>Zápasov</th>
                                                    <th className={styles.cislo}>Tokeny</th>
                                                    <th className={styles.cislo}>Cena</th>
                                                    <th className={styles.cislo}>Trvanie</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detail[kluc].map(v => (
                                                    <tr key={v.id}>
                                                        <td>{cas(v.cas)}</td>
                                                        <td>{v.ok
                                                            ? <span className={styles.okZnak}>OK</span>
                                                            : <span className={styles.zleCislo}
                                                                    title={v.chyba ?? ''}>
                                                                chyba</span>}</td>
                                                        <td className={styles.bunkaZapas}>
                                                            {v.zapasy ?? v.timy ?? '—'}</td>
                                                        <td className={styles.cislo}>
                                                            {v.zapasov ?? '—'}</td>
                                                        <td className={styles.cislo}>
                                                            {v.tokenov.toLocaleString('sk')}</td>
                                                        <td className={styles.cislo}>
                                                            ${v.cena.toFixed(6)}</td>
                                                        <td className={styles.cislo}>
                                                            {v.trvanie_ms !== null
                                                                ? (v.trvanie_ms / 1000).toFixed(1) + ' s'
                                                                : '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                    {Array.isArray(detail[kluc]) && detail[kluc].length === 0 && (
                                        <p>Žiadne volania.</p>
                                    )}
                                </td>
                            </tr>
                        )}
                        </Fragment>
                      );
                    })}
                </tbody>
            </table>

            {!caka && data && data.riadky.length === 0 && (
                <p className={styles.popisJeden}>Filtru nezodpovedá žiadny záznam.</p>
            )}
        </div>
    );
}
