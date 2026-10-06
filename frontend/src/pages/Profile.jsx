import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <>
      <header className="site-header" style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(251, 250, 248, 0.9)', backdropFilter: 'blur(8px)', zIndex: 100 }}>
        <nav className="nav container">
          <Link className="brand" to="/">
            <img className="brand-logo" src="/logo.png" alt="Padosi logo" /><span>Padosi</span>
          </Link>
          <div className="nav-actions">
            <button onClick={handleLogout} className="button button-small" style={{ backgroundColor: 'transparent', color: 'var(--ink)', border: '1px solid var(--ink)' }}>
              Log out
            </button>
          </div>
        </nav>
      </header>

      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              backgroundColor: 'var(--orange)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 'bold'
            }}>
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-brand)', margin: 0 }}>{user.fullName}</h1>
              <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0 0' }}>{user.email}</p>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-brand)', marginBottom: '1rem' }}>Location Information</h3>
            <p><strong>Your Locality:</strong> {user.locality || 'Not specified'}</p>
            <p style={{ color: 'var(--mint)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
              Connected to neighborhood
            </p>
          </div>
        </div>
      </main>
    </>
  );
};

export default Profile;
