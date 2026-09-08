import { useState } from 'react';
import LivescoreNaklady from './LivescoreNaklady';
import LivescoreModelInfo from './LivescoreModelInfo';
import LivescoreCiselnik from './LivescoreCiselnik';
import LivescoreTestModelov from './LivescoreTestModelov';
import styles from './AdminLivescore.module.css';

// Sprava → Livescore.
//
// Naklady          — kolko livescore stoji, filtre a sumarizacia
// Model sutaze     — ktory model dnes bezi, cena a predpoklad, rucna zmena
// Ciselnik modelov — vsetky modely s filtrom a triedenim
// Test             — rucne spustenie testu modelov na skutocnom zapase

const ZALOZKY = [
    { key: 'naklady',  label: 'Náklady' },
    { key: 'sutaz',    label: 'Model súťaže' },
    { key: 'ciselnik', label: 'Číselník modelov' },
    { key: 'test',     label: 'Test' },
];

export default function AdminLivescore() {
    const [zalozka, setZalozka] = useState('naklady');

    return (
        <div className={styles.stranka}>
            <h1>Livescore</h1>

            <div className={styles.zalozky}>
                {ZALOZKY.map(z => (
                    <button
                        key={z.key}
                        className={zalozka === z.key ? styles.aktivna : ''}
                        onClick={() => setZalozka(z.key)}
                    >
                        {z.label}
                    </button>
                ))}
            </div>

            {zalozka === 'naklady'  && <LivescoreNaklady />}
            {zalozka === 'sutaz'    && <LivescoreModelInfo />}
            {zalozka === 'ciselnik' && <LivescoreCiselnik />}
            {zalozka === 'test'     && <LivescoreTestModelov />}
        </div>
    );
}
