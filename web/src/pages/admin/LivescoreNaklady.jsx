import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import styles from './AdminLivescore.module.css';

// Zalozka Naklady — kolko livescore stoji. Prvy riadok je sumarizacia
// vyfiltrovaneho, pod nou zoznam volani, naklady po dnoch a podla modelu.
//
// Testovacie volania sa predvolene neukazuju: skreslovali by naklady sutaze.

const DNES = () => new Date().toISOString().slice(0, 10);
const PRED_TYZDNOM = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
};

export default function LivescoreNaklady() {
    const [data, setData]   = useState(null);
    const [chyba, setChyba] = useState(null);
    const [caka, setCaka]   = useState(false);

    const [filtre, setFiltre] = useState({
        competition_id: '',
        game_id: '',
        model: '',
        od: PRED_TYZDNOM(),
        do: DNES(),
        call_type: 'live',
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
            setData(await apiFetch('v1/admin/livescore-naklady?' + q));
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

    const s = data?.suhrn;
    const maxCena = Math.max(...(data?.po_dnoch ?? []).map(d => Number(d.cena)), 0.000001);

    return (
        <div>
            <p className={styles.popis}>
                Náklady na livescore. Testovacie volania sa nezapočítavajú do
                nákladov súťaže — dajú sa zobraziť prepnutím typu.
            </p>

            {chyba && <div className={styles.chyba}>{chyba}</div>}

            {/* Sumarizacia vyfiltrovaneho — prvy riadok podla zadania */}
            {s && (
                <div className={styles.suhrn}>
                    <div><span>Volaní</span><strong>{s.volani}</strong></div>
                    <div><span>Úspešných</span>
                         <strong>{s.uspesnych}
                            {s.volani > 0 &&
                                <em className={styles.pct}> ({Math.round(100 * s.uspesnych / s.volani)} %)</em>}
                         </strong></div>
                    <div><span>Tokenov</span><strong>{s.tokenov.toLocaleString('sk')}</strong></div>
                    <div className={styles.zvyraznene}>
                        <span>Cena spolu</span><strong>${s.cena_usd.toFixed(4)}</strong></div>
                    <div><span>Modelov</span><strong>{s.modelov}</strong></div>
                    <div><span>Zápasov</span><strong>{s.zapasov}</strong></div>
                </div>
            )}

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

                    <label>
                        <span>Typ volania</span>
                        <select value={filtre.call_type}
                                onChange={e => zmen('call_type', e.target.value)}>
                            <option value="live">ostré (livescore)</option>
                            <option value="test">testovacie</option>
                            <option value="vsetko">všetko</option>
                        </select>
                    </label>
                </div>

                <div className={styles.riadok}>
                    <label>
                        <span>Od</span>
                        <input type="date" value={filtre.od}
                               onChange={e => zmen('od', e.target.value)} />
                    </label>
                    <label>
                        <span>Do</span>
                        <input type="date" value={filtre.do}
                               onChange={e => zmen('do', e.target.value)} />
                    </label>
                    <label>
                        <span>Zápas (id)</span>
                        <input type="number" value={filtre.game_id} placeholder="všetky"
                               onChange={e => zmen('game_id', e.target.value)} />
                    </label>
                </div>
            </div>

            {caka && <p className={styles.popis}>Načítavam…</p>}

            {/* Naklady po dnoch — jednoduchy stlpcovy graf z divov */}
            {data && data.po_dnoch.length > 0 && (
                <section className={styles.graf}>
                    <h3>Náklady po dňoch</h3>
                    <ul>
                        {[...data.po_dnoch].reverse().map(d => (
                            <li key={d.den}>
                                <span className={styles.grafDen}>
                                    {new Date(d.den).toLocaleDateString('sk-SK',
                                        { day: 'numeric', month: 'numeric' })}
                                </span>
                                <span className={styles.grafPruh}>
                                    <span style={{ width: `${100 * Number(d.cena) / maxCena}%` }} />
                                </span>
                                <span className={styles.grafCena}>
                                    ${Number(d.cena).toFixed(4)}
                                    <em> · {d.volani}×</em>
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Naklady podla modelu */}
            {data && data.po_modeloch.length > 0 && (
                <details className={styles.historia} open>
                    <summary>Podľa modelu ({data.po_modeloch.length})</summary>
                    <div className={styles.tabulkaObal}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Model</th>
                                    <th className={styles.cislo}>Volaní</th>
                                    <th className={styles.cislo}>Úspešných</th>
                                    <th className={styles.cislo}>Priemer</th>
                                    <th className={styles.cislo}>Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.po_modeloch.map(m => (
                                    <tr key={m.model}>
                                        <td><code>{m.model}</code></td>
                                        <td className={styles.cislo}>{m.volani}</td>
                                        <td className={styles.cislo}>{m.uspesnych}</td>
                                        <td className={styles.cislo}>
                                            {m.priemer_ms ? `${(m.priemer_ms / 1000).toFixed(1)} s` : '—'}</td>
                                        <td className={styles.cislo}>
                                            ${Number(m.cena).toFixed(5)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}

            {/* Jednotlive volania */}
            {data && (
                <details className={styles.historia}>
                    <summary>Jednotlivé volania ({data.volania.length})</summary>
                    <div className={styles.tabulkaObal}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Kedy</th>
                                    <th>Typ</th>
                                    <th>Zápas</th>
                                    <th>Model</th>
                                    <th>Stav</th>
                                    <th className={styles.cislo}>Tokeny</th>
                                    <th className={styles.cislo}>Cena</th>
                                    <th className={styles.cislo}>Čas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.volania.map(v => (
                                    <tr key={v.id} className={v.success ? '' : styles.riadokZle}>
                                        <td>{new Date(v.checked_at + 'Z').toLocaleString('sk-SK',
                                             { day: 'numeric', month: 'numeric',
                                               hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{v.call_type === 'test' ? 'test' : 'ostré'}</td>
                                        <td>
                                            {v.home_team
                                                ? `${v.home_team} ${v.home_score ?? '?'}:${v.away_score ?? '?'} ${v.away_team}`
                                                : (v.game_id ? `#${v.game_id}` : '—')}
                                        </td>
                                        <td><code>{v.model}</code></td>
                                        <td>{v.success ? '✓' : (v.error ? '✕ ' + v.error.slice(0, 30) : '✕')}</td>
                                        <td className={styles.cislo}>{v.tokens ?? '—'}</td>
                                        <td className={styles.cislo}>
                                            {v.cost_usd ? `$${Number(v.cost_usd).toFixed(5)}` : '—'}</td>
                                        <td className={styles.cislo}>
                                            {v.took_ms ? `${(v.took_ms / 1000).toFixed(1)} s` : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </div>
    );
}
