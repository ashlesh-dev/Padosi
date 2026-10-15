import { useContext, useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';

/** The persistent sidebar + topbar shell for all logged-in pages. */
const AppShell = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/chat/unread-count');
        setUnreadCount(res.data?.unreadCount || 0);
      } catch (_err) {
        // Silently ignore
      }
    };
    fetchUnread();
    intervalId = setInterval(fetchUnread, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/app/feed', icon: '⌘', label: 'Community Feed' },
    { to: '/app/marketplace', icon: '♧', label: 'Marketplace' },
    { to: '/app/chats', icon: '💬', label: 'Chats', badge: unreadCount },
    { to: '/app/services', icon: '♡', label: 'Local Services' },
    { to: '/app/lost-found', icon: '◌', label: 'Lost & Found' },
    { to: `/app/users/${user?.id}`, icon: '👤', label: 'My Profile' },
    { to: '/app/account', icon: '⚙', label: 'Account Settings' },
  ];

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--cream)' }}>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside data-open={sidebarOpen} className="app-sidebar" style={{
        width: '240px',
        flexShrink: 0,
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : undefined,
        transition: 'transform 0.25s ease',
      }}>
        {/* Brand */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.25rem 1.5rem', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Padosi" style={{ height: '28px' }} />
          <span style={{ fontFamily: 'var(--serif)', fontSize: '1.15rem', fontWeight: '700', color: 'var(--ink)' }}>Padosi</span>
        </a>

        {/* User locality badge */}
        <div style={{ padding: '0 1.25rem 1.5rem', borderBottom: '1px solid var(--line)' }}>
          <small style={{ color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Neighborhood</small>
          <p style={{ margin: '0.25rem 0 0', fontWeight: '600', fontSize: '0.875rem', color: 'var(--ink)' }}>
            {user?.locality || 'Your Area'}
          </p>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map(({ to, icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: isActive ? '600' : '400',
                color: isActive ? 'var(--teal)' : 'var(--ink)',
                backgroundColor: isActive ? 'var(--mint)' : 'transparent',
                transition: 'background-color 0.15s, color 0.15s',
              })}
            >
              <span style={{ fontSize: '1.1rem', width: '20px', textAlign: 'center' }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  backgroundColor: 'var(--orange)',
                  color: '#fff',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '0.1rem 0.45rem',
                  lineHeight: '1.2'
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* User profile footer */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            to={`/app/users/${user?.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', flex: 1, minWidth: 0 }}
          >
            {/* Avatar: photo if available, else coloured initial */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  objectFit: 'cover', flexShrink: 0,
                  border: '2px solid var(--teal)',
                }}
              />
            ) : (
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--orange)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '0.875rem', flexShrink: 0,
                textDecoration: 'none', userSelect: 'none',
              }}>
                {user?.fullName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '0.85rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.fullName}
              </p>
              <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>View Profile</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            style={{ border: 'none', background: 'none', padding: '0.2rem', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }}
            title="Log out"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div style={{ flex: 1, marginLeft: '240px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Mobile topbar */}
        <header style={{
          display: 'none', /* shown via media query in styles below */
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
        }} className="app-topbar">
          <button onClick={() => setSidebarOpen(true)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>☰</button>
          <span style={{ fontFamily: 'var(--serif)', fontWeight: '700', color: 'var(--ink)' }}>Padosi</span>
          <span style={{ width: '32px' }} />
        </header>

        <main id="app-content" style={{ flex: 1, padding: '2rem 1.5rem', maxWidth: '100%' }}>
          <Outlet />
        </main>
      </div>

      {/* Inline media query for mobile sidebar */}
      <style>{`
        @media (max-width: 768px) {
          .app-topbar { display: flex !important; }
          aside { transform: translateX(-100%); }
          aside[data-open="true"] { transform: translateX(0); }
          div[style*="marginLeft: 240px"] { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default AppShell;
