import React, { useContext, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosInstance';
import { uploadAvatar } from '../api/supabaseClient';

// Check Supabase is configured for uploads
const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
);

/** Circular avatar that also shows a camera-icon overlay on hover (for the profile page). */
const AvatarUpload = ({ avatarUrl, fullName, onUploadComplete }) => {
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const { user } = useContext(AuthContext);

  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';
  const displayUrl = preview || avatarUrl;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Image must be under 3 MB.');
      return;
    }

    // Local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);

    try {
      const publicUrl = await uploadAvatar(file, user.id);
      // Persist to backend
      await api.patch('/users/me/avatar', { avatarUrl: publicUrl });
      // Update AuthContext user
      onUploadComplete(publicUrl);
      setPreview(null); // let the real URL take over
    } catch (err) {
      alert('Upload failed: ' + err.message);
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      style={{ position: 'relative', width: '88px', height: '88px', flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      {displayUrl ? (
        <img
          src={displayUrl}
          alt={fullName}
          style={{
            width: '88px', height: '88px', borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid var(--teal)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          }}
        />
      ) : (
        <div style={{
          width: '88px', height: '88px', borderRadius: '50%',
          backgroundColor: 'var(--orange)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem', fontWeight: '700',
          border: '3px solid var(--teal)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
          userSelect: 'none',
        }}>
          {initial}
        </div>
      )}

      {/* Hover overlay */}
      {SUPABASE_CONFIGURED && (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: hovered || uploading ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {uploading ? (
            <span style={{ fontSize: '1.3rem' }}>⏳</span>
          ) : (
            <>
              <span style={{ fontSize: '1.3rem' }}>📷</span>
              <span style={{ fontSize: '0.58rem', color: '#fff', marginTop: '2px', fontWeight: '600', textAlign: 'center', lineHeight: 1.2 }}>
                Change<br />Photo
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

const Profile = () => {
  const { user, login, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Called after a successful avatar upload to refresh the user in context
  const handleAvatarUpdate = (newAvatarUrl) => {
    // Re-use login to update the user object in context (keeps token)
    const token = localStorage.getItem('token');
    login(token, { ...user, avatarUrl: newAvatarUrl });
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
            <AvatarUpload
              avatarUrl={user.avatarUrl}
              fullName={user.fullName}
              onUploadComplete={handleAvatarUpdate}
            />
            <div>
              <h1 style={{ fontFamily: 'var(--font-brand)', margin: 0 }}>{user.fullName}</h1>
              <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0 0' }}>{user.email}</p>
              {SUPABASE_CONFIGURED ? (
                <p style={{ color: 'var(--teal)', fontSize: '0.75rem', margin: '0.35rem 0 0', fontWeight: '600' }}>
                  Hover over photo to change it
                </p>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.72rem', margin: '0.35rem 0 0' }}>
                  Configure Supabase to enable photo upload
                </p>
              )}
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
