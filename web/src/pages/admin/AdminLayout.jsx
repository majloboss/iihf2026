import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();

    const handleLogout = () => { signOut(); navigate('/login'); };

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="IIHF 2026" />
                    <span>Admin</span>
                </div>
                <nav>
                    <NavLink to="/admin/users"   className={({ isActive }) => isActive ? styles.active : ''}>
                        👤 Používatelia
                    </NavLink>
                    <NavLink to="/admin/invites" className={({ isActive }) => isActive ? styles.active : ''}>
                        🔗 Pozývacie linky
                    </NavLink>
                    <NavLink to="/admin/games" className={({ isActive }) => isActive ? styles.active : ''}>
                        🏒 Zápasy
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
