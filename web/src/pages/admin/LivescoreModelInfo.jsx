import styles from './AdminLivescore.module.css';

// Zalozka Model — faza 6 zadania (ZADANIE_LIVESCORE_NAKLADY.md).
// Aky model dnes bezi, cena a predpoklad na den, rucna zmena a vypnutie.
export default function LivescoreModelInfo() {
    return (
        <p className={styles.popis}>
            Pripravuje sa — informácie o aktuálnom modeli, predpoklad nákladov
            na deň a možnosť model zmeniť alebo livescore vypnúť.
        </p>
    );
}
