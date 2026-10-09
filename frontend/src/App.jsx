import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AppShell from './pages/AppShell';
import Feed from './pages/Feed';
import Marketplace from './pages/Marketplace';
import Services from './pages/Services';
import Alerts from './pages/Alerts';
import LostFound from './pages/LostFound';
import UserProfilePage from './pages/UserProfilePage';

/** Wraps routes that require a logged-in user. */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected app shell — all dashboard routes live inside */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="feed" replace />} />
        <Route path="feed" element={<Feed />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="services" element={<Services />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="lost-found" element={<LostFound />} />
        {/* Public user profiles — accessible from anywhere inside the app shell */}
        <Route path="users/:userId" element={<UserProfilePage />} />
      </Route>
    </Routes>
  );
}

export default App;
