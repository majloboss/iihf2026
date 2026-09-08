import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
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
    const { activeCompetition } = useCompetition();

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

    // Aktualne vybrana sutaz ide prva — je to tá, ktorú admin práve rieši.
    const zoradene = useMemo(() => {
        if (!data) return [];
        const aktivna = activeCompetition?.id;
        return [...data.sutaze].sort((a, b) =>
            (b.competition_id === aktivna) - (a.competition_id === aktivna));
    }, [data, activeCompetition]);

    if (!data) {
        return <p className={styles.popis}>{chyba || 'Načítavam…'}</p>;
    }

    return (
        <div>
            <p className={styles.popis}>
                Ktorý model dnes obsluhuje livescore. Zmena platí pre dnešný deň;
                zajtra sa použije predvolený model súťaže alebo výsledok ranného
                testu. Zoznam všetkých modelov je v záložke <strong>Číselník modelov</strong>.
            </p>

            {chyba  && <div className={styles.chyba}>{chyba}</div>}
            {hlaska && <div className={styles.hlaska}>{hlaska}</div>}

            {zoradene.map(s => {
                const prekrocene = s.vyuzitie_pct !== null && s.vyuzitie_pct >= 80;
                return (
                    <section key={s.competition_id} className={styles.sutazBlok}>
                        <h3>
                            {s.name}
                            {s.competition_id === activeCompetition?.id &&
                                <span className={styles.aktivnaSutaz}>aktuálna</span>}
                            {!s.zapnute
                                ? <span className={styles.stavVyp}>vypnuté</span>
                                : s.ma_model
                                    ? <span className={styles.stavZap}>beží</span>
                                    : <span className={styles.stavCaka}>bez modelu</span>}
                        </h3>

                        {!s.zapnute && s.dovod_vypnutia && (
                            <p className={styles.dovod}>{s.dovod_vypnutia}</p>
                        )}

                        {s.zapnute && !s.ma_model && (
                            <p className={styles.caka}>
                                Livescore je zapnuté, ale na dnes nie je vybraný model.
                                Vyber ho nižšie a ulož tlačidlom <strong>Nastaviť model</strong>,
                                alebo počkaj na ranný test, ktorý ho vyberie sám.
                            </p>
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
                                <span>
                                    Model na dnes
                                    <em className={styles.napoveda}>
                                        vyber zo zoznamu a ulož tlačidlom „Nastaviť model"
                                    </em>
                                </span>
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
                                            {m.halucinacii > 0 ? ` · ⚠ ${m.halucinacii}× vymyslené` : ''}
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
                                    title="Uloží model vybraný v zozname pre dnešný deň"
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

        </div>
    );
}
