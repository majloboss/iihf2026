import { Link } from 'react-router-dom';
import styles from '../pages/user/Dashboard.module.css';

// Oznamy organizátora v prehľade, s odkazom na históriu.
//
// Zobrazuje sa ich viac naraz — ktoré, riadi `show_dashboard` v číselníku
// oznamov. Ostatné zostávajú v Správach → Oznamy: starých sa nazbiera toľko,
// že by prehľad prestal byť prehľadom.
//
// Rovnaký blok používa IIHF, FIFA aj UCL, preto žije tu a nie v každom
// dashboarde zvlášť.
export default function OznamOrganizatora({ announcement }) {
    // Endpoint vracia pole; staršie volanie mohlo vrátiť jediný oznam.
    const oznamy = (Array.isArray(announcement) ? announcement
                    : announcement ? [announcement] : [])
                   .filter(o => o?.body);

    if (!oznamy.length) return null;

    const historia = (
        <Link to="/spravy?tab=organizator"
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            História →
        </Link>
    );

    return (
        // Dva stĺpce na širokej obrazovke, pod 700 px jeden pod druhým.
        <div style={{
            display: 'grid',
            gridTemplateColumns: oznamy.length > 1
                ? 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))'
                : '1fr',
            gap: 10,
        }}>
            {oznamy.map((o, i) => (
                <div key={o.id ?? i} className={styles.announcement}>
                    <div className={styles.announcementHead}>
                        <span className={styles.announcementLabel}>Správa organizátora</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className={styles.announcementDate}>
                                {new Date(o.created_at).toLocaleDateString('sk-SK',
                                    { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            {/* Odkaz stačí pri prvom — inak by sa opakoval. */}
                            {i === 0 && historia}
                        </span>
                    </div>
                    <div className={styles.announcementBody}>{o.body}</div>
                </div>
            ))}
        </div>
    );
}
