import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api/client';
import styles from './AdminLivescore.module.css';

// Rucne spustenie testu modelov — to iste, co pusti cron hodinu pred prvym
// zapasom dna, ale kedykolvek a na lubovolnom zapase.
//
// Modely sa volaju POSTUPNE. Kazdy test = jeden zaznam v logu, takze test na
// 15 modeloch prida 15 zaznamov. Zapas identifikuje URL, nie game_id —
// testuje sa spravidla na cudzom zapase z Flashscore.

const SPORTY = ['futbal', 'hokej', 'volejbal', 'basketbal', 'hádzaná', 'tenis'];

export default function LivescoreTestModelov() {
    const [url, setUrl]         = useState('');
    const [sport, setSport]     = useState('futbal');
    const [pocet, setPocet]     = useState(20);
    const [davka, setDavka]     = useState('lacne');
    const [davky, setDavky]     = useState([]);
    const [kol, setKol]         = useState(1);
    const [sutaz, setSutaz]     = useState('');
    const [sutaze, setSutaze]   = useState([]);

    const [kandidati, setKandidati] = useState([]);
    const [suhrn, setSuhrn]         = useState(null);
    const [historia, setHistoria]   = useState([]);

    const [priprava, setPriprava] = useState(null);
    const [bezi, setBezi]         = useState(false);
    const [postup, setPostup]     = useState({ done: 0, total: 0, teraz: null, kolo: 1 });
    const [vysledky, setVysledky] = useState([]);
    const [chyba, setChyba]       = useState(null);
    const [rozbalene, setRozbalene] = useState(null);
    const [zhoda, setZhoda]         = useState(null);

    const zastavRef = useRef(false);

    useEffect(() => { nacitat(); nacitatSutaze(); }, []);

    async function nacitat() {
        try {
            const r = await apiFetch(`v1/admin/livescore-test-run?limit=${pocet}`);
            setKandidati(r.kandidati);
            setSuhrn(r.suhrn);
            setHistoria(r.testy);
            setDavky(r.davky ?? []);
        } catch (e) { setChyba(e.message); }
    }

    async function nacitatSutaze() {
        try {
            const r = await apiFetch('v1/competitions');
            setSutaze(r.competitions || r || []);
        } catch { /* nepovinne */ }
    }

    async function spustit() {
        if (!url.trim()) { setChyba('Zadaj URL zápasu z Flashscore'); return; }

        setChyba(null);
        setVysledky([]);
        setPriprava(null);
        setRozbalene(null);
        setZhoda(null);
        setBezi(true);
        zastavRef.current = false;

        try {
            // 1) stiahni stranku a zisti, ktore modely sa budu testovat
            const p = await apiFetch('v1/admin/livescore-test-run', {
                method: 'POST',
                body: JSON.stringify({
                    url: url.trim(),
                    competition_id: sutaz ? Number(sutaz) : null,
                    limit: Number(pocet),
                    davka,
                }),
            });
            setPriprava(p);
            const kolks = Math.max(1, Number(kol) || 1);
            setPostup({ done: 0, total: p.modely.length * kolks, teraz: null, kolo: 1 });

            // 2) testuj po jednom, v tolkych kolach, kolko sa zvolilo.
            //    Viac kol odhali model, ktory raz nahodou trafi a inokedy nie —
            //    zhoda sa pocita z historie, takze sa vysledky kumuluju.
            for (let kolo = 1; kolo <= kolks && !zastavRef.current; kolo++) {
              setPostup(s => ({ ...s, kolo }));
              for (const model of p.modely) {
                if (zastavRef.current) break;
                setPostup(s => ({ ...s, teraz: model }));
                try {
                    const r = await apiFetch('v1/admin/livescore-test-run?step=1', {
                        method: 'POST',
                        body: JSON.stringify({
                            url: url.trim(),
                            model,
                            sport,
                            competition_id: sutaz ? Number(sutaz) : null,
                            run_id: p.run_id,
                        }),
                    });
                    setVysledky(v => zluc(v, r.vysledok));
                } catch (e) {
                    setVysledky(v => zluc(v, {
                        model, passed: false, error: e.message,
                        cost_usd: 0, total_tokens: null, took_ms: null,
                    }));
                }
                setPostup(s => ({ ...s, done: s.done + 1 }));
              }
            }

            // Po dobehnuti sa zisti, na akom skore sa modely zhodli. Model,
            // ktory vratil ine skore nez vacsina, je podozrivy — test overuje
            // len to, ci vratil cisla, nie ci su spravne.
            if (!zastavRef.current) {
                try {
                    setZhoda(await apiFetch('v1/admin/livescore-test-run?zhoda=1', {
                        method: 'POST',
                        body: JSON.stringify({ run_id: p.run_id }),
                    }));
                } catch { /* zhoda je doplnok, nie podmienka */ }
            }
        } catch (e) {
            setChyba(e.message);
        } finally {
            setBezi(false);
            setPostup(s => ({ ...s, teraz: null }));
            nacitat();          // obnov suhrn a historiu
        }
    }

    // Vysledok z dalsieho kola sa priratava k modelu, nevytvara novy riadok.
    // Vidno tak 'presiel 7 z 10 kol', co je uzitocnejsie nez desat riadkov.
    function zluc(zoznam, novy) {
        const i = zoznam.findIndex(x => x.model === novy.model);
        if (i < 0) {
            return zorad([...zoznam, { ...novy, kol: 1, presiel: novy.passed ? 1 : 0 }]);
        }
        const stary = zoznam[i];
        const spojene = {
            ...novy,
            kol: (stary.kol ?? 1) + 1,
            presiel: (stary.presiel ?? 0) + (novy.passed ? 1 : 0),
            // Cena a cas sa scitavaju, aby sedel sucet za cely beh
            cost_usd: (stary.cost_usd || 0) + (novy.cost_usd || 0),
            took_ms: novy.took_ms,
            // Chyba z posledneho kola sa ukaze len ked model neprešiel ani raz
            error: (stary.presiel ?? 0) + (novy.passed ? 1 : 0) > 0 ? null : novy.error,
            passed: (stary.presiel ?? 0) + (novy.passed ? 1 : 0) > 0,
        };
        const bezNeho = zoznam.filter((_, j) => j !== i);
        return zorad([...bezNeho, spojene]);
    }

    // Uspesne hore, medzi nimi rychlejsie skor — to je poradie, v akom
    // ich bude brat automaticky vyber.
    function zorad(zoznam) {
        return [...zoznam].sort((a, b) => {
            if (a.passed !== b.passed) return a.passed ? -1 : 1;
            return (a.took_ms ?? 1e9) - (b.took_ms ?? 1e9);
        });
    }

    // Kolko modelov naozaj pobezi: davka moze mat menej nez zvoleny strop.
    const vDavke = davky.find(d => d.kluc === davka)?.pocet ?? 0;
    const kolkoBude = Math.min(Number(pocet) || 0, vDavke || Number(pocet) || 0);

    const cenaBehu = vysledky.reduce((s, v) => s + (v.cost_usd || 0), 0);
    const uspesnych = vysledky.filter(v => v.passed).length;

    return (
        <div>
            <p className={styles.popis}>
                Otestuje modely na skutočnom zápase — či z Flashscore feedu vytiahnu
                skóre, časť hry a minútu. To isté spúšťa cron hodinu pred prvým
                zápasom dňa. Každý test sa zapíše do logu vrátane ceny.
            </p>

            {chyba && <div className={styles.chyba}>{chyba}</div>}

            {suhrn && (
                <div className={styles.suhrn}>
                    <div><span>Testovacích volaní</span><strong>{suhrn.volani}</strong></div>
                    <div><span>Úspešných</span><strong>{suhrn.uspesnych}</strong></div>
                    <div><span>Tokenov</span><strong>{suhrn.tokenov.toLocaleString('sk')}</strong></div>
                    <div><span>Cena testov</span><strong>${suhrn.cena_usd.toFixed(4)}</strong></div>
                </div>
            )}

            <div className={styles.formular}>
                <label>
                    <span>URL zápasu z Flashscore</span>
                    <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://www.flashscore.com/match/..."
                        disabled={bezi}
                    />
                </label>

                <div className={styles.riadok}>
                    <label>
                        <span>Šport</span>
                        <select value={sport} onChange={e => setSport(e.target.value)} disabled={bezi}>
                            {SPORTY.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>

                    <label>
                        <span>Súťaž (nepovinné)</span>
                        <select value={sutaz} onChange={e => setSutaz(e.target.value)} disabled={bezi}>
                            <option value="">— žiadna —</option>
                            {sutaze.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>

                    <label>
                        <span>Ktoré modely</span>
                        <select value={davka} onChange={e => setDavka(e.target.value)}
                                disabled={bezi}>
                            {davky.map(d => (
                                <option key={d.kluc} value={d.kluc}>
                                    {d.popis} — {d.pocet}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Najviac modelov</span>
                        <input type="number" min="1" max="400" value={pocet}
                               onChange={e => setPocet(e.target.value)} disabled={bezi} />
                    </label>

                    <label>
                        <span>Kôl</span>
                        <input type="number" min="1" max="20" value={kol}
                               onChange={e => setKol(e.target.value)} disabled={bezi}
                               title="Koľkokrát prejsť celý zoznam. Viac kôl odhalí model, ktorý raz náhodou trafí." />
                    </label>
                </div>

                <div className={styles.tlacidla}>
                    <button className={styles.hlavne} onClick={spustit} disabled={bezi}>
                        {bezi ? 'Testujem…'
                              : `Spustiť test (${kolkoBude} modelov${Number(kol) > 1 ? ` × ${kol} kôl` : ''})`}
                    </button>
                    {!bezi && kolkoBude * Number(kol || 1) > 25 && (
                        <span className={styles.odhad}>
                            potrvá zhruba {Math.ceil(kolkoBude * Number(kol || 1) * 17 / 60)} min —
                            nechaj okno otvorené
                        </span>
                    )}
                    {bezi && (
                        <button className={styles.zrusit} onClick={() => { zastavRef.current = true; }}>
                            Zastaviť
                        </button>
                    )}
                </div>
            </div>

            {priprava && (
                <div className={styles.panel}>
                    <h3>Vstup pre modely</h3>
                    <dl className={styles.udaje}>
                        <div><dt>Zápas</dt><dd>{priprava.match_id || '(bez id)'}</dd></div>
                        <div><dt>Dĺžka</dt>
                             <dd>{priprava.input_chars.toLocaleString('sk')} znakov</dd></div>
                        <div><dt>Modelov</dt><dd>{priprava.modely.length}</dd></div>
                    </dl>
                    <details>
                        <summary>Ukážka textu pre model</summary>
                        <pre className={styles.nahlad}>{priprava.ukazka}</pre>
                    </details>
                </div>
            )}

            {(bezi || vysledky.length > 0) && (
                <>
                    <div className={styles.hlavickaVysledkov}>
                        <h3>Výsledky</h3>
                        <span>
                            {postup.done} / {postup.total}
                            {Number(kol) > 1 && ` · kolo ${postup.kolo} z ${kol}`}
                            {' · '}úspešných {uspesnych} · cena behu ${cenaBehu.toFixed(5)}
                        </span>
                    </div>
                    {postup.teraz && (
                        <p className={styles.bezi}>práve beží <code>{postup.teraz}</code></p>
                    )}

                    {zhoda && zhoda.najcastejsie_skore && (
                        <div className={styles.zhodaSuhrn}>
                            <p>
                                {zhoda.timy && <><strong>{zhoda.timy}</strong> · </>}
                                najčastejšie skóre <strong>{zhoda.najcastejsie_skore}</strong>
                                {' '}— zhodlo sa {zhoda.zhodlo_sa} z {zhoda.s_vysledkom} modelov
                                {zhoda.zhodlo_sa < zhoda.s_vysledkom / 2 &&
                                    <span className={styles.slabaZhoda}>
                                        {' '}· slabá zhoda, výsledok over na Flashscore
                                    </span>}
                            </p>

                            {/* Rozpad: na com sa modely rozchadzaju */}
                            {zhoda.rozpad_skore && zhoda.rozpad_skore.length > 1 && (
                                <ul className={styles.rozpad}>
                                    {zhoda.rozpad_skore.map(r => (
                                        <li key={r.score_text}
                                            className={r.score_text === zhoda.najcastejsie_skore
                                                       ? styles.rozpadVitaz : ''}>
                                            <strong>{r.score_text}</strong>
                                            <span>{r.modelov}×</span>
                                            <em title={r.ktore}>{r.ktore}</em>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Modely, ktore si vymyslel ine timy */}
                            {zhoda.halucinacie && zhoda.halucinacie.length > 0 && (
                                <p className={styles.halucinacie}>
                                    ⚠ Vymyslené údaje ({zhoda.halucinacie.length}):{' '}
                                    {zhoda.halucinacie.map(h =>
                                        `${h.model_key} → ${h.teams_text ?? '?'}`).join(', ')}
                                </p>
                            )}
                        </div>
                    )}

                    <ul className={styles.karty}>
                        {vysledky.map(v => (
                            <li key={v.model} className={v.passed ? styles.ok : styles.zle}>
                                <button
                                    className={styles.karta}
                                    onClick={() => setRozbalene(rozbalene === v.model ? null : v.model)}
                                >
                                    <span className={styles.znak}>
                                        {v.passed ? '✓' : '✕'}
                                        {v.kol > 1 && (
                                            <em className={styles.kola}>{v.presiel}/{v.kol}</em>
                                        )}
                                    </span>
                                    <span className={styles.stred}>
                                        <code>{v.model}</code>
                                        {/* Skutocne hodnoty, nie len zaskrtavatka:
                                            z 'OK' sa neda posudit, ci model
                                            vytiahol spravnu cast hry a minutu. */}
                                        <span className={styles.znacky}>
                                            {v.data?.home_team && (
                                                <span className={styles.timy}>
                                                    {v.data.home_team} — {v.data.away_team ?? '?'}
                                                </span>
                                            )}
                                            {v.score_text
                                                ? <span className={
                                                    zhoda && zhoda.najcastejsie_skore
                                                        ? (v.score_text === zhoda.najcastejsie_skore
                                                            ? styles.skoreZhoda : styles.skoreInak)
                                                        : styles.skoreNeutral
                                                  }>{v.score_text}</span>
                                                : <span className={styles.nemam}>– skóre</span>}
                                            {v.data?.period || v.data?.period_number
                                                ? <span className={styles.hodnota}>
                                                    {v.data.period ?? `časť ${v.data.period_number}`}
                                                    {v.data.period && v.data.period_number
                                                        ? ` ${v.data.period_number}` : ''}
                                                  </span>
                                                : <span className={styles.nemam}>– časť hry</span>}
                                            {v.got_minute
                                                ? <span className={styles.hodnota}>{v.data.minute}. min</span>
                                                : <span className={styles.nemam}>– minúta</span>}
                                        </span>
                                    </span>
                                    <span className={styles.cisla}>
                                        {v.took_ms ? (v.took_ms / 1000).toFixed(1) + ' s' : '—'}<br />
                                        {v.cost_usd ? '$' + v.cost_usd.toFixed(5) : 'zdarma'}
                                    </span>
                                </button>

                                {v.error && <p className={styles.chybaKarty}>{v.error}</p>}

                                {rozbalene === v.model && v.data && (
                                    <pre className={styles.detail}>
                                        {JSON.stringify(v.data, null, 2)}
                                    </pre>
                                )}
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {historia.length > 0 && (
                <details className={styles.historia}>
                    <summary>História testov ({historia.length})</summary>
                    <div className={styles.tabulkaObal}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Kedy</th><th>Model</th><th>Zápas</th>
                                    <th className={styles.cislo}>Skóre</th>
                                    <th>Výsledok</th><th className={styles.cislo}>Tokeny</th>
                                    <th className={styles.cislo}>Cena</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historia.map((t, i) => (
                                    <tr key={i}>
                                        <td>{new Date(t.tested_at + 'Z').toLocaleString('sk-SK',
                                             { day: 'numeric', month: 'numeric',
                                               hour: '2-digit', minute: '2-digit' })}</td>
                                        <td><code>{t.model_key}</code></td>
                                        <td className={styles.bunkaZapas}>
                                            {t.teams_text ?? '—'}
                                            {t.teams_agree === false &&
                                                <span className={styles.varovanieTimy}>⚠ iné</span>}
                                        </td>
                                        <td className={styles.cislo}>{t.score_text ?? '—'}</td>
                                        <td>{t.passed ? '✓ prešiel' : (t.error ? '✕ ' + t.error.slice(0, 40) : '✕')}</td>
                                        <td className={styles.cislo}>{t.total_tokens ?? '—'}</td>
                                        <td className={styles.cislo}>
                                            {t.cost_usd ? '$' + Number(t.cost_usd).toFixed(5) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}

            {kandidati.length > 0 && !bezi && vysledky.length === 0 && (
                <details className={styles.historia}>
                    <summary>Poradie modelov pri automatickom výbere ({kandidati.length})</summary>
                    <ol className={styles.poradie}>
                        {kandidati.map(k => (
                            <li key={k.model_id}>
                                <code>{k.model_id}</code>
                                {k.is_free
                                    ? <span className={styles.free}>zdarma</span>
                                    : <span className={styles.cena}>${k.cena_1m.toFixed(3)} / 1M</span>}
                                {k.success_rate !== null &&
                                    <span className={styles.uspech}>{k.success_rate}% z {k.tests_total}</span>}
                            </li>
                        ))}
                    </ol>
                </details>
            )}
        </div>
    );
}
