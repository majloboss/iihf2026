import styles from './Pravidla.module.css';

export default function Pravidla() {
    return (
        <div className={styles.wrap}>
            <h2 className={styles.title}>Pravidlá tipovačky</h2>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Ako tipovať</h3>
                <p>Pred každým zápasom zadáš tip na <strong>presný výsledok riadnej hracej doby (60 minút)</strong>. Predĺženie ani samostatné nájazdy sa do výsledku nepočítajú.</p>
                <p>Tipovanie sa uzavrie <strong>5 minút pred začiatkom zápasu</strong>. Po uzavretí tip nie je možné zmeniť.</p>
                <p>Rovnaký tip platí vo všetkých skupinách priateľov, v ktorých si členom.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Bodovanie</h3>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Podmienka</th>
                            <th className={styles.center}>Základná časť</th>
                            <th className={styles.center}>Play-off</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Správny víťaz alebo remíza</td>
                            <td className={styles.center}><span className={styles.pts}>1 bod</span></td>
                            <td className={styles.center}><span className={styles.pts}>3 body</span></td>
                        </tr>
                        <tr>
                            <td>Správny počet gólov domácich</td>
                            <td className={styles.center}><span className={styles.pts}>1 bod</span></td>
                            <td className={styles.center}><span className={styles.pts}>1 bod</span></td>
                        </tr>
                        <tr>
                            <td>Správny počet gólov hostí</td>
                            <td className={styles.center}><span className={styles.pts}>1 bod</span></td>
                            <td className={styles.center}><span className={styles.pts}>1 bod</span></td>
                        </tr>
                        <tr className={styles.maxRow}>
                            <td><strong>Maximum za zápas</strong></td>
                            <td className={styles.center}><strong>3 body</strong></td>
                            <td className={styles.center}><strong>5 bodov</strong></td>
                        </tr>
                    </tbody>
                </table>
                <p className={styles.note}>Play-off = štvrťfinále, semifinále, finále, zápas o bronz.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Príklady (základná časť)</h3>
                <p className={styles.exampleDesc}>Skutočný výsledok: <strong>FIN 3:2 GER</strong></p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tip</th>
                            <th className={styles.center}>Body</th>
                            <th>Dôvod</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>FIN 3:2 GER</td>
                            <td className={styles.center}><span className={styles.pts3}>3</span></td>
                            <td>víťaz ✓, góly FIN ✓, góly GER ✓</td>
                        </tr>
                        <tr>
                            <td>FIN 3:1 GER</td>
                            <td className={styles.center}><span className={styles.pts2}>2</span></td>
                            <td>víťaz ✓, góly FIN ✓, góly GER ✗</td>
                        </tr>
                        <tr>
                            <td>FIN 2:1 GER</td>
                            <td className={styles.center}><span className={styles.pts1}>1</span></td>
                            <td>víťaz ✓, góly FIN ✗, góly GER ✗</td>
                        </tr>
                        <tr>
                            <td>FIN 1:2 GER</td>
                            <td className={styles.center}><span className={styles.pts1}>1</span></td>
                            <td>víťaz ✗, góly FIN ✗, góly GER ✓</td>
                        </tr>
                        <tr>
                            <td>FIN 0:1 GER</td>
                            <td className={styles.center}><span className={styles.pts0}>0</span></td>
                            <td>víťaz ✗, góly FIN ✗, góly GER ✗</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Poradie v skupinách</h3>
                <p>Hráči súťažia v skupinách priateľov. Poradie určuje celkový počet bodov zo všetkých tipovaných zápasov.</p>
                <p>Pri rovnosti bodov rozhoduje počet tipov s plným počtom bodov (3 resp. 5), potom počet tipov s 2 bodmi, atď.</p>
            </div>
        </div>
    );
}
