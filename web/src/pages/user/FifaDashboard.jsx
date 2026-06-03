import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFifaGames } from '../../api/fifaGames';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/fifa_flag_${code?.toLowerCase()}.png`;

const PHASE_LABEL = {
    GROUP_A:'Sk. A', GROUP_B:'Sk. B', GROUP_C:'Sk. C', GROUP_D:'Sk. D',
    GROUP_E:'Sk. E', GROUP_F:'Sk. F', GROUP_G:'Sk. G', GROUP_H:'Sk. H',
    GROUP_I:'Sk. I', GROUP_J:'Sk. J', GROUP_K:'Sk. K', GROUP_L:'Sk. L',
    R32:'R32', R16:'R16', QF:'ŠF', SF:'SF', BM:'Bronz', F:'Finále',
};

function GameCard({ game }) {
    const start    = new Date(game.start_time + 'Z');
    const finished = game.result_approved;
    const live     = !finished && start <= new Date();
    const timeStr  = start.toLocaleString('sk-SK', { day:'numeric', month:'numeric', hour:'2-digit', minute:'2-digit' });

    return (
        <div className={`${styles.gameCard} ${finished ? styles.finished : live ? styles.live : ''}`}>
            <div className={styles.gameCardTop}>
                <span className={styles.gamePhase}>{PHASE_LABEL[game.game_type_code] ?? game.game_type_code}</span>
                {live
                    ? <span className={styles.liveBadge}>LIVE</span>
                    : <span className={styles.gameTime}>{timeStr}</span>}
            </div>
            <div className={styles.gameRow}>
                <div className={styles.gameTeam}>
                    {game.home_code
                        ? <><img src={FLAG_URL(game.home_code)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /><span>{game.home_code}</span></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
                <div className={styles.gameScore}>
                    {finished && game.home_score_regular != null
                        ? <><span>{game.home_score_regular}</span><span className={styles.scoreSep}>:</span><span>{game.away_score_regular}</span></>
                        : live ? <span className={styles.vs}>LIVE</span>
                        : <span className={styles.vs}>vs</span>}
                </div>
                <div className={`${styles.gameTeam} ${styles.gameTeamRight}`}>
                    {game.away_code
                        ? <><span>{game.away_code}</span><img src={FLAG_URL(game.away_code)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
            </div>
            {game.home_score_tip != null && (
                <div className={styles.gameTip}>
                    <span className={styles.tipCheck}>✓</span> Môj tip: {game.home_score_tip}:{game.away_score_tip}
                    {game.points_earned != null && (
                        <span className={`${styles.gamePts} ${game.points_earned >= 3 ? styles.ptsGood : game.points_earned > 0 ? styles.ptsMed : styles.ptsBad}`}>
                            +{game.points_earned}b
                        </span>
                    )}
                </div>
            )}
            {!game.home_score_tip && game.tips_open && game.home_code && game.away_code && (
                <div className={`${styles.gameTip} ${styles.tipMissing}`}>
                    <Link to="/games" className={styles.tipMissingLink}>⚠ Bez tipu — zadaj tip →</Link>
                </div>
            )}
        </div>
    );
}

function StandingsCard({ group, currentUserId }) {
    const top3  = group.members.slice(0, 3);
    const myIdx = group.members.findIndex(m => m.user_id === currentUserId);
    const showMe = myIdx > 2;
    const me     = showMe ? group.members[myIdx] : null;

    const Row = ({ m, rank }) => (
        <div className={`${styles.standRow} ${m.user_id === currentUserId ? styles.standMe : ''}`}>
            <span className={`${styles.standRank} ${rank === 1 ? styles.r1 : rank === 2 ? styles.r2 : rank === 3 ? styles.r3 : ''}`}>
                {rank}.
            </span>
            <span className={styles.standPlayer}>
                {m.avatar
                    ? <img src={m.avatar} className={styles.standAvatar} alt="" />
                    : <span className={styles.standAvatarPh}>{m.username[0].toUpperCase()}</span>}
                {m.username}
            </span>
            <span className={styles.standPts}>{m.total_points}b</span>
        </div>
    );

    return (
        <div className={styles.standCard}>
            <div className={styles.standHeader}>{group.name}</div>
            <div className={styles.standBody}>
                {top3.map((m, i) => <Row key={m.user_id} m={m} rank={i + 1} />)}
                {showMe && (
                    <>
                        <div className={styles.standEllipsis}>…</div>
                        <Row m={me} rank={myIdx + 1} />
                    </>
                )}
            </div>
        </div>
    );
}

export default function FifaDashboard() {
    const { user } = useAuth();
    const { activeCompetition } = useCompetition();
    const compId = activeCompetition?.id ?? 2;
    const [games, setGames]           = useState([]);
    const [standings, setStandings]   = useState([]);
    const [announcement, setAnnouncement] = useState(null);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        Promise.all([
            getFifaGames(),
            apiFetch(`v1/standings?competition_id=${compId}`).catch(() => []),
            apiFetch('v1/announcement').catch(() => null),
        ])
            .then(([g, s, a]) => { setGames(g); setStandings(s); setAnnouncement(a); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className={styles.loading}>Načítavam…</p>;

    const now       = Date.now();
    const todayStr  = new Date().toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });
    const tomorrowStr = new Date(now + 86400000).toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });

    const finished = games.filter(g => g.result_approved).slice(-4).reverse();
    const live     = games.filter(g => !g.result_approved && new Date(g.start_time + 'Z') <= new Date());
    const upcoming = [
        ...live,
        ...games.filter(g => !g.result_approved && new Date(g.start_time + 'Z') > new Date()).slice(0, 4),
    ];
    const untipped = games.filter(g => {
        if (g.result_approved || !g.tips_open || !g.home_code || !g.away_code) return false;
        if (g.home_score_tip != null) return false;
        const start = new Date(g.start_time + 'Z');
        if (start.getTime() - now < 5 * 60000) return false;
        const dayStr = start.toLocaleDateString('sk-SK', { year:'numeric', month:'2-digit', day:'2-digit' });
        return dayStr === todayStr || dayStr === tomorrowStr;
    });

    return (
        <div className={styles.wrap}>
            {announcement && (
                <div className={styles.announcement}>
                    <div className={styles.announcementHead}>
                        <span className={styles.announcementLabel}>Správa organizátora</span>
                        <span className={styles.announcementDate}>
                            {new Date(announcement.created_at).toLocaleDateString('sk-SK', { day:'2-digit', month:'2-digit', year:'numeric' })}
                        </span>
                    </div>
                    <div className={styles.announcementBody}>{announcement.body}</div>
                </div>
            )}

            {untipped.length > 0 && (
                <section className={`${styles.section} ${styles.untippedSection}`}>
                    <div className={`${styles.sectionHeader} ${styles.sHUntipped}`}>
                        <span>Nenatipované zápasy</span>
                        <Link to="/games" className={styles.more}>Všetky →</Link>
                    </div>
                    {untipped.map(g => <GameCard key={g.game_id} game={g} />)}
                </section>
            )}

            <div className={styles.grid}>
                <section className={styles.section}>
                    {upcoming.length > 0 && (
                        <>
                            <div className={`${styles.sectionHeader} ${live.length > 0 ? styles.sHLive : styles.sHUpcoming}`}>
                                <span>Najbližšie zápasy</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {upcoming.map(g => <GameCard key={g.game_id} game={g} />)}
                        </>
                    )}
                    {finished.length > 0 && (
                        <>
                            <div className={`${styles.sectionHeader} ${styles.sHFinished}`}>
                                <span>Posledné výsledky</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {finished.map(g => <GameCard key={g.game_id} game={g} />)}
                        </>
                    )}
                    {upcoming.length === 0 && finished.length === 0 && (
                        <p className={styles.empty}>Žiadne zápasy</p>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={`${styles.sectionHeader} ${styles.sHStandings}`}>
                        <span>Poradie v skupinách</span>
                        <Link to="/standings" className={styles.more}>Celé →</Link>
                    </div>
                    {standings.length === 0
                        ? <p className={styles.empty}>Nie si v žiadnej skupine</p>
                        : standings.map(g => <StandingsCard key={g.id} group={g} currentUserId={user?.user_id} />)
                    }
                </section>
            </div>
        </div>
    );
}
