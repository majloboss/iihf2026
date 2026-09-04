import styles from './Admin.module.css';

// Zdieľaná tabuľka zápasov pre admin (IIHF aj FIFA).
// rows: pole normalizovaných objektov:
//   { key, number, phaseLabel, phaseOld, dateLocal, homeCell, awayCell, result, venue, status, flashscore_url, raw }
//
// `phaseOld` je docasny stlpec na kontrolu migracie 075: `phaseLabel` uz cita
// naviazanu fazu z ciselnika, `phaseOld` stare stlpce. Po overeni sa zmaze.
// onEdit(raw)
const STATUS_LABEL = { scheduled: 'Plánovaný', live: 'Prebieha', finished: 'Odohraný' };

export default function AdminGamesTable({ rows, onEdit }) {
    const statusClass = (s) => s === 'finished' ? styles.badgeAdmin : s === 'live' ? styles.badgeLive : styles.badge;
    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Fáza</th>
                    <th>Fáza OLD</th>
                    <th>Dátum</th>
                    <th>Domáci</th>
                    <th>Hostia</th>
                    <th>Výsledok</th>
                    <th className={styles.hideOnMobile}>Štadión</th>
                    <th>Stav</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {rows.map(r => (
                    <tr key={r.key}>
                        <td data-label="#">{r.number}</td>
                        <td data-label="Fáza">
                            {r.phaseLabel
                                ? <span className={styles.badge}>{r.phaseLabel}</span>
                                : <span style={{ color: '#ccc' }}>—</span>}
                        </td>
                        <td data-label="Fáza OLD">
                            <span className={styles.badge}
                                  style={{ opacity: 0.55 }}>{r.phaseOld}</span>
                        </td>
                        <td data-label="Dátum" style={{whiteSpace:'nowrap'}}>{r.dateLocal}</td>
                        <td data-label="Domáci">{r.homeCell}</td>
                        <td data-label="Hostia">{r.awayCell}</td>
                        <td data-label="Výsledok" style={{fontWeight:700, color: r.result ? '#28a745' : '#ccc', whiteSpace:'nowrap'}}>
                            {r.result || '—'}
                        </td>
                        <td data-label="Štadión" className={styles.hideOnMobile}
                            style={{fontSize:'0.82rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {r.venue}
                        </td>
                        <td data-label="Stav"><span className={statusClass(r.status)}>{STATUS_LABEL[r.status] || r.status}</span></td>
                        <td data-label="" style={{display:'flex', alignItems:'center', gap:16, justifyContent:'flex-end'}}>
                            {r.flashscore_url && (
                                <a href={r.flashscore_url} target="_blank" rel="noopener noreferrer" title="FlashScore">
                                    <img src="/flashscore.png" alt="FS" style={{width:18, height:18, borderRadius:4, opacity:0.85, verticalAlign:'middle'}} />
                                </a>
                            )}
                            <button className={styles.btnSmall} onClick={() => onEdit(r.raw)}>Upraviť</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
