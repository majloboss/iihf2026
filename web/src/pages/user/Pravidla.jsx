import { useState } from 'react';
import styles from './Pravidla.module.css';

const TABS = [
    { id: 'bodovanie',  label: 'Tipovanie' },
    { id: 'skupiny',    label: 'Pozvánky' },
    { id: 'ovladanie',  label: 'Ovládanie' },
];

function TabBodovanie() {
    return (
        <>
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
                        <tr><td>FIN 3:2 GER</td><td className={styles.center}><span className={styles.pts3}>5</span></td><td>víťaz ✓, góly FIN ✓, góly GER ✓</td></tr>
                        <tr><td>FIN 3:1 GER</td><td className={styles.center}><span className={styles.pts2}>4</span></td><td>víťaz ✓, góly FIN ✓, góly GER ✗</td></tr>
                        <tr><td>FIN 2:1 GER</td><td className={styles.center}><span className={styles.pts1}>3</span></td><td>víťaz ✓, góly FIN ✗, góly GER ✗</td></tr>
                        <tr><td>FIN 1:2 GER</td><td className={styles.center}><span className={styles.pts1}>1</span></td><td>víťaz ✗, góly GER ✓</td></tr>
                        <tr><td>FIN 0:1 GER</td><td className={styles.center}><span className={styles.pts0}>0</span></td><td>—</td></tr>
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
                        <tr><td>CAN 2:1 SVK</td><td className={styles.center}><span className={styles.pts3}>7</span></td><td>víťaz ✓, góly CAN ✓, góly SVK ✓</td></tr>
                        <tr><td>CAN 2:0 SVK</td><td className={styles.center}><span className={styles.pts2}>6</span></td><td>víťaz ✓, góly CAN ✓</td></tr>
                        <tr><td>CAN 3:0 SVK</td><td className={styles.center}><span className={styles.pts1}>5</span></td><td>víťaz ✓</td></tr>
                        <tr><td>CAN 0:1 SVK</td><td className={styles.center}><span className={styles.pts1}>1</span></td><td>góly SVK ✓</td></tr>
                        <tr><td>SVK 2:0 CAN</td><td className={styles.center}><span className={styles.pts0}>0</span></td><td>—</td></tr>
                    </tbody>
                </table>
            </div>
        </>
    );
}

function TabSkupiny() {
    return (
        <>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Pozvánky</h3>
                <p>Do tipovačky sa možno registrovať <strong>iba cez pozývací link</strong>. Každý link je jednorazový a platí pre jednu registráciu.</p>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>1</span>
                        <div>
                            <strong>Vytvor pozvánku</strong>
                            <p>V sekcii <em>Pozvánky</em> klikni na <em>Nová pozvánka</em>. Môžeš zadať e-mail adresáta — pozvánka mu bude doručená automaticky. Bez e-mailu ti systém vygeneruje link, ktorý mu pošleš sám.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>2</span>
                        <div>
                            <strong>Vyber skupinu (voliteľné)</strong>
                            <p>Pri tvorbe pozvánky môžeš vybrať niektorú zo svojich skupín. Nový hráč bude po registrácii automaticky zaradený do tejto skupiny — bez potreby žiadosti a schválenia.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>3</span>
                        <div>
                            <strong>Sleduj stav</strong>
                            <p>V zozname pozvánok vidíš, či link bol už použitý a kto sa cez neho zaregistroval.</p>
                        </div>
                    </div>
                </div>
                <p className={styles.note}>Každý registrovaný hráč môže posielať pozvánky. Počet pozvánok nie je obmedzený.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Skupiny priateľov</h3>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>1</span>
                        <div>
                            <strong>Vytvor skupinu</strong>
                            <p>V sekcii Skupiny klikni na <em>Vytvoriť skupinu</em> a zadaj jej názov. Staneš sa zakladateľom a automaticky prvým členom.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>2</span>
                        <div>
                            <strong>Pozvi priateľov</strong>
                            <p>V sekcii <em>Pozvánky</em> vytvor pozývací link a pošli ho priateľovi — e-mailom alebo inak. Môžeš priamo vybrať skupinu, do ktorej chceš nového hráča automaticky zaradiť po registrácii.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>3</span>
                        <div>
                            <strong>Schváľ žiadosti</strong>
                            <p>Ak sa niekto prihlási do skupiny sám (bez pozvánky so skupinou), uvidíš jeho žiadosť v sekcii Skupiny a môžeš ju schváliť alebo odmietnuť.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>4</span>
                        <div>
                            <strong>Sleduj poradie</strong>
                            <p>V sekcii Tabuľky vidíš poradie všetkých svojich skupín. Môžeš byť členom viacerých skupín naraz — tvoje tipy platia v každej z nich.</p>
                        </div>
                    </div>
                </div>
                <p className={styles.note}>Skupinu môže zrušiť iba jej zakladateľ. Kedykoľvek môžeš skupinu opustiť sám.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Poradie v skupinách</h3>
                <p>Hráči súťažia v skupinách priateľov. Poradie určuje celkový počet bodov zo všetkých tipovaných zápasov.</p>
                <p>Pri rovnosti bodov rozhoduje počet tipov s plným počtom bodov (5 resp. 7), potom s nižším počtom bodov atď.</p>
            </div>
        </>
    );
}

