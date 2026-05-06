import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLayout from './pages/admin/AdminLayout';
import Users from './pages/admin/Users';
import Invites from './pages/admin/Invites';

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
    return <div style={{ padding: 32 }}>Vitaj, {user.username}! Tipovačka čoskoro...</div>;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/admin" element={
                        <PrivateAdminRoute><AdminLayout /></PrivateAdminRoute>
                    }>
                        <Route index         element={<Navigate to="users" replace />} />
                        <Route path="users"   element={<Users />} />
                        <Route path="invites" element={<Invites />} />
                    </Route>
                    <Route path="*" element={<HomeRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
