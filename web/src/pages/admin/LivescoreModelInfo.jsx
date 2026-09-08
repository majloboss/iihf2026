import { useState, useEffect } from 'react';
import { apiFetch } from '../../api/client';
import styles from './AdminLivescore.module.css';

// Zalozka Model — ktory model dnes obsluhuje livescore, co uz stal a co sa
// ocakava do konca dna. Model sa da zmenit alebo livescore vypnut, bez zasahu
// do suborov na serveri: hodnota sa berie z ciselnika, nie z openrouter.php.

export default function LivescoreModelInfo() {
    const [data, setData]     = useState(null);
    const [chyba, setChyba]   = useState(null);
    const [hlaska, setHlaska] = useState(null);
    const [caka, setCaka]     = useState(false);
    const [vyber, setVyber]   = useState({});     // competition_id -> model_id

    useEffect(() => { nacitat(); }, []);

    async function nacitat() {
        try {
            const r = await apiFetch('v1/admin/livescore-model');
            setData(r);
            const v = {};
            for (const s of r.sutaze) if (s.model) v[s.competition_id] = s.model;
            setVyber(v);
        } catch (e) { setChyba(e.message); }
    }

    async function posli(telo, sprava) {
        setCaka(true);
        setChyba(null);
        setHlaska(null);
        try {
            await apiFetch('v1/admin/livescore-model', {
                method: 'POST',
                body: JSON.stringify(telo),
            });
            setHlaska(sprava);
            await nacitat();
        } catch (e) {
            setChyba(e.message);
        } finally {
            setCaka(false);
        }
    }

    if (!data) {
        return <p className={styles.popis}>{chyba || 'Načítavam…'}</p>;
    }

    return (
        <div>
            <p className={styles.popis}>
                Model sa berie z číselníka, nie zo súboru na serveri — dá sa preto
                meniť za behu. Zmena platí pre dnešný deň; zajtra sa použije
                predvolený model súťaže alebo výsledok ranného testu.
            </p>

            {chyba  && <div className={styles.chyba}>{chyba}</div>}
            {hlaska && <div className={styles.hlaska}>{hlaska}</div>}

            {data.sutaze.map(s => {
                const prekrocene = s.vyuzitie_pct !== null && s.vyuzitie_pct >= 80;
                return (
                    <section key={s.competition_id} className={styles.sutazBlok}>
                        <h3>
                            {s.name}
                            {s.zapnute
                                ? <span className={styles.stavZap}>beží</span>
                                : <span className={styles.stavVyp}>vypnuté</span>}
                        </h3>

                        {!s.zapnute && s.dovod_vypnutia && (
                            <p className={styles.dovod}>{s.dovod_vypnutia}</p>
                        )}

                        <div className={styles.suhrn}>
                            <div>
                                <span>Dnes volaní</span>
                                <strong>{s.dnes_volani}</strong>
                            </div>
                            <div>
                                <span>Úspešných</span>
                                <strong>{s.dnes_uspesnych}</strong>
                            </div>
                            <div>
                                <span>Minuté dnes</span>
                                <strong>${s.dnes_minute.toFixed(4)}</strong>
                            </div>
                            <div className={prekrocene ? styles.varovanie : ''}>
                                <span>Predpoklad na deň</span>
                                <strong>${s.predpoklad_den.toFixed(3)}</strong>
                            </div>
                            <div className={prekrocene ? styles.varovanie : ''}>
                                <span>Denný strop</span>
                                <strong>
                                    ${Number(s.budget).toFixed(2)}
                                    {s.vyuzitie_pct !== null &&
                                        <em className={styles.pct}> ({s.vyuzitie_pct} %)</em>}
                                </strong>
                            </div>
                        </div>

                        <dl className={styles.udaje}>
                            <div><dt>Model</dt>
                                 <dd><code>{s.model ?? '—'}</code>
                                     {s.model_free && <span className={styles.free}>zdarma</span>}</dd></div>
                            <div><dt>Cena</dt>
                                 <dd>{s.cena_vstup_1m !== null
                                        ? `$${s.cena_vstup_1m} vstup / $${s.cena_vystup_1m} výstup za 1M tokenov`
                                        : 'neznáma'}</dd></div>
                            <div><dt>Za volanie</dt>
                                 <dd>~${s.cena_volania.toFixed(5)}</dd></div>
                            <div><dt>Nastavenie</dt>
                                 <dd>{s.zdroj_nastavenia}
                                     {s.nastavil && ` — ${s.nastavil}`}</dd></div>
                            {s.zostava_zapasov > 0 && (
                                <div><dt>Zostáva</dt>
                                     <dd>{s.zostava_zapasov} zápasov dnes</dd></div>
                            )}
                        </dl>

                        <div className={styles.akcie}>
                            <label className={styles.akciaPole}>
                                <span>Zmeniť model na dnes</span>
                                <select
                                    value={vyber[s.competition_id] ?? ''}
                                    disabled={caka}
                                    onChange={e => setVyber(v => ({
                                        ...v, [s.competition_id]: e.target.value,
                                    }))}
                                >
                                    {data.modely.map(m => (
                                        <option key={m.model_id} value={m.model_id}>
                                            {m.model_id}
                                            {m.is_free ? ' · zdarma' : ` · $${m.cena_1m}/1M`}
                                            {m.agree_rate !== null ? ` · zhoda ${m.agree_rate}%` : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className={styles.tlacidla}>
                                <button
                                    className={styles.hlavne}
                                    disabled={caka || !vyber[s.competition_id]
                                              || vyber[s.competition_id] === s.model}
                                    onClick={() => posli(
                                        { competition_id: s.competition_id,
                                          model_id: vyber[s.competition_id] },
                                        `Model zmenený na ${vyber[s.competition_id]}`)}
                                >
                                    Nastaviť model
                                </button>

                                {s.zapnute ? (
                                    <button
                                        className={styles.zrusit}
                                        disabled={caka}
                                        onClick={() => {
                                            const d = prompt('Prečo vypínaš livescore na dnes?',
                                                             'príliš drahé');
                                            if (d !== null) posli(
                                                { competition_id: s.competition_id,
                                                  vypnut: true, dovod: d },
                                                'Livescore je pre dnešok vypnuté');
                                        }}
                                    >
                                        Vypnúť na dnes
                                    </button>
                                ) : (
                                    <button
                                        className={styles.hlavne}
                                        disabled={caka}
                                        onClick={() => posli(
                                            { competition_id: s.competition_id, zapnut: true },
                                            'Livescore je zapnuté')}
                                    >
                                        Zapnúť
                                    </button>
                                )}

                                <button
                                    className={styles.vedlajsie}
                                    disabled={caka}
                                    onClick={() => {
                                        const b = prompt('Denný strop v USD:', s.budget);
                                        if (b !== null && !isNaN(Number(b))) posli(
                                            { competition_id: s.competition_id,
                                              budget: Number(b) },
                                            `Denný strop nastavený na $${Number(b).toFixed(2)}`);
                                    }}
                                >
                                    Zmeniť strop
                                </button>
                            </div>
                        </div>
                    </section>
                );
            })}

            <details className={styles.historia}>
                <summary>Poradie modelov pre automatický výber ({data.modely.length})</summary>
                <div className={styles.tabulkaObal}>
                    <table>
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th className={styles.cislo}>Zhoda</th>
                                <th className={styles.cislo}>Úspešnosť</th>
                                <th className={styles.cislo}>Testov</th>
                                <th className={styles.cislo}>Čas</th>
                                <th className={styles.cislo}>Cena / 1M</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.modely.map(m => (
                                <tr key={m.model_id}>
                                    <td><code>{m.model_id}</code></td>
                                    <td className={styles.cislo}>
                                        {m.agree_rate !== null ? `${m.agree_rate} %` : '—'}</td>
                                    <td className={styles.cislo}>
                                        {m.success_rate !== null ? `${m.success_rate} %` : '—'}</td>
                                    <td className={styles.cislo}>{m.tests_total}</td>
                                    <td className={styles.cislo}>
                                        {m.avg_ms ? `${(m.avg_ms / 1000).toFixed(1)} s` : '—'}</td>
                                    <td className={styles.cislo}>
                                        {m.is_free ? 'zdarma' : `$${m.cena_1m}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}
