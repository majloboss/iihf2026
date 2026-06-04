import styles from './GroupStandings.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;

// data = { A: [...teams ordered by rank], B: [...], ... }
// Zoberie 3. tím z každej skupiny, zoradí podľa B → +/- → GS → tím.
// Prvých 8 postupuje do Round of 32.
export default function FifaThirdPlaced({ data, onTeamClick }) {
    const thirds = GROUP_CODES
        .map(g => data[g]?.[2] ? { ...data[g][2], group: g } : null)
        .filter(Boolean)
        .sort((a, b) =>
            (b.pts - a.pts) ||
            ((b.gd ?? (b.gf - b.ga)) - (a.gd ?? (a.gf - a.ga))) ||
            (b.gf - a.gf) ||
            a.team.localeCompare(b.team)
        );

    if (thirds.length === 0) return null;

    return (
        <div className={styles.groupCard}>
            <div className={styles.groupHeader}>Tretie miesta — 8 najlepších postupuje</div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.left}>#</th>
                            <th>Sk.</th>
                            <th className={styles.left}>Tím</th>
                            <th>Z</th><th>V</th><th>R</th><th>P</th>
                            <th>GS:GP</th><th>+/-</th><th>B</th>
                        </tr>
                    </thead>
                    <tbody>
                        {thirds.map((t, i) => {
                            const gd = t.gd ?? (t.gf - t.ga);
                            return (
                                <tr key={t.team}
                                    className={[
                                        i < 8 ? styles.qualified : '',
                                        i === 7 ? styles['last-qualified'] : '',
                                        onTeamClick ? styles.teamRow : ''
                                    ].join(' ')}
                                    onClick={() => onTeamClick?.(t.team)}
                                >
                                    <td className={styles.left}><span className={styles.rank}>{i + 1}.</span></td>
                                    <td><strong>{t.group}</strong></td>
                                    <td className={styles.left}>
                                        <div className={styles.teamCell}>
                                            <img src={FLAG_URL(t.team)} className={styles.flag} alt="" onError={e => e.target.style.display='none'} />
                                            {t.team}
                                        </div>
                                    </td>
                                    <td>{t.gp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                                    <td>{t.gf}:{t.ga}</td>
                                    <td className={gd > 0 ? styles.pos : gd < 0 ? styles.neg : ''}>{gd > 0 ? '+' : ''}{gd}</td>
                                    <td className={styles.pts}>{t.pts}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
