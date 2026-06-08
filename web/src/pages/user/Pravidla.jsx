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
                <p>Pred každým zápasom zadáš tip na <strong>presný výsledok riadnej hracej doby</strong> — v hokeji <strong>60 minút</strong>, vo futbale <strong>90 minút</strong>. Predĺženie, nájazdy ani penalty sa do výsledku tipu nepočítajú.</p>
                <p>Tipovanie sa uzavrie <strong>5 minút pred začiatkom zápasu</strong>. Po uzavretí tip nie je možné zmeniť.</p>
                <p>Rovnaký tip platí vo všetkých skupinách priateľov, v ktorých si členom.</p>
                <p className={styles.note}>Tipy platia pre <strong>aktívnu súťaž</strong>, ktorú máš zvolenú v Profile → Súťaže. Každá súťaž má vlastné tipy, tabuľky aj poradie.</p>
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
                <p className={styles.note}>Bodovanie je rovnaké pre všetky súťaže. Play-off = vyraďovacia časť (osemfinále / Round of 32, štvrťfinále, semifinále, zápas o bronz, finále).</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Určovanie poradia</h3>
                <p>Poradie sa určuje podľa kritérií v tomto poradí:</p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Kritérium</th>
                            <th>Popis</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td><strong>1.</strong> Celkové body</td><td>Súčet bodov zo všetkých tipovaných zápasov</td></tr>
                        <tr><td><strong>2.</strong> Počet tipov za 7 bodov</td><td>Presný výsledok v play-off (víťaz/remíza + oba góly)</td></tr>
                        <tr><td><strong>3.</strong> Počet tipov za 6 bodov</td><td>Víťaz/Remíza v play-off + 1 správny počet gólov</td></tr>
                        <tr><td><strong>4.</strong> Počet tipov za 5 bodov</td><td>Presný výsledok v základnej časti (víťaz/remíza + oba góly)</td></tr>
                        <tr><td><strong>5.</strong> Počet tipov za 4 body</td><td>Víťaz/Remíza v základnej časti + 1 správny počet gólov</td></tr>
                        <tr><td><strong>6.</strong> Počet tipov za 3 body</td><td>Správny víťaz/remíza, bez správnych gólov</td></tr>
                        <tr><td><strong>7.</strong> Počet tipov za 1 bod</td><td>Jeden správny počet gólov</td></tr>
                    </tbody>
                </table>
                <p className={styles.note}>Ak sú hráči zhodní aj po všetkých kritériách, zdieľajú rovnaké miesto v poradí.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Príklady (základná časť)</h3>
                <p className={styles.exampleDesc}>Skutočný výsledok: <strong>Domáci 3:2 Hostia</strong></p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tip</th>
                            <th className={styles.center}>Body</th>
                            <th>Dôvod</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>3:2</td><td className={styles.center}><span className={styles.pts3}>5</span></td><td>víťaz ✓, góly domácich ✓, góly hostí ✓</td></tr>
                        <tr><td>3:1</td><td className={styles.center}><span className={styles.pts2}>4</span></td><td>víťaz ✓, góly domácich ✓, góly hostí ✗</td></tr>
                        <tr><td>2:1</td><td className={styles.center}><span className={styles.pts1}>3</span></td><td>víťaz ✓, góly ✗</td></tr>
                        <tr><td>1:2</td><td className={styles.center}><span className={styles.pts1}>1</span></td><td>víťaz ✗, góly hostí ✓</td></tr>
                        <tr><td>0:1</td><td className={styles.center}><span className={styles.pts0}>0</span></td><td>—</td></tr>
                    </tbody>
                </table>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Príklady (play-off)</h3>
                <p className={styles.exampleDesc}>Skutočný výsledok po riadnej hracej dobe: <strong>Domáci 2:1 Hostia</strong></p>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Tip</th>
                            <th className={styles.center}>Body</th>
                            <th>Dôvod</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>2:1</td><td className={styles.center}><span className={styles.pts3}>7</span></td><td>víťaz ✓, góly domácich ✓, góly hostí ✓</td></tr>
                        <tr><td>2:0</td><td className={styles.center}><span className={styles.pts2}>6</span></td><td>víťaz ✓, góly domácich ✓</td></tr>
                        <tr><td>3:0</td><td className={styles.center}><span className={styles.pts1}>5</span></td><td>víťaz ✓</td></tr>
                        <tr><td>0:1</td><td className={styles.center}><span className={styles.pts1}>1</span></td><td>góly hostí ✓</td></tr>
                        <tr><td>0:2</td><td className={styles.center}><span className={styles.pts0}>0</span></td><td>—</td></tr>
                    </tbody>
                </table>
                <p className={styles.note}>Pri play-off zápase, ktorý sa rozhodne v predĺžení/penaltách, sa tip vyhodnocuje podľa skóre po riadnej hracej dobe. Konečný výsledok (po predĺžení) je len informačný.</p>
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
                            <p>V Profile → <em>Pozvánky</em> klikni na <em>Nová pozvánka</em>. Môžeš zadať e-mail adresáta — pozvánka mu bude doručená automaticky. Bez e-mailu ti systém vygeneruje link, ktorý mu pošleš sám.</p>
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
                            <p>V zozname pozvánok vidíš, či link bol už použitý a kto sa cez neho zaregistroval. Nepoužitú pozvánku môžeš kedykoľvek zrušiť.</p>
                        </div>
                    </div>
                </div>
                <p className={styles.note}>Každý registrovaný hráč môže posielať pozvánky. Počet pozvánok nie je obmedzený.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Skupiny priateľov</h3>
                <p>Skupiny sú <strong>samostatné pre každú súťaž</strong>. Skupiny vidíš a vytváraš pre súťaž, ktorú máš práve zvolenú (Profil → Súťaže).</p>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>1</span>
                        <div>
                            <strong>Vytvor skupinu</strong>
                            <p>V Profile → Skupiny klikni na <em>Nová skupina</em>, zadaj názov a voliteľne <strong>popis / podmienku vstupu</strong>. Staneš sa zakladateľom a automaticky prvým členom.</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>2</span>
                        <div>
                            <strong>Pozvi priateľov</strong>
                            <p>V <em>Pozvánkach</em> vytvor link a pošli ho priateľovi — môžeš priamo vybrať skupinu, do ktorej sa po registrácii automaticky zaradí. Alebo cez tlačidlo <em>Pozvať zo skupiny</em> hromadne pozveš všetkých členov inej svojej skupiny (aj z iného turnaja).</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>3</span>
                        <div>
                            <strong>Schváľ žiadosti</strong>
                            <p>Ak sa niekto prihlási do skupiny sám, uvidíš jeho žiadosť a môžeš ju schváliť alebo odmietnuť (napr. až po splnení podmienky vstupu).</p>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <span className={styles.stepNum}>4</span>
                        <div>
                            <strong>Sleduj poradie</strong>
                            <p>V sekcii Poradie vidíš tabuľky všetkých svojich skupín pre aktívnu súťaž. Môžeš byť členom viacerých skupín naraz — tvoje tipy platia v každej z nich.</p>
                        </div>
                    </div>
                </div>
                <p className={styles.note}>Skupinu môže zrušiť iba jej zakladateľ. Kedykoľvek môžeš skupinu opustiť sám.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Tipovanie za odmenu</h3>
                <p>Zakladateľ skupiny môže do <strong>popisu / podmienky vstupu</strong> uviesť vlastné pravidlá — napríklad vklad do spoločného banku a rozdelenie výhry medzi najlepších tipérov. <strong>Aplikácia peniaze nespravuje</strong> — všetko si organizuje zakladateľ skupiny mimo aplikácie.</p>
                <p className={styles.exampleDesc}>Príklad popisu skupiny:</p>
                <div className={styles.exampleText}>
                    <p><em>Skupina pre skutočných tipérov.</em></p>
                    <p><strong>POSTUP:</strong></p>
                    <ol>
                        <li>Vlož 10€ na účet: SK0123456789 a do poznámky uveď svoj USERNAME</li>
                        <li>Požiadaj o vstup do skupiny</li>
                        <li>Po pripísaní platby na účet bude tvoja požiadavka schválená</li>
                    </ol>
                    <p><strong>Výhra sa delí v pomere:</strong></p>
                    <ol>
                        <li>miesto — 70%</li>
                        <li>miesto — 20%</li>
                        <li>miesto — 10%</li>
                    </ol>
                    <p>Možnosť vstupu sa uzavrie dňa DD.MM.2026.</p>
                    <p>Výhra bude pripísaná na účet, z ktorého prišla platba, do týždňa po skončení turnaja.</p>
                </div>
                <p className={styles.note}>Zakladateľ schvaľuje žiadosti o vstup ručne — môže tak počkať na splnenie podmienky (napr. pripísanie platby). Popis je viditeľný každému, kto si skupinu pozrie.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Poradie v skupinách</h3>
                <p>Hráči súťažia v skupinách priateľov. Poradie určuje celkový počet bodov zo všetkých tipovaných zápasov danej súťaže.</p>
                <p>Pri rovnosti bodov rozhoduje počet tipov s plným počtom bodov (5 resp. 7), potom s nižším počtom bodov atď.</p>
            </div>
        </>
    );
}

