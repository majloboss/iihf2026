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
                    <NavLink to="/games"   className={({ isActive }) => isActive ? styles.active : ''}>
                        🏒 Zápasy
                    </NavLink>
                    <NavLink to="/groups"  className={({ isActive }) => isActive ? styles.active : ''}>
                        👥 Skupiny
                    </NavLink>
                    <NavLink to="/profile" className={({ isActive }) => isActive ? styles.active : ''}>
                        👤 Profil
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
        </div>
    );
}
