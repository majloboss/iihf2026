import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api/client';
import { useCompetition } from '../../context/CompetitionContext';
import VyberModelu from '../../components/VyberModelu';
import styles from './AdminLivescore.module.css';

// Zalozka Model — ktory model dnes obsluhuje livescore, co uz stal a co sa
// ocakava do konca dna. Model sa da zmenit alebo livescore vypnut, bez zasahu
// do suborov na serveri: hodnota sa berie z ciselnika, nie z openrouter.php.

export default function LivescoreModelInfo() {
    const [data, setData]     = useState(null);
    const [chyba, setChyba]   = useState(null);
    const [caka, setCaka]     = useState(false);
    const [vyber, setVyber]   = useState({});     // competition_id -> model_id
    const [strop, setStrop]   = useState({});     // competition_id -> denny strop
    const { activeCompetition } = useCompetition();

    useEffect(() => { nacitat(); }, []);

    async function nacitat() {
        try {
            const r = await apiFetch('v1/admin/livescore-model');
            setData(r);
            const v = {}, b = {};
            for (const s of r.sutaze) {
                if (s.model) v[s.competition_id] = s.model;
                b[s.competition_id] = s.budget;
            }
            setVyber(v);
            setStrop(b);
        } catch (e) { setChyba(e.message); }
    }

    // Vysledok sa neoznamuje hlaskou — prejavi sa priamo na stave sutaze,
    // ktory sa hned znovu nacita.
    async function posli(telo) {
        setCaka(true);
        setChyba(null);
        try {
            await apiFetch('v1/admin/livescore-model', {
                method: 'POST',
                body: JSON.stringify(telo),
            });
            await nacitat();
        } catch (e) {
            setChyba(e.message);
        } finally {
            setCaka(false);
        }
    }

    // Existuje model s tymto nazvom? Do pola sa da napisat hocico, ulozit
    // sa vsak smie len to, co je v ciselniku.
    const znamyModel = nazov => data?.modely.some(m => m.model_id === nazov) ?? false;

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

            {chyba && <div className={styles.chyba}>{chyba}</div>}

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
                            {/* Vyber modelu a akcie v jednom riadku. Zapnutie rovno
                                nastavi vybrany model — osobitne tlacidlo netreba. */}
                            <div className={styles.akcieRiadok}>
                                <VyberModelu
                                    modely={data.modely}
                                    hodnota={vyber[s.competition_id] ?? ''}
                                    disabled={caka}
                                    onZmena={v => setVyber(x => ({
                                        ...x, [s.competition_id]: v,
                                    }))}
                                />

                                {s.zapnute ? (
                                    <>
                                        <button
                                            className={styles.hlavne}
                                            disabled={caka || !znamyModel(vyber[s.competition_id])
                                                      || vyber[s.competition_id] === s.model}
                                            onClick={() => posli({ competition_id: s.competition_id,
                                                  model_id: vyber[s.competition_id] })}
                                            title="Uloží vybraný model pre dnešný deň"
                                        >
                                            Uložiť model
                                        </button>
                                        <button
                                            className={styles.zrusit}
                                            disabled={caka}
                                            onClick={() => posli({ competition_id: s.competition_id, vypnut: true,
                                                  dovod: 'vypnuté administrátorom' })}
                                        >
                                            Vypnúť na dnes
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className={styles.hlavne}
                                        disabled={caka}
                                        onClick={() => posli({ competition_id: s.competition_id, zapnut: true,
                                              model_id: znamyModel(vyber[s.competition_id])
                                                        ? vyber[s.competition_id] : null })}
                                        title="Zapne livescore a nastaví vybraný model"
                                    >
                                        Zapnúť
                                    </button>
                                )}
                            </div>

                            {/* Strop sa meni priamo v poli, nie cez vyskakovacie okno */}
                            <div className={styles.akcieRiadok}>
                                <label className={styles.stropPole}>
                                    <span>Denný strop ($)</span>
                                    <input
                                        type="number" min="0" max="100" step="0.5"
                                        value={strop[s.competition_id] ?? s.budget}
                                        disabled={caka}
                                        onChange={e => setStrop(v => ({
                                            ...v, [s.competition_id]: e.target.value,
                                        }))}
                                    />
                                </label>
                                <button
                                    className={styles.vedlajsie}
                                    disabled={caka
                                        || Number(strop[s.competition_id] ?? s.budget) === Number(s.budget)}
                                    onClick={() => posli({ competition_id: s.competition_id,
                                          budget: Number(strop[s.competition_id]) })}
                                >
                                    Uložiť strop
                                </button>
                            </div>
                        </div>
                    </section>
                );
            })}

        </div>
    );
}
