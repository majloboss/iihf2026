import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompetitionProvider, useCompetition } from './context/CompetitionContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import Users from './pages/admin/Users';
import Invites from './pages/admin/Invites';
import AdminGames from './pages/admin/AdminGames';
import AdminResults from './pages/admin/AdminResults';
import AdminStandings from './pages/admin/AdminStandings';
import AdminGroupStandings from './pages/admin/AdminGroupStandings';
import AdminTools from './pages/admin/AdminTools';
import AdminLoginLogs from './pages/admin/AdminLoginLogs';
import AdminMailLog from './pages/admin/AdminMailLog';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import UserLayout from './pages/user/UserLayout';
import Games from './pages/user/Games';
import FifaGames from './pages/user/FifaGames';
import FifaDashboard from './pages/user/FifaDashboard';
import FifaAdminResults from './pages/admin/FifaAdminResults';
import FifaAdminGames from './pages/admin/FifaAdminGames';
import FifaAdminGroupStandings from './pages/admin/FifaAdminGroupStandings';
import GroupStandings from './pages/user/GroupStandings';
import Standings from './pages/user/Standings';
import Pravidla from './pages/user/Pravidla';
import Dashboard from './pages/user/Dashboard';

function PrivateUserRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return children;
}

function PrivateAdminRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/games" replace />;
    return children;
}

function DashboardRouter() {
    const { activeCompetition } = useCompetition();
    return activeCompetition?.slug === 'fifa2026' ? <FifaDashboard /> : <Dashboard />;
}

function GamesRouter() {
    const { activeCompetition } = useCompetition();
    return activeCompetition?.slug === 'fifa2026' ? <FifaGames /> : <Games />;
}

function AdminResultsRouter() {
    const { activeCompetition } = useCompetition();
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminResults /> : <AdminResults />;
}

function AdminGamesRouter() {
    const { activeCompetition } = useCompetition();
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminGames /> : <AdminGames />;
}

function AdminGroupStandingsRouter() {
    const { activeCompetition } = useCompetition();
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminGroupStandings /> : <AdminGroupStandings />;
}

function HomeRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return <Navigate to="/dashboard" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route element={<PrivateUserRoute><CompetitionProvider><UserLayout /></CompetitionProvider></PrivateUserRoute>}>
                        <Route path="/dashboard" element={<DashboardRouter />} />
                        <Route path="/games"     element={<GamesRouter />} />
                        <Route path="/tabulky"   element={<GroupStandings />} />
                        <Route path="/groups"    element={<Navigate to="/profile" replace />} />
                        <Route path="/standings" element={<Standings />} />
                        <Route path="/profile"   element={<Profile />} />
                        <Route path="/pravidla"  element={<Pravidla />} />
                    </Route>

                    <Route path="/admin" element={
                        <PrivateAdminRoute><CompetitionProvider><AdminLayout /></CompetitionProvider></PrivateAdminRoute>
                    }>
                        <Route index          element={<Navigate to="users" replace />} />
                        <Route path="users"   element={<Users />} />
                        <Route path="invites" element={<Invites />} />
                        <Route path="games"     element={<AdminGamesRouter />} />
                        <Route path="results"        element={<AdminResultsRouter />} />
                        <Route path="group-standings" element={<AdminGroupStandingsRouter />} />
                        <Route path="standings"      element={<AdminStandings />} />
                        <Route path="tools"     element={<AdminTools />} />
                        <Route path="login-logs" element={<AdminLoginLogs />} />
                        <Route path="mail-log"        element={<AdminMailLog />} />
                        <Route path="announcements"   element={<AdminAnnouncements />} />
                    </Route>

                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
