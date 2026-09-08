import styles from './AdminLivescore.module.css';

// Zalozka Naklady — faza 5 zadania (ZADANIE_LIVESCORE_NAKLADY.md).
// Filtre podla sutaze, zapasu a datumu, prvy riadok sumarizacia.
export default function LivescoreNaklady() {
    return (
        <p className={styles.popis}>
            Pripravuje sa — prehľad nákladov s filtrami a sumarizáciou.
            Zatiaľ sa dá použiť záložka <strong>Test</strong>.
        </p>
    );
}