function TabOvladanie() {
    return (
        <>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Prehľad</h3>
                <p>Úvodná obrazovka zobrazuje najdôležitejšie informácie na jednom mieste:</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Správa organizátora</span> — aktuálny oznam od organizátora tipovačky (ak existuje).</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Nenatipované zápasy</span> — zápasy na dnes a zajtra, ktoré ešte nemáš natipované. Kliknutím otvoríš formulár na zadanie tipu. Sekcia sa zobrazí len ak takéto zápasy existujú.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Najbližšie zápasy</span> — nadchádzajúce a live zápasy. Kliknutím na zápas s otvoreným tipovaním zadáš tip; kliknutím na live alebo odohraný zápas vidíš tipy členov tvojich skupín.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Posledné výsledky</span> — posledné odohraté zápasy so skóre a tvojím tipom.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Poradie v skupinách</span> — skrátené tabuľky tvojich skupín (top 3 + ty, ak nie si v top 3).</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>História správ</span> — archív starších správ organizátora.</div>
                </div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Zápasy</h3>
                <p>Obrazovka zobrazuje všetkých 64 zápasov turnaja s možnosťou filtrovania a tipovania.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Filter nenatipovaných (✓)</span> — prvé tlačidlo v lište filtrov. Svetlo červené = zobrazené všetky zápasy. Tmavo červené = zobrazené len zápasy bez tvojho tipu. Kombinuje sa s ostatnými filtrami.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Filtre fázy (ALL / A / B / QF / SF / BR / F)</span> — zobrazí zápasy zvolenej fázy turnaja. ALL zobrazí všetky.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>TAB</span> — prepne na skupinové tabuľky tímov A a B. Kliknutím na tím v tabuľke sa vrátia všetky jeho zápasy.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Kalendár</span> — filter podľa dátumu. Kliknutím na deň zobrazíš len zápasy toho dňa. Opätovným kliknutím filter zrušíš.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Vlajky tímov</span> — filter podľa tímu. Kliknutím na vlajku zobrazíš len zápasy daného tímu.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Tipovanie</span> — pri zápasoch s otvoreným tipovaním zadáš skóre priamo na karte zápasu a potvrdíš tlačidlom.</div>
                </div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Tabuľky skupín (TAB)</h3>
                <p>V obrazovke Zápasy klikni na <strong>TAB</strong> — zobrazí sa skupinová tabuľka tímov zo skupiny A a B (zhodná s oficiálnou IIHF tabuľkou).</p>
                <p>Kliknutím na ľubovoľný tím v tabuľke sa automaticky prepneš späť na zoznam zápasov s nastaveným filtrom na daný tím — uvidíš všetky jeho zápasy naraz.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Skupiny</h3>
                <p>Obrazovka Skupiny slúži na správu skupín priateľov a pozvánok.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Zoznam skupín</span> — kliknutím na skupinu rozbalíš zoznam jej členov s avatarmi. Ďalším kliknutím na člena vidíš jeho profil.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Filter Len moje / Všetky</span> — prepína medzi skupinami, kde si členom, a všetkými existujúcimi skupinami.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Vytvoriť skupinu</span> — vytvoríš novú skupinu a staneš sa jej zakladateľom.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Pozvánky</span> — záložka v Profile → Pozvánky. Tu vidíš odoslané pozvánky a môžeš vytvoriť novú.</div>
                </div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Profil</h3>
                <p>V Profile môžeš upraviť svoje osobné údaje a nastavenia.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Avatar</span> — klikni na fotografiu a nahraj obrázok zo zariadenia.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Osobné údaje</span> — meno, priezvisko, e-mail, telefón. E-mail je potrebný pre e-mailové notifikácie.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Zmena hesla</span> — zadáš aktuálne heslo a dvakrát nové. Zmena je okamžitá.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Notifikácie</span> — záložka Notif. Nastavíš, kedy ti má aplikácia posielať e-maily (pred zápasom, netipovaný zápas a pod.).</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Odhlásenie</span> — záložka Odhlásenie v Profile.</div>
                </div>
            </div>
        </>
    );
}

export default function Pravidla() {
    const [activeTab, setActiveTab] = useState('bodovanie');

    return (
        <div className={styles.wrap}>
            <div className={styles.tabs}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        className={activeTab === t.id ? styles.tabActive : styles.tab}
                        onClick={() => setActiveTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'bodovanie' && <TabBodovanie />}
            {activeTab === 'skupiny'   && <TabSkupiny />}
            {activeTab === 'ovladanie' && <TabOvladanie />}
        </div>
    );
}
