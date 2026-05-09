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
                    <NavLink to="/admin/games" className={({ isActive }) => isActive ? styles.active : ''}>
                        🏒 Zápasy
                    </NavLink>
                    <NavLink to="/admin/results" className={({ isActive }) => isActive ? styles.active : ''}>
                        ⚽ Výsledky
                    </NavLink>
                    <NavLink to="/admin/group-standings" className={({ isActive }) => isActive ? styles.active : ''}>
                        📊 Tabuľky
                    </NavLink>
                    <NavLink to="/admin/standings" className={({ isActive }) => isActive ? styles.active : ''}>
                        🏆 Skupiny
                    </NavLink>

                    <div className={styles.navSection}>Správa</div>

                    <NavLink to="/admin/invites" className={({ isActive }) => isActive ? styles.active : ''}>
                        🔗 Pozvánky
                    </NavLink>
                    <NavLink to="/admin/tools" className={({ isActive }) => isActive ? styles.active : ''}>
                        🔧 Nástroje
                    </NavLink>
                    <NavLink to="/admin/login-logs" className={({ isActive }) => isActive ? styles.active : ''}>
                        📋 Prihlásenia
                    </NavLink>
                    <NavLink to="/admin/mail-log" className={({ isActive }) => isActive ? styles.active : ''}>
                        📧 Odoslané maily
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