function TabOvladanie() {
    return (
        <>
            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Súťaže (prepínanie turnajov)</h3>
                <p>Aplikácia podporuje viacero turnajov naraz (napr. MS v hokeji, MS vo futbale). Všetky stránky zobrazujú dáta pre <strong>aktívnu súťaž</strong>.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Výber súťaže</span> — Profil → záložka <em>Súťaže</em>. Klikni na <em>Prepnúť</em> pri turnaji, ktorý chceš tipovať.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Aktívna súťaž</span> — vidíš ju ako logo a názov v hornej časti menu (sidebar). Voľba sa uloží.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Oddelené dáta</span> — zápasy, tipy, skupiny, tabuľky aj poradie sú pre každú súťaž samostatné. Prepnutím súťaže sa všetko prepne naraz.</div>
                </div>
                <p className={styles.note}>Menu a ovládanie sú rovnaké pre všetky súťaže — mení sa len obsah podľa zvoleného turnaja.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Prehľad</h3>
                <p>Úvodná obrazovka zobrazuje najdôležitejšie informácie aktívnej súťaže na jednom mieste:</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Správa organizátora</span> — aktuálny oznam (ak existuje).</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Nenatipované zápasy</span> — zápasy na dnes a zajtra bez tvojho tipu. Kliknutím otvoríš formulár na tip.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Najbližšie zápasy</span> — nadchádzajúce a live zápasy. Klik na zápas s otvoreným tipovaním = zadáš tip; klik na live alebo odohraný zápas = vidíš tipy členov tvojich skupín.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Posledné výsledky</span> — odohraté zápasy so skóre a tvojím tipom.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Poradie v skupinách</span> — skrátené tabuľky tvojich skupín (top 3 + ty).</div>
                </div>
                <p className={styles.note}>Obrazovka sa sama obnovuje — live skóre a body sa aktualizujú automaticky.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Zápasy</h3>
                <p>Zobrazuje všetky zápasy turnaja s možnosťou filtrovania a tipovania.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Filter nenatipovaných (1x2)</span> — prvé tlačidlo. Tmavé = zobrazené len zápasy bez tvojho tipu.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Filtre fázy</span> — ALL (všetko), GRP / skupiny, vyraďovacie kolá (napr. R32, R16, QF, SF, bronz, finále). Pri voľbe GRP sa zobrazí riadok skupín (A, B, C…).</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>TAB</span> — prepne na skupinové tabuľky tímov. Klikom na tím sa vrátiš na jeho zápasy.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Kalendár</span> — filter podľa dátumu. Po otvorení sa automaticky nastaví aktuálne kolo.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Vlajky tímov</span> — filter podľa tímu.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Tipovanie</span> — pri otvorených zápasoch zadáš skóre priamo na karte a potvrdíš.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Tipy skupín</span> — pri live a odohraných zápasoch rozbalíš tipy členov tvojich skupín (počas live sa zobrazujú priebežné body).</div>
                </div>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Tabuľky</h3>
                <p>Skupinové tabuľky tímov (poradie tímov v skupinách). Pri turnajoch s viacerými skupinami obsahuje aj <strong>tabuľku najlepších tretích miest</strong> (ktoré tretie tímy postupujú do vyraďovacej časti).</p>
                <p>Tú istú tabuľku otvoríš aj z obrazovky Zápasy tlačidlom <strong>TAB</strong>. Klikom na tím sa prepneš na zoznam jeho zápasov.</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Poradie</h3>
                <p>Tabuľky tvojich skupín priateľov pre aktívnu súťaž — celkové body a rozpad počtu tipov podľa získaných bodov (7-6-5-4-3-2-1-0).</p>
            </div>

            <div className={styles.card}>
                <h3 className={styles.cardTitle}>Profil</h3>
                <p>V Profile spravuješ údaje, súťaže, skupiny, pozvánky a notifikácie.</p>
                <div className={styles.guideList}>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Súťaže</span> — výber aktívneho turnaja.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Skupiny</span> — vytváranie skupín, popis/podmienka vstupu, pozývanie členov, schvaľovanie žiadostí.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Pozvánky</span> — odoslané pozvánky a tvorba nových.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Avatar a údaje</span> — fotka, meno, e-mail (potrebný pre e-mailové notifikácie), telefón, zmena hesla. <span style={{color:'#c0392b', fontWeight:600}}>Bez vyplneného e-mailu nie je možné resetovať zabudnuté heslo bez pomoci administrátora.</span></div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Notifikácie</span> — upozornenia pred zápasom, pri netipovanom zápase, po zadaní výsledku a skupinové udalosti (pozvánka do skupiny, schválenie vstupu). E-mailom aj push (Chrome, Edge, Firefox aj mobil) — push aktivuješ tlačidlom v záložke Notifikácie.</div>
                    <div className={styles.guideItem}><span className={styles.guideLabel}>Odhlásenie</span> — záložka Odhlásenie.</div>
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
