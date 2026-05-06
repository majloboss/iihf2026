import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './UserLayout.module.css';

export default function UserLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();

    const handleLogout = () => { signOut(); navigate('/login'); };

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="IIHF 2026" />
                    <span>IIHF 2026</span>
                </div>
                <nav>
                    <NavLink to="/profile" className={({ isActive }) => isActive ? styles.active : ''}>
                        👤 Profil
                    </NavLink>
                    <NavLink to="/groups"  className={({ isActive }) => isActive ? styles.active : ''}>
                        👥 Skupiny
                    </NavLink>
                </nav>
                <button className={styles.logout} onClick={handleLogout}>Odhlásiť</button>
            </aside>
            <main className={styles.content}>
                <Outlet />
            </main>
        </div>
    );
}
