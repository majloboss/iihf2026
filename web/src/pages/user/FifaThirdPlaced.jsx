import styles from './GroupStandings.module.css';
import aStyles from '../admin/AdminGroupStandings.module.css';

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];
const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;
const gdOf = t => t.gd ?? (t.gf - t.ga);
const tiebreak = (a, b) =>
    (b.pts - a.pts) || (gdOf(b) - gdOf(a)) || (b.gf - a.gf) || a.team.localeCompare(b.team);

// Zostav zoznam 12 tretích tímov. Ak existuje uložená/finalizovaná '3RD' tabuľka, použi ju.
export function computeThirds(data) {
    if (data['3P']?.length) {
        return data['3P'].map(t => ({ ...t, group: t.group_name }));
    }
    return GROUP_CODES
        .map(g => data[g]?.[2] ? { ...data[g][2], group: g } : null)
        .filter(Boolean)
        .sort(tiebreak);
}

export default function FifaThirdPlaced({ data, thirds: thirdsProp, onTeamClick, admin, finalized, onMove, onFinalize, busy, canFinalize = true }) {
    const thirds = thirdsProp ?? computeThirds(data);
    if (!thirds.length) return null;

    const move = (idx, dir) => {
        const swap = idx + dir;
        if (swap < 0 || swap >= thirds.length) return;
        onMove?.(idx, swap);
    };

    return (
        <div className={styles.groupCard}>
            <div className={styles.groupHeader} style={admin ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } : undefined}>
                <span>
                    Tretie miesta — 8 najlepších postupuje
                    {finalized && <span className={aStyles.finalBadge}>✓ Finalizovaná</span>}
                </span>
                {admin && !finalized && (
                    <button className={aStyles.btnFinalize} style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                        onClick={onFinalize} disabled={busy || !canFinalize}
                        title={!canFinalize ? 'Najprv finalizuj všetky skupiny A–L' : ''}>
                        ✓ Finalizovať
                    </button>
                )}
            </div>
            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.left}>#</th>
                            <th className={styles.left}>Tím</th>
                            <th>Z</th><th>V</th><th>R</th><th>P</th>
                            <th>GS:GP</th><th>+/-</th><th>B</th>
                            {admin && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {thirds.map((t, i) => {
                            const gd = gdOf(t);
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
                                    <td className={styles.left}>
                                        <div className={styles.teamCell}>
                                            <img src={FLAG_URL(t.team)} className={styles.flag} alt="" onError={e => e.target.style.display='none'} />
                                            {t.team}
                                            <span style={{ color: '#aaa', fontSize: '0.82em', marginLeft: 4 }}>({t.group})</span>
                                        </div>
                                    </td>
                                    <td>{t.gp}</td><td>{t.w}</td><td>{t.d}</td><td>{t.l}</td>
                                    <td>{t.gf}:{t.ga}</td>
                                    <td className={gd > 0 ? styles.pos : gd < 0 ? styles.neg : ''}>{gd > 0 ? '+' : ''}{gd}</td>
                                    <td className={styles.pts}>{t.pts}</td>
                                    {admin && (
                                        <td className={aStyles.moveCell}>
                                            <button className={aStyles.btnMove} onClick={() => move(i, -1)}
                                                disabled={finalized || i === 0 || thirds[i - 1].pts !== t.pts} title="Hore">▲</button>
                                            <button className={aStyles.btnMove} onClick={() => move(i, 1)}
                                                disabled={finalized || i === thirds.length - 1 || thirds[i + 1].pts !== t.pts} title="Dole">▼</button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
