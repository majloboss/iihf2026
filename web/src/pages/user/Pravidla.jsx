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
                            <td className={styles.center}><span className={styles.pts3}>3 body</span></td>
                            <td className={styles.center}><span className={styles.pts3}>5 bodov</span></td>
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
                        <tr className={styles.exactRow}>
                            <td><strong>Maximum za zápas</strong></td>
                            <td className={styles.center}><strong>5 bodov</strong></td>
                            <td className={styles.center}><strong>7 bodov</strong></td>
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
                            <td className={styles.center}><span className={styles.pts3}>5</span></td>
                            <td>víťaz ✓, góly FIN ✓, góly GER ✓</td>
                        </tr>
                        <tr>
                            <td>FIN 3:1 GER</td>
                            <td className={styles.center}><span className={styles.pts2}>4</span></td>
                            <td>víťaz ✓, góly FIN ✓, góly GER ✗</td>
                        </tr>
                        <tr>
                            <td>FIN 2:1 GER</td>
                            <td className={styles.center}><span className={styles.pts1}>3</span></td>
                            <td>víťaz ✓, góly FIN ✗, góly GER ✗</td>
                        </tr>
                        <tr>
                            <td>FIN 1:2 GER</td>
                            <td className={styles.center}><span className={styles.pts1}>1</span></td>
                            <td>víťaz ✗, góly GER ✓</td>
                        </tr>
                        <tr>
                            <td>FIN 0:1 GER</td>
                            <td className={styles.center}><span className={styles.pts0}>0</span></td>
                            <td>—</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Príklady (play-off)</h3>
                <p className={styles.exampleDesc}>Skutočný výsledok: <strong>CAN 2:1 SVK</strong></p>
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
                            <td>CAN 2:1 SVK</td>
                            <td className={styles.center}><span className={styles.pts3}>7</span></td>
                            <td>víťaz ✓, góly CAN ✓, góly SVK ✓</td>
                        </tr>
                        <tr>
                            <td>CAN 2:0 SVK</td>
                            <td className={styles.center}><span className={styles.pts2}>6</span></td>
                            <td>víťaz ✓, góly CAN ✓</td>
                        </tr>
                        <tr>
                            <td>CAN 3:0 SVK</td>
                            <td className={styles.center}><span className={styles.pts1}>5</span></td>
                            <td>víťaz ✓</td>
                        </tr>
                        <tr>
                            <td>CAN 0:1 SVK</td>
                            <td className={styles.center}><span className={styles.pts1}>1</span></td>
                            <td>góly SVK ✓</td>
                        </tr>
                        <tr>
                            <td>SVK 2:0 CAN</td>
                            <td className={styles.center}><span className={styles.pts0}>0</span></td>
                            <td>—</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Poradie v skupinách</h3>
                <p>Hráči súťažia v skupinách priateľov. Poradie určuje celkový počet bodov zo všetkých tipovaných zápasov.</p>
                <p>Pri rovnosti bodov rozhoduje počet tipov s plným počtom bodov (3 resp. 5), potom počet tipov s 2 bodmi, atď.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Skupiny priateľov</h3>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>1</span>
                        <div>
                            <strong>Vytvor skupinu</strong>
                            <p>V sekcii Skupiny klikni na <em>Vytvoriť skupinu</em> a zadaj jej názov. Staneš sa zakladateľom.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>2</span>
                        <div>
                            <strong>Pozvi priateľov</strong>
                            <p>Zdieľaj názov skupiny. Ostatní hráči si ju nájdu v zozname a požiadajú o vstup.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>3</span>
                        <div>
                            <strong>Schváľ žiadosti</strong>
                            <p>Ako zakladateľ uvidíš čakajúce žiadosti a každú môžeš schváliť alebo odmietnuť.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>4</span>
                        <div>
                            <strong>Sleduj poradie</strong>
                            <p>V sekcii Tabuľky vidíš poradie všetkých svojich skupín. Môžeš byť členom viacerých skupín naraz.</p>
                        </div>
                    </div>
                </div>
                <p className={styles.note}>Skupinu môže zrušiť iba jej zakladateľ. Kedykoľvek môžeš skupinu opustiť sám.</p>
            </div>
        </div>
    );
}
