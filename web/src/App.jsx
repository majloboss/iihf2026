import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminLayout from './pages/admin/AdminLayout';
import Users from './pages/admin/Users';
import Invites from './pages/admin/Invites';

function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
}

function PrivateAdminRoute({ children }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    return children;
}

function HomeRedirect() {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/users" replace />;
    return <Navigate to="/profile" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/profile"  element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="/admin" element={
                        <PrivateAdminRoute><AdminLayout /></PrivateAdminRoute>
                    }>
                        <Route index          element={<Navigate to="users" replace />} />
                        <Route path="users"   element={<Users />} />
                        <Route path="invites" element={<Invites />} />
                    </Route>
                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
