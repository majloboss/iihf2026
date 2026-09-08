import { useState, useRef, useEffect } from 'react';
import styles from './VyberModelu.module.css';

// Pole na vyber modelu s naseptavanim.
//
// Modelov je vyse 300, takze rozbalovaci zoznam ani nativny <datalist>
// nestacili: v prvom sa scrolluje donekonecna, druhy sa v roznych
// prehliadacoch sprava inak a nazov sa musel prepisovat rucne.
//
// Sprava:
//   pisanie        filtruje zoznam
//   klik do pola   ukaze vsetky moznosti (aj bez pisania)
//   sipky a Enter  vyber bez mysi
//   Esc            zavrie zoznam
//
// Vybrat sa da len model zo zoznamu — hodnota sa nastavi az klikom alebo
// Enterom, takze do rodica nikdy nepride vymysleny nazov.

const MAX_NAVRHOV = 40;

export default function VyberModelu({ modely, hodnota, onZmena, disabled, placeholder }) {
    const [text, setText]       = useState(hodnota ?? '');
    const [otvorene, setOtvorene] = useState(false);
    const [zvyraznene, setZvyraznene] = useState(0);
    const obal = useRef(null);

    // Ked sa hodnota zmeni zvonka (napr. po nacitani zo servera), pole to prevezme.
    useEffect(() => { setText(hodnota ?? ''); }, [hodnota]);

    // Klik mimo zatvori zoznam a vrati text na platnu hodnotu — inak by
    // v poli zostal rozpisany nazov, ktory nikam nepatri.
    useEffect(() => {
        const mimo = e => {
            if (obal.current && !obal.current.contains(e.target)) {
                setOtvorene(false);
                setText(hodnota ?? '');
            }
        };
        document.addEventListener('mousedown', mimo);
        return () => document.removeEventListener('mousedown', mimo);
    }, [hodnota]);

    // Pri prazdnom poli sa ukazu vsetky modely, inak sa filtruje podla textu.
    const hladane = text.trim().toLowerCase();
    const navrhy = (hladane && text !== hodnota
        ? modely.filter(m => m.model_id.toLowerCase().includes(hladane))
        : modely
    ).slice(0, MAX_NAVRHOV);

    function vyber(m) {
        setText(m.model_id);
        setOtvorene(false);
        onZmena(m.model_id);
    }

    function klavesa(e) {
        if (!otvorene && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setOtvorene(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setZvyraznene(i => Math.min(i + 1, navrhy.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setZvyraznene(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (navrhy[zvyraznene]) vyber(navrhy[zvyraznene]);
        } else if (e.key === 'Escape') {
            setOtvorene(false);
            setText(hodnota ?? '');
        }
    }

    return (
        <div className={styles.obal} ref={obal}>
            <input
                type="text"
                className={styles.pole}
                value={text}
                disabled={disabled}
                placeholder={placeholder ?? 'píš názov modelu…'}
                onChange={e => { setText(e.target.value); setOtvorene(true); setZvyraznene(0); }}
                onFocus={() => setOtvorene(true)}
                onKeyDown={klavesa}
                aria-label="Model"
                autoComplete="off"
            />

            {text && (
                <button
                    type="button"
                    className={styles.zmazat}
                    onClick={() => { setText(''); setOtvorene(true); onZmena(''); }}
                    disabled={disabled}
                    aria-label="Vymazať"
                >×</button>
            )}

            {otvorene && navrhy.length > 0 && (
                <ul className={styles.zoznam}>
                    {navrhy.map((m, i) => (
                        <li key={m.model_id}
                            className={i === zvyraznene ? styles.zvyraznene : ''}
                            onMouseEnter={() => setZvyraznene(i)}
                            onMouseDown={e => { e.preventDefault(); vyber(m); }}>
                            <span className={styles.nazov}>{m.model_id}</span>
                            <span className={styles.udaje}>
                                {m.is_free ? 'zdarma' : `$${m.cena_1m}/1M`}
                                {m.agree_rate !== null && ` · zhoda ${m.agree_rate} %`}
                                {m.halucinacii > 0 &&
                                    <em className={styles.varovanie}> · ⚠ {m.halucinacii}× vymyslené</em>}
                            </span>
                        </li>
                    ))}
                    {modely.length > MAX_NAVRHOV && navrhy.length === MAX_NAVRHOV && (
                        <li className={styles.viac}>
                            …ďalšie nájdeš písaním ({modely.length} modelov spolu)
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
