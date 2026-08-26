import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { apiFetch } from '../../api/client';
import { getUnreadCount } from '../../api/messages';
import styles from './UserLayout.module.css';

export default function UserLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();
    const location    = useLocation();
    const [profile, setProfile] = useState(null);
    const [unread, setUnread]   = useState(0);
    const { activeCompetition, competitionEmoji } = useCompetition();

    useEffect(() => {
        apiFetch('v1/profile').then(setProfile).catch(() => {});
    }, []);

    // Počet neprečítaných správ pre badge (obnova pri zmene obrazovky + každých 30s)
    useEffect(() => {
        const fetchUnread = () => getUnreadCount().then(d => setUnread(d.unread || 0)).catch(() => {});
        fetchUnread();
        const t = setInterval(fetchUnread, 30000);
        return () => clearInterval(t);
    }, [location.pathname]);

    const handleLogout = () => { signOut(); navigate('/login'); };

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.brandLogos}>
                        <img src="/logo.png" alt="BetClub" className={styles.brandLogoBC} />
                        {activeCompetition && (
                            <img
                                src={`/logos/tournament_logo_${activeCompetition.slug}.png`}
                                alt={activeCompetition.name}
                                className={styles.brandLogoTournament}
                                onError={e => e.target.style.display = 'none'}
                            />
                        )}
                    </div>
                    {activeCompetition && (
                        <button
                            type="button"
                            className={styles.brandSwitch}
                            onClick={() => navigate('/profile?tab=sutaze')}
                            title="Prepnúť súťaž">
                            <span className={styles.brandName}>{activeCompetition.name}</span>
                            <span className={styles.brandSwitchHint}>zmeniť súťaž ▾</span>
                        </button>
                    )}
                </div>
                <nav>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_prehlad.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Prehľad
                    </NavLink>
                    <NavLink to="/games"     className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_zapasy.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Zápasy
                    </NavLink>
                    <NavLink to="/tabulky"   className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_tabulky.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Tabuľky
                    </NavLink>
                    <NavLink to="/standings" className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_skupiny.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Skupiny
                    </NavLink>
                    <NavLink to="/profile"   className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_profil.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Profil
                    </NavLink>
                    <NavLink to="/spravy"    className={({ isActive }) => isActive ? styles.active : ''}>
                        <span className={styles.iconWrap}>
                            <img src="/menu_spravy.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />
                            {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
                        </span>Správy
                    </NavLink>
                    <NavLink to="/pravidla"  className={({ isActive }) => isActive ? styles.active : ''}>
                        <img src="/menu_pravidla.png" alt="" style={{width:34,height:34,objectFit:'contain',verticalAlign:'middle',marginRight:6}} />Pravidlá
                    </NavLink>
                </nav>
                {profile && (
                    <div className={styles.userInfo}>
                        {profile.avatar
                            ? <img className={styles.avatar} src={profile.avatar} alt="" />
                            : <div className={styles.avatarPlaceholder}>{profile.username[0].toUpperCase()}</div>}
                        <span className={styles.username}>{profile.username}</span>
                    </div>
                )}
                <button className={styles.logout} onClick={handleLogout}>Odhlásiť</button>
            </aside>
            <main className={styles.content}>
                <Outlet />
            </main>
            <nav className={styles.bottomNav}>
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
                    <img src="/menu_prehlad.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                    <span className={styles.bottomNavLabel}>Prehľad</span>
                </NavLink>
                <NavLink to="/games"     className={({ isActive }) => isActive ? styles.active : ''}>
                    <img src="/menu_zapasy.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                    <span className={styles.bottomNavLabel}>Zápasy</span>
                </NavLink>
                <NavLink to="/tabulky"   className={({ isActive }) => isActive ? styles.active : ''}>
                    <img src="/menu_tabulky.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                    <span className={styles.bottomNavLabel}>Tabuľky</span>
                </NavLink>
                <NavLink to="/profile" className={({ isActive }) => [styles.profileNav, isActive ? styles.active : ''].join(' ')}>
                    <div className={styles.profileNavAvatar}>
                        {profile?.avatar
                            ? <img src={profile.avatar} alt="" className={styles.profileNavImg} />
                            : <img src="/menu_profil.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                        }
                    </div>
                    <span className={styles.bottomNavLabel}>Profil</span>
                </NavLink>
                <NavLink to="/standings" className={({ isActive }) => isActive ? styles.active : ''}>
                    <img src="/menu_skupiny.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                    <span className={styles.bottomNavLabel}>Skupiny</span>
                </NavLink>
                <NavLink to="/spravy"    className={({ isActive }) => isActive ? styles.active : ''}>
                    <span className={styles.iconWrap}>
                        <img src="/menu_spravy.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                        {unread > 0 && <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
                    </span>
                    <span className={styles.bottomNavLabel}>Správy</span>
                </NavLink>
                <NavLink to="/pravidla"  className={({ isActive }) => isActive ? styles.active : ''}>
                    <img src="/menu_pravidla.png" alt="" style={{width:30,height:30,objectFit:'contain'}} />
                    <span className={styles.bottomNavLabel}>Pravidlá</span>
                </NavLink>
            </nav>
        </div>
    );
}
