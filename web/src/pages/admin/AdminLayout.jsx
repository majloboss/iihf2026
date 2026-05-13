import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => { signOut(); navigate('/login'); };
    const close = () => setMenuOpen(false);

    return (
        <div className={styles.layout}>
            {/* Mobile top bar */}
            <div className={styles.topBar}>
                <button className={styles.hamburger} onClick={() => setMenuOpen(o => !o)}>
                    {menuOpen ? '✕' : '☰'}
                </button>
                <span className={styles.topBarTitle}>Admin</span>
                <button className={styles.topBarLogout} onClick={handleLogout}>🚪</button>
            </div>

            {/* Overlay */}
            {menuOpen && <div className={styles.overlay} onClick={close} />}

            <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.brand}>
                    <img src="/logo.png" alt="IIHF 2026" />
                    <span>Admin</span>
                </div>
                <nav>
                    <div className={styles.navSection}>Správa</div>
                    <NavLink to="/admin/users"         className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>👤 Používatelia</NavLink>
                    <NavLink to="/admin/invites"       className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>🔗 Pozvánky</NavLink>
                    <NavLink to="/admin/announcements" className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📢 Oznamy</NavLink>
                    <NavLink to="/admin/login-logs"    className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📋 Prihlásenia</NavLink>
                    <NavLink to="/admin/mail-log"      className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📧 Odoslané maily</NavLink>

                    <div className={styles.navSection}>Súťaž</div>
                    <NavLink to="/admin/games"           className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>🏒 Zápasy</NavLink>
                    <NavLink to="/admin/results"         className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>⚽ Výsledky</NavLink>
                    <NavLink to="/admin/group-standings" className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📊 Tabuľky</NavLink>
                    <NavLink to="/admin/standings"       className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>🏆 Skupiny</NavLink>

                    <div className={styles.navSection}>Systém</div>
                    <NavLink to="/admin/tools" className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>🔧 Nástroje</NavLink>
                </nav>
                <button className={styles.logout} onClick={handleLogout}>Odhlásiť</button>
            </aside>

            <main className={styles.content} onClick={() => menuOpen && close()}>
                <Outlet />
            </main>
        </div>
    );
}
