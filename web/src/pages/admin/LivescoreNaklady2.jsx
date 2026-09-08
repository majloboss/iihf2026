import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
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
const PRED_TYZDNOM = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
};

const cas = t => new Date(t + 'Z').toLocaleString('sk-SK',
    { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
const den = d => new Date(d).toLocaleDateString('sk-SK',
    { day: 'numeric', month: 'numeric' });

export default function LivescoreNaklady2() {
    const [data, setData]   = useState(null);
    const [chyba, setChyba] = useState(null);
    const [caka, setCaka]   = useState(false);

    const [filtre, setFiltre] = useState({
        competition_id: '',
        game: '',
        model: '',
        od: PRED_TYZDNOM(),
        do: DNES(),
    });

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
        nacitat(f);
    }

    const s = data?.sumar;

    return (
        <div>
            <p className={styles.popisJeden}>
                Jeden riadok = zápas obslúžený jedným modelom. Ak sa model počas zápasu
                zmenil, zápas má viac riadkov. Súhrn platí pre vyfiltrované riadky.
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
                                <option key={z.kluc} value={z.kluc}>
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
                    {(data?.riadky ?? []).map(r => (
                        <tr key={r.kluc + '|' + r.model}>
                            <td data-label="Súťaž">
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
                    ))}
                </tbody>
            </table>

            {!caka && data && data.riadky.length === 0 && (
                <p className={styles.popisJeden}>Filtru nezodpovedá žiadny záznam.</p>
            )}
        </div>
    );
}
