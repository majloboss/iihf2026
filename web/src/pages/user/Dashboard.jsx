import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { getGames } from '../../api/games';
import { useAuth } from '../../context/AuthContext';
import styles from './Dashboard.module.css';

const FLAG_URL = code => `/flags/team_flag_${code?.toLowerCase()}.png`;

const PHASE_LABEL = {
    A: 'Skupina A', B: 'Skupina B',
    QF: 'Štvrťfinále', SF: 'Semifinále', BRONZE: 'O bronz', GOLD: 'Finále',
};

function GameCard({ game }) {
    const finished = game.status === 'finished';
    const live     = game.status === 'live';
    const date = new Date(game.starts_at);
    const timeStr = date.toLocaleString('sk-SK', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`${styles.gameCard} ${finished ? styles.finished : live ? styles.live : ''}`}>
            <div className={styles.gameCardTop}>
                <span className={styles.gamePhase}>{PHASE_LABEL[game.phase] ?? game.phase}</span>
                <span className={styles.gameTime}>{live ? '🔴 LIVE' : timeStr}</span>
            </div>
            <div className={styles.gameRow}>
                <div className={styles.gameTeam}>
                    {game.team1
                        ? <><img src={FLAG_URL(game.team1)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /><span>{game.team1}</span></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
                <div className={styles.gameScore}>
                    {finished || live
                        ? <><span>{game.score1}</span><span className={styles.scoreSep}>:</span><span>{game.score2}</span></>
                        : <span className={styles.vs}>vs</span>}
                </div>
                <div className={`${styles.gameTeam} ${styles.gameTeamRight}`}>
                    {game.team2
                        ? <><span>{game.team2}</span><img src={FLAG_URL(game.team2)} className={styles.gameFlag} alt="" onError={e => e.target.style.display='none'} /></>
                        : <span className={styles.tbd}>TBD</span>}
                </div>
            </div>
            {finished && game.tip1 != null && (
                <div className={styles.gameTip}>
                    Tip: {game.tip1}:{game.tip2}
                    {game.points != null && (
                        <span className={`${styles.gamePts} ${game.points >= 3 ? styles.ptsGood : game.points > 0 ? styles.ptsMed : styles.ptsBad}`}>
                            +{game.points}b
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function StandingsCard({ group, currentUserId }) {
    const top3 = group.members.slice(0, 3);
    const myIdx = group.members.findIndex(m => m.user_id === currentUserId);
    const showMe = myIdx > 2;
    const me = showMe ? group.members[myIdx] : null;

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

export default function Dashboard() {
    const { user } = useAuth();
    const [games, setGames]         = useState([]);
    const [standings, setStandings] = useState([]);
    const [loading, setLoading]     = useState(true);

    useEffect(() => {
        Promise.all([getGames(), apiFetch('v1/standings')])
            .then(([g, s]) => { setGames(g); setStandings(s); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className={styles.loading}>Načítavam…</p>;

    const now = Date.now();
    const finished = games
        .filter(g => g.status === 'finished')
        .slice(-4).reverse();
    const upcoming = games
        .filter(g => g.status === 'scheduled' && new Date(g.starts_at).getTime() > now)
        .slice(0, 4);
    const live = games.filter(g => g.status === 'live');

    return (
        <div className={styles.wrap}>
            <div className={styles.grid}>
                <section className={styles.section}>
                    {live.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>
                                <span>🔴 Live</span>
                            </div>
                            {live.map(g => <GameCard key={g.id} game={g} />)}
                        </>
                    )}
                    {upcoming.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>
                                <span>⏰ Najbližšie zápasy</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {upcoming.map(g => <GameCard key={g.id} game={g} />)}
                        </>
                    )}
                    {finished.length > 0 && (
                        <>
                            <div className={styles.sectionHeader}>
                                <span>✅ Posledné výsledky</span>
                                <Link to="/games" className={styles.more}>Všetky →</Link>
                            </div>
                            {finished.map(g => <GameCard key={g.id} game={g} />)}
                        </>
                    )}
                    {live.length === 0 && upcoming.length === 0 && finished.length === 0 && (
                        <p className={styles.empty}>Žiadne zápasy</p>
                    )}
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span>👥 Poradie</span>
                        <Link to="/standings" className={styles.more}>Celé →</Link>
                    </div>
                    {standings.length === 0
                        ? <p className={styles.empty}>Nie si v žiadnej skupine</p>
                        : standings.map(g => <StandingsCard key={g.id} group={g} currentUserId={user?.id} />)
                    }
                </section>
            </div>
        </div>
    );
}
