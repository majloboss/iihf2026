import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
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
import UserLayout from './pages/user/UserLayout';
import Games from './pages/user/Games';
import Standings from './pages/user/Standings';
import Pravidla from './pages/user/Pravidla';

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

function HomeRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return <Navigate to="/games" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route element={<PrivateUserRoute><UserLayout /></PrivateUserRoute>}>
                        <Route path="/games"     element={<Games />} />
                        <Route path="/groups"    element={<Groups />} />
                        <Route path="/standings" element={<Standings />} />
                        <Route path="/profile"   element={<Profile />} />
                        <Route path="/groups"    element={<Navigate to="/profile" replace />} />
                        <Route path="/pravidla"  element={<Pravidla />} />
                    </Route>

                    <Route path="/admin" element={
                        <PrivateAdminRoute><AdminLayout /></PrivateAdminRoute>
                    }>
                        <Route index          element={<Navigate to="users" replace />} />
                        <Route path="users"   element={<Users />} />
                        <Route path="invites" element={<Invites />} />
                        <Route path="games"     element={<AdminGames />} />
                        <Route path="results"        element={<AdminResults />} />
                        <Route path="group-standings" element={<AdminGroupStandings />} />
                        <Route path="standings"      element={<AdminStandings />} />
                        <Route path="tools"     element={<AdminTools />} />
                    </Route>

                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
