import { useEffect, useState } from 'react';
import usePhases from '../hooks/usePhases';
import { useCompetition } from '../context/CompetitionContext';
import styles from '../pages/admin/UserModal.module.css';

// Úprava zápasu — spoločná pre všetky súťaže.
//
// Predtým mala každá súťaž vlastný modal s tými istými poliami; líšili sa len
// názvy stĺpcov a zdroj tímov. Rozdiely preto opisuje `mapovanie`, ktoré dodá
// volajúca obrazovka.
//
// Výsledok sa tu **nezadáva**. Má vlastné pravidlá — predĺženie, nájazdy,
// súčet dvojzápasu — a tie patria do obrazovky Výsledky. Sem sa dá zmeniť
// len to, čo zápas popisuje: kedy, kto, kde, pod ktorým kolom a odkiaľ sa
// sťahuje živé skóre.

const POLE = { padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6,
               fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' };

// Dátum a čas zo zápasu do dvoch políčok formulára.
const naVstupy = (hodnota) => {
    if (!hodnota) return { datum: '', cas: '' };
    // Naive UTC z API ('2026-09-08 21:00:00') aj ISO reťazec.
    const d = new Date(String(hodnota).includes('T') ? hodnota
                       : String(hodnota).replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return { datum: '', cas: '' };
    const p = n => String(n).padStart(2, '0');
    return {
        datum: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
        cas: `${p(d.getHours())}:${p(d.getMinutes())}`,
    };
};

export default function GameEditor({
    zapas,
    mapovanie,        // názvy polí zápasu, ktoré sa medzi súťažami líšia
    timy = [],        // [{ kod, nazov }]
    onUlozit,         // (zmeny) => Promise
    onZavriet,
    onUlozene,
}) {
    const M = mapovanie;
    const { activeCompetition } = useCompetition();
    const { fazy } = usePhases(activeCompetition?.id);

    const { datum: d0, cas: c0 } = naVstupy(zapas[M.cas]);
    const [datum, setDatum]   = useState(d0);
    const [cas, setCas]       = useState(c0);
    const [dom, setDom]       = useState(zapas[M.domaci] ?? '');
    const [hos, setHos]       = useState(zapas[M.hostia] ?? '');
    const [miesto, setMiesto] = useState(zapas.venue ?? '');
    const [fazaId, setFazaId] = useState(zapas.phase_id ?? '');
    const [odkaz, setOdkaz]   = useState(zapas.flashscore_url ?? '');
    const [tipyOtvorene, setTipyOtvorene] = useState(zapas.tips_open ?? true);
    const [uklada, setUklada] = useState(false);
    const [chyba, setChyba]   = useState('');

    // Zoznam tímov aj číselník fáz prichádzajú až po prvom vykreslení. Dovtedy
    // `select` nemá zodpovedajúcu `option`, takže výber zahodí — hodnota sa
    // preto nastaví znovu, keď zoznamy dorazia.
    useEffect(() => {
        if (timy.length) {
            setDom(zapas[M.domaci] ?? '');
            setHos(zapas[M.hostia] ?? '');
        }
    }, [timy.length, zapas, M.domaci, M.hostia]);

    useEffect(() => {
        if (fazy.length) setFazaId(zapas.phase_id ?? '');
    }, [fazy.length, zapas.phase_id]);

    const uloz = async () => {
        setUklada(true);
        setChyba('');
        try {
            await onUlozit({
                datum, cas,
                domaci: dom === '' ? null : dom,
                hostia: hos === '' ? null : hos,
                venue: miesto,
                phase_id: fazaId === '' ? null : Number(fazaId),
                flashscore_url: odkaz || null,
                tips_open: tipyOtvorene,
            });
            onUlozene?.();
            onZavriet();
        } catch (e) {
            setChyba(e.message);
            setUklada(false);
        }
    };

    // Ikona vedie na zadaný odkaz; kým nie je platný, neotvára nič.
    const platnyOdkaz = /^https?:\/\//i.test(odkaz.trim());

    // Kým nebeží migrácia 075, zápas fázu ešte naviazanú nemá — vtedy sa
    // aspoň ukáže, čo mu priradí.
    const stavFazy = zapas.phase_id
        ? <>naviazané na <strong>{zapas.match_stat_code}</strong></>
        : zapas.navrh_kolo
            ? <>migrácia priradí <strong>{zapas.navrh_kolo}</strong></>
            : <>bez fázy</>;

    return (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onZavriet()}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3>{M.nadpis(zapas)}</h3>
                    <button className={styles.close} onClick={onZavriet}>✕</button>
                </div>

                {/* 1. riadok — kedy sa hrá a pod ktorým kolom */}
                <div className={styles.section}>
                    <div className={styles.grid}>
                        <label>Dátum
                            <input type="date" value={datum} style={POLE}
                                   onChange={e => setDatum(e.target.value)} />
                        </label>
                        <label>Čas
                            <input type="time" value={cas} style={POLE}
                                   onChange={e => setCas(e.target.value)} />
                        </label>
                        <label>Fáza / kolo
                            <select value={fazaId} style={POLE} onChange={e => setFazaId(e.target.value)}>
                                <option value="">— neurčená —</option>
                                {fazy.map(f => (
                                    <option key={f.code} value={f.id}>{f.label} — {f.title}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <small style={{ display: 'block', marginTop: 6, color: '#888', lineHeight: 1.5 }}>
                        V zápase je <code>{zapas[M.staraFaza] ?? '—'}</code>
                        {zapas.leg ? <>, odveta <code>{zapas.leg}</code></> : null}
                        {' · '}{stavFazy}
                    </small>
                </div>

                {/* 2. riadok — kto hrá */}
                <div className={styles.section}>
                    <div className={styles.grid}>
                        <label>{M.popisDomaci ?? 'Domáci'}
                            <select value={dom} style={POLE} onChange={e => setDom(e.target.value)}>
                                <option value="">— neurčený —</option>
                                {timy.map(t => <option key={t.kod} value={t.kod}>{t.nazov}</option>)}
                            </select>
                        </label>
                        <label>{M.popisHostia ?? 'Hostia'}
                            <select value={hos} style={POLE} onChange={e => setHos(e.target.value)}>
                                <option value="">— neurčený —</option>
                                {timy.map(t => <option key={t.kod} value={t.kod}>{t.nazov}</option>)}
                            </select>
                        </label>
                    </div>
                </div>

                {/* 3. riadok — kde */}
                <div className={styles.section}>
                    <label>Štadión
                        <input value={miesto} maxLength={100} style={POLE}
                               onChange={e => setMiesto(e.target.value)} />
                    </label>
                </div>

                {/* 4. riadok — odkiaľ sa sťahuje živé skóre */}
                <div className={styles.section}>
                    <label>FlashScore link
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input value={odkaz} style={POLE} placeholder="https://www.flashscore.sk/zapas/..."
                                   onChange={e => setOdkaz(e.target.value)} />
                            {/* Odkaz sa dá hneď overiť. Bez neho ikona zmatnie
                                a neotvára nič. */}
                            <a href={platnyOdkaz ? odkaz : undefined}
                               target="_blank" rel="noopener noreferrer"
                               title={platnyOdkaz ? 'Otvoriť na FlashScore' : 'Zadaj odkaz'}
                               onClick={e => { if (!platnyOdkaz) e.preventDefault(); }}
                               style={{ flexShrink: 0, display: 'inline-flex',
                                        opacity: platnyOdkaz ? 1 : 0.3,
                                        cursor: platnyOdkaz ? 'pointer' : 'default' }}>
                                <img src="/flashscore.png" alt="FlashScore"
                                     style={{ width: 24, height: 24, borderRadius: 4 }} />
                            </a>
                        </span>
                    </label>
                </div>

                {/* Tipovanie sa zatvára samo 5 minút pred začiatkom; toto je
                    ručné zamknutie navyše. Ponúka sa len tam, kde ho súťaž
                    používa. */}
                {M.tipovanie && (
                    <div className={styles.section}>
                        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" checked={tipyOtvorene}
                                   onChange={e => setTipyOtvorene(e.target.checked)} />
                            <span>Tipovanie otvorené</span>
                        </label>
                    </div>
                )}

                <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#999' }}>
                    Výsledok sa zadáva v obrazovke <strong>Výsledky</strong> — má vlastné
                    pravidlá pre predĺženie{M.rozstrel ? `, ${M.rozstrel}` : ''}
                    {M.dvojzapas ? ' aj súčet dvojzápasu' : ''}.
                </p>

                <button className={styles.btn} onClick={uloz} disabled={uklada}>
                    {uklada ? 'Ukladám…' : 'Uložiť'}
                </button>
                {chyba && <p className={styles.error}>{chyba}</p>}
            </div>
        </div>
    );
}
