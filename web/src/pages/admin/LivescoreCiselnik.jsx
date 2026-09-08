import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../api/client';
import admin from './Admin.module.css';
import styles from './AdminLivescore.module.css';

// Zalozka Číselník modelov — zoznam vsetkych modelov s filtrom a triedenim.
//
// Tabulka pouziva spolocny .table z Admin.module.css, takze na mobile sa
// zmeni na karty rovnako ako ostatne tabulky v aplikacii (preto data-label
// pri kazdej bunke).

const STLPCE = [
    { key: 'model_id',     label: 'Model',      typ: 'text' },
    { key: 'halucinacii',  label: 'Vymyslené',  typ: 'cislo' },
    { key: 'agree_rate',   label: 'Zhoda',      typ: 'cislo' },
    { key: 'success_rate', label: 'Úspešnosť',  typ: 'cislo' },
    { key: 'tests_total',  label: 'Testov',     typ: 'cislo' },
    { key: 'avg_ms',       label: 'Čas',        typ: 'cislo' },
    { key: 'cena_1m',      label: 'Cena / 1M',  typ: 'cislo' },
];

export default function LivescoreCiselnik() {
    const [modely, setModely] = useState([]);
    const [chyba, setChyba]   = useState(null);
    const [caka, setCaka]     = useState(true);

    const [filter, setFilter]   = useState('');
    const [lenFree, setLenFree] = useState(false);
    const [lenTest, setLenTest] = useState(false);

    // Predvolene: modely bez halucinacii hore, potom podla zhody
    const [triedenie, setTriedenie] = useState({ stlpec: 'halucinacii', smer: 'asc' });

    useEffect(() => { nacitat(); }, []);

    async function nacitat() {
        setCaka(true);
        try {
            const r = await apiFetch('v1/admin/livescore-model');
            setModely(r.modely);
        } catch (e) {
            setChyba(e.message);
        } finally {
            setCaka(false);
        }
    }

    function zoradPodla(stlpec) {
        setTriedenie(t => t.stlpec === stlpec
            ? { stlpec, smer: t.smer === 'asc' ? 'desc' : 'asc' }
            : { stlpec, smer: stlpec === 'model_id' ? 'asc' : 'desc' });
    }

    const zobrazene = useMemo(() => {
        const f = filter.trim().toLowerCase();
        let z = modely.filter(m => {
            if (f && !m.model_id.toLowerCase().includes(f)
                  && !(m.name ?? '').toLowerCase().includes(f)) return false;
            if (lenFree && !m.is_free) return false;
            if (lenTest && !m.tests_total) return false;
            return true;
        });

        const { stlpec, smer } = triedenie;
        const znamienko = smer === 'asc' ? 1 : -1;

        return [...z].sort((a, b) => {
            const x = a[stlpec], y = b[stlpec];
            // Nevyplnene hodnoty vzdy dole, bez ohladu na smer triedenia
            if (x === null || x === undefined) return 1;
            if (y === null || y === undefined) return -1;
            if (typeof x === 'string') return znamienko * x.localeCompare(y);
            return znamienko * (x - y);
        });
    }, [modely, filter, lenFree, lenTest, triedenie]);

    const sipka = k => triedenie.stlpec !== k ? '' : (triedenie.smer === 'asc' ? ' ▲' : ' ▼');

    return (
        <div>
            <p className={styles.popis}>
                Všetky modely z cenníka OpenRoutera. Kliknutím na názov stĺpca sa
                zoznam zoradí. <strong>Vymyslené</strong> je počet testov, v ktorých
                model vrátil iné tímy než ostatné — taký model do produkcie nepatrí.
            </p>

            {chyba && <div className={styles.chyba}>{chyba}</div>}

            <div className={styles.formular}>
                <label>
                    <span>Hľadať model</span>
                    <input
                        type="search"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="napr. minimax, gemma, claude…"
                    />
                </label>

                <div className={styles.prepinace}>
                    <label className={styles.prepinac}>
                        <input type="checkbox" checked={lenFree}
                               onChange={e => setLenFree(e.target.checked)} />
                        len bezplatné
                    </label>
                    <label className={styles.prepinac}>
                        <input type="checkbox" checked={lenTest}
                               onChange={e => setLenTest(e.target.checked)} />
                        len otestované
                    </label>
                    <span className={styles.pocet}>
                        {zobrazene.length} z {modely.length}
                    </span>
                </div>
            </div>

            {caka && <p className={styles.popis}>Načítavam…</p>}

            <table className={admin.table}>
                <thead>
                    <tr>
                        {STLPCE.map(s => (
                            <th key={s.key}
                                className={styles.triedic}
                                onClick={() => zoradPodla(s.key)}
                                title="Kliknutím zoradiť">
                                {s.label}{sipka(s.key)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {zobrazene.map(m => (
                        <tr key={m.model_id}>
                            <td data-label="Model">
                                <code>{m.model_id}</code>
                                {m.is_free && <span className={styles.free}>zdarma</span>}
                            </td>
                            <td data-label="Vymyslené">
                                {m.halucinacii > 0
                                    ? <span className={styles.zleCislo}>{m.halucinacii}×</span>
                                    : '—'}
                            </td>
                            <td data-label="Zhoda">
                                {m.agree_rate !== null ? `${m.agree_rate} %` : '—'}
                            </td>
                            <td data-label="Úspešnosť">
                                {m.success_rate !== null ? `${m.success_rate} %` : '—'}
                            </td>
                            <td data-label="Testov">{m.tests_total || '—'}</td>
                            <td data-label="Čas">
                                {m.avg_ms ? `${(m.avg_ms / 1000).toFixed(1)} s` : '—'}
                            </td>
                            <td data-label="Cena / 1M">
                                {m.is_free ? 'zdarma' : `$${m.cena_1m}`}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {!caka && zobrazene.length === 0 && (
                <p className={styles.popis}>Filtru nezodpovedá žiadny model.</p>
            )}
        </div>
    );
}
