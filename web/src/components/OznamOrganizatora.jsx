import { Link } from 'react-router-dom';
import styles from '../pages/user/Dashboard.module.css';

// Aktuálny oznam organizátora v prehľade, s odkazom na históriu.
//
// História patrí do Správ → Oznamy, nie do prehľadu: starých oznamov sa
// nazbiera toľko, že prehľad prestane byť prehľadom. Rovnaký blok používa
// IIHF aj FIFA, preto žije tu a nie v každom dashboarde zvlášť.
export default function OznamOrganizatora({ announcement }) {
    if (!announcement?.body) return null;

    return (
        <div className={styles.announcement}>
            <div className={styles.announcementHead}>
                <span className={styles.announcementLabel}>Správa organizátora</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={styles.announcementDate}>
                        {new Date(announcement.created_at).toLocaleDateString('sk-SK',
                            { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <Link to="/spravy?tab=organizator"
                          style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        História →
                    </Link>
                </span>
            </div>
            <div className={styles.announcementBody}>{announcement.body}</div>
        </div>
    );
}
