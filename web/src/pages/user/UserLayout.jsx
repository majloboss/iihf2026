import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/client';
import styles from './UserLayout.module.css';

export default function UserLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        apiFetch('v1/profile').then(setProfile).catch(() => {});
    }, []);

    const handleLogout = () => { signOut(); navigate('/login'); };

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="IIHF 2026" />
                    <span>IIHF 2026</span>
                </div>
                <nav>
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
                        🏠 Prehľad
                    </NavLink>
                    <NavLink to="/games"     className={({ isActive }) => isActive ? styles.active : ''}>
                        🏒 Zápasy
                    </NavLink>
                    <NavLink to="/tabulky"   className={({ isActive }) => isActive ? styles.active : ''}>
                        📊 Tabuľky
                    </NavLink>
                    <NavLink to="/standings" className={({ isActive }) => isActive ? styles.active : ''}>
                        👥 Skupiny
                    </NavLink>
                    <NavLink to="/profile"   className={({ isActive }) => isActive ? styles.active : ''}>
                        👤 Profil
                    </NavLink>
                    <NavLink to="/pravidla"  className={({ isActive }) => isActive ? styles.active : ''}>
                        📋 Pravidlá
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
                    <span className={styles.bottomNavIcon}>🏠</span>Prehľad
                </NavLink>
                <NavLink to="/games"     className={({ isActive }) => isActive ? styles.active : ''}>
                    <span className={styles.bottomNavIcon}>🏒</span>Zápasy
                </NavLink>
                <NavLink to="/profile"   className={({ isActive }) => isActive ? styles.active : ''}>
                    <span className={styles.bottomNavIcon}>👤</span>Profil
                </NavLink>
                <NavLink to="/standings" className={({ isActive }) => isActive ? styles.active : ''}>
                    <span className={styles.bottomNavIcon}>👥</span>Skupiny
                </NavLink>
                <NavLink to="/pravidla"  className={({ isActive }) => isActive ? styles.active : ''}>
                    <span className={styles.bottomNavIcon}>📋</span>Pravidlá
                </NavLink>
            </nav>
        </div>
    );
}
