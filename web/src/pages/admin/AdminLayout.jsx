import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompetition } from '../../context/CompetitionContext';
import { getAdminUnread } from '../../api/messages';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
    const { signOut } = useAuth();
    const navigate    = useNavigate();
    const location    = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [unread, setUnread]     = useState(0);
    const { competitions, activeCompetition, switchCompetition } = useCompetition();

    useEffect(() => {
        const f = () => getAdminUnread().then(d => setUnread(d.unread || 0)).catch(() => {});
        f();
        const t = setInterval(f, 30000);
        return () => clearInterval(t);
    }, [location.pathname]);

    const handleLogout = () => { signOut(); navigate('/login'); };
    const close = () => setMenuOpen(false);

    const onSwitchComp = async (e) => {
        const id = parseInt(e.target.value);
        if (id && id !== activeCompetition?.id) await switchCompetition(id);
    };

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
                    <img src="/logo.png" alt="BetClub" />
                    <span>Admin</span>
                </div>
                {competitions.length > 0 && (
                    <div className={styles.compSwitch}>
                        <label className={styles.compLabel}>Súťaž</label>
                        <select className={styles.compSelect} value={activeCompetition?.id ?? ''} onChange={onSwitchComp}>
                            {competitions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                )}
                <nav>
                    <div className={styles.navSection}>Správa</div>
                    <NavLink to="/admin/users"         className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>👤 Používatelia</NavLink>
                    <NavLink to="/admin/invites"       className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>🔗 Pozvánky</NavLink>
                    <NavLink to="/admin/announcements" className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📢 Oznamy</NavLink>
                    <NavLink to="/admin/login-logs"    className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📋 Prihlásenia</NavLink>
                    <NavLink to="/admin/mail-log"      className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>📧 Odoslané maily</NavLink>
                    <NavLink to="/admin/messages"      className={({ isActive }) => isActive ? styles.active : ''} onClick={close}>
                        💬 Správy {unread > 0 && <span className={styles.navBadge}>{unread > 9 ? '9+' : unread}</span>}
                    </NavLink>

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
