import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompetitionProvider, useCompetition } from './context/CompetitionContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Impersonate from './pages/Impersonate';
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
import AdminMessages from './pages/admin/AdminMessages';
import AdminCatalogs from './pages/admin/AdminCatalogs';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import UserLayout from './pages/user/UserLayout';
import Games from './pages/user/Games';
import FifaGames from './pages/user/FifaGames';
import FifaDashboard from './pages/user/FifaDashboard';
import FifaAdminResults from './pages/admin/FifaAdminResults';
import FifaAdminGames from './pages/admin/FifaAdminGames';
import FifaAdminGroupStandings from './pages/admin/FifaAdminGroupStandings';
import GroupStandings from './pages/user/GroupStandings';
import UclGames from './pages/user/UclGames';
import UclStandings from './pages/user/UclStandings';
import UclDashboard from './pages/user/UclDashboard';
import UclAdminGames from './pages/admin/UclAdminGames';
import UclAdminResults from './pages/admin/UclAdminResults';
import UclAdminStandings from './pages/admin/UclAdminStandings';
import Standings from './pages/user/Standings';
import PravidlaPublic from './pages/PravidlaPublic';
import Messages from './pages/user/Messages';
import Dashboard from './pages/user/Dashboard';

function PrivateUserRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/results" replace />;
    return children;
}

function PrivateAdminRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/games" replace />;
    return children;
}

function DashboardRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    if (activeCompetition?.slug === 'ucl2026') return <UclDashboard />;
    return activeCompetition?.slug === 'fifa2026' ? <FifaDashboard /> : <Dashboard />;
}

function GamesRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    if (activeCompetition?.slug === 'ucl2026') return <UclGames />;
    return activeCompetition?.slug === 'fifa2026' ? <FifaGames /> : <Games />;
}

function AdminResultsRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    if (activeCompetition?.slug === 'ucl2026') return <UclAdminResults />;
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminResults /> : <AdminResults />;
}

function AdminGamesRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    if (activeCompetition?.slug === 'ucl2026') return <UclAdminGames />;
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminGames /> : <AdminGames />;
}

function TabulkyRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    return activeCompetition?.slug === 'ucl2026' ? <UclStandings /> : <GroupStandings />;
}

function AdminGroupStandingsRouter() {
    const { activeCompetition, loading } = useCompetition();
    if (loading) return <NacitavamSutaz />;
    if (activeCompetition?.slug === 'ucl2026') return <UclAdminStandings />;
    return activeCompetition?.slug === 'fifa2026' ? <FifaAdminGroupStandings /> : <AdminGroupStandings />;
}

// Kým sa nevie, ktorá súťaž je aktívna, nesmie sa vykresliť žiadna z nich:
// predvolená vetva je IIHF, takže používateľ UCL uvidel na okamih hokej
// a obrazovka sa mu potom prepla. Na mobile trvá to okno dosť dlho.
function NacitavamSutaz() {
    return <p style={{ padding: 16, color: '#888' }}>Načítavam…</p>;
}

function HomeRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/results" replace />;
    return <Navigate to="/dashboard" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"           element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password"  element={<ResetPassword />} />
                    <Route path="/impersonate"     element={<Impersonate />} />
                    <Route path="/register"        element={<Register />} />

                    <Route element={<PrivateUserRoute><CompetitionProvider><UserLayout /></CompetitionProvider></PrivateUserRoute>}>
                        <Route path="/dashboard" element={<DashboardRouter />} />
                        <Route path="/games"     element={<GamesRouter />} />
                        <Route path="/tabulky"   element={<TabulkyRouter />} />
                        <Route path="/groups"    element={<Navigate to="/profile" replace />} />
                        <Route path="/standings" element={<Standings />} />
                        <Route path="/profile"   element={<Profile />} />
                        <Route path="/spravy"    element={<Messages />} />
                    </Route>

                    {/* Pravidlá sú verejné — dajú sa poslať odkazom aj neregistrovanému.
                        Trasa stojí mimo chránenej vetvy, ktorá by neprihláseného
                        poslala na login. */}
                    <Route path="/pravidla" element={<PravidlaPublic />} />

                    <Route path="/admin" element={
                        <PrivateAdminRoute><CompetitionProvider><AdminLayout /></CompetitionProvider></PrivateAdminRoute>
                    }>
                        <Route index          element={<Navigate to="results" replace />} />
                        <Route path="users"   element={<Users />} />
                        <Route path="invites" element={<Invites />} />
                        <Route path="games"     element={<AdminGamesRouter />} />
                        <Route path="results"        element={<AdminResultsRouter />} />
                        <Route path="group-standings" element={<AdminGroupStandingsRouter />} />
                        <Route path="standings"      element={<AdminStandings />} />
                        <Route path="tools"     element={<AdminTools />} />
                        <Route path="login-logs" element={<AdminLoginLogs />} />
                        <Route path="mail-log"        element={<AdminMailLog />} />
                        <Route path="messages"        element={<AdminMessages />} />
                        <Route path="catalogs"         element={<AdminCatalogs />} />
                        <Route path="announcements"   element={<AdminAnnouncements />} />
                    </Route>

                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
