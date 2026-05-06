import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './UserLayout.module.css';

export default function UserLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();

    return (
        <div className={styles.layout}>
            <header className={styles.header}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="IIHF 2026" />
                    <span>IIHF 2026</span>
                </div>
                <nav className={styles.nav}>
                    <NavLink to="/groups"  className={({ isActive }) => isActive ? styles.active : ''}>👥 Skupiny</NavLink>
                    <NavLink to="/profile" className={({ isActive }) => isActive ? styles.active : ''}>👤 Profil</NavLink>
                </nav>
                <button className={styles.logout} onClick={() => { signOut(); navigate('/login'); }}>Odhlásiť</button>
            </header>
            <main className={styles.content}>
                <Outlet />
            </main>
        </div>
    );
}
