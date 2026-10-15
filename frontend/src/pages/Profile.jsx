import React, { useContext, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { uploadAvatar } from '../api/supabaseClient';

// Check Supabase is configured for uploads
const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
);

const BUSINESS_CATEGORIES = [
  'Restaurant', 'Cafe / Bakery', 'Grocery Store', 'Barber / Salon',
  'Medical / Pharmacy', 'Dance Studio', 'Gym / Fitness', 'Retail Shop',
  'Real Estate', 'Education / Tutor', 'Professional Services', 'Events',
  'Other',
];

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

// ─── Business Profile Section ──────────────────────────────────────────────────

const BusinessProfileSection = ({ user, onUpdate }) => {
  const isBusiness = user.accountType === 'BUSINESS';
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    accountType:      user.accountType || 'PERSONAL',
    companyName:      user.companyName || '',
    businessCategory: user.businessCategory || '',
    businessBio:      user.businessBio || '',
    businessContact:  user.businessContact || '',
    businessWebsite:  user.businessWebsite || '',
  });

  const handleChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleToggleBusiness = () => {
    const newType = form.accountType === 'BUSINESS' ? 'PERSONAL' : 'BUSINESS';
    setForm(f => ({ ...f, accountType: newType }));
    if (!editing) setEditing(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.patch('/users/me/business', form);
      onUpdate(res.data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🏢</span>
          <h3 style={{ fontFamily: 'var(--font-brand)', margin: 0, fontSize: '1rem' }}>
            Professional / Business Account
          </h3>
          {isBusiness && (
            <span style={{
              background: 'linear-gradient(135deg, #0d9488, #065f46)',
              color: '#fff', fontSize: '0.65rem', fontWeight: '700',
              padding: '0.18rem 0.55rem', borderRadius: '999px',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              ✓ Active
            </span>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              fontSize: '0.8rem', color: 'var(--teal)', background: 'none',
              border: '1px solid var(--teal)', borderRadius: '0.4rem',
              padding: '0.3rem 0.75rem', cursor: 'pointer', fontWeight: '600',
            }}
          >
            {isBusiness ? 'Edit Details' : 'Upgrade Account'}
          </button>
        )}
      </div>

      {/* Summary when not editing */}
      {!editing && isBusiness && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem' }}>
          {user.companyName && <p style={{ margin: 0 }}><strong>Company:</strong> {user.companyName}</p>}
          {user.businessCategory && <p style={{ margin: 0 }}><strong>Category:</strong> {user.businessCategory}</p>}
          {user.businessBio && <p style={{ margin: 0, color: 'var(--muted)', fontStyle: 'italic' }}>"{user.businessBio}"</p>}
          {user.businessContact && <p style={{ margin: 0 }}><strong>Contact:</strong> {user.businessContact}</p>}
          {user.businessWebsite && <p style={{ margin: 0 }}><strong>Website:</strong> <a href={user.businessWebsite} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)' }}>{user.businessWebsite}</a></p>}
        </div>
      )}

      {!editing && !isBusiness && (
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: 0 }}>
          Upgrade to a <strong>Professional Account</strong> to get a verified badge on your profile and posts, and unlock ad posting to reach neighbours in your area.
        </p>
      )}

      {/* Edit form */}
      {editing && (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Toggle switch */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: form.accountType === 'BUSINESS' ? '#ccfbf1' : 'var(--cream)',
            borderRadius: '0.6rem',
            border: `1.5px solid ${form.accountType === 'BUSINESS' ? 'var(--teal)' : '#e5e7eb'}`,
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <div
              onClick={handleToggleBusiness}
              style={{
                width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: form.accountType === 'BUSINESS' ? 'var(--teal)' : '#d1d5db',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
              }}
            >
              <div style={{
                position: 'absolute', top: '2px',
                left: form.accountType === 'BUSINESS' ? '22px' : '2px',
                width: '20px', height: '20px', borderRadius: '50%',
                backgroundColor: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem' }}>
                {form.accountType === 'BUSINESS' ? '✓ Professional / Business Account enabled' : 'Enable Professional Account'}
              </p>
              <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                Get a badge on your profile and unlock ad posting
              </p>
            </div>
          </label>

          {/* Business fields — shown only when BUSINESS is selected */}
          {form.accountType === 'BUSINESS' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--muted)' }}>
                  Company / Brand Name *
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  placeholder="e.g. Sharma's Bakery"
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--muted)' }}>
                  Business Category *
                </label>
                <select
                  value={form.businessCategory}
                  onChange={e => handleChange('businessCategory', e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid #ddd', fontSize: '0.9rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select a category --</option>
                  {BUSINESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--muted)' }}>
                  Business Bio / Tagline
                </label>
                <textarea
                  value={form.businessBio}
                  onChange={e => handleChange('businessBio', e.target.value)}
                  placeholder="A short description of your business (max 800 characters)"
                  rows={3}
                  maxLength={800}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid #ddd', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--muted)' }}>
                  Business Contact (phone / email)
                </label>
                <input
                  type="text"
                  value={form.businessContact}
                  onChange={e => handleChange('businessContact', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem', color: 'var(--muted)' }}>
                  Business Website
                </label>
                <input
                  type="url"
                  value={form.businessWebsite}
                  onChange={e => handleChange('businessWebsite', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.4rem', border: '1px solid #ddd', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>
            </>
          )}

          {error && <p style={{ color: '#be123c', fontSize: '0.82rem', margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => { setEditing(false); setError(''); setForm({
                accountType: user.accountType || 'PERSONAL',
                companyName: user.companyName || '',
                businessCategory: user.businessCategory || '',
                businessBio: user.businessBio || '',
                businessContact: user.businessContact || '',
                businessWebsite: user.businessWebsite || '',
              }); }}
              style={{
                flex: 1, padding: '0.55rem', borderRadius: '0.4rem',
                border: '1px solid var(--line)', background: '#fff',
                cursor: 'pointer', fontSize: '0.875rem',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2, padding: '0.55rem', borderRadius: '0.4rem',
                border: 'none',
                background: saving ? '#9ca3af' : 'linear-gradient(135deg, var(--teal), #065f46)',
                color: '#fff', cursor: saving ? 'default' : 'pointer',
                fontSize: '0.875rem', fontWeight: '700',
              }}
            >
              {saving ? 'Saving…' : 'Save Business Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Main Profile Page ─────────────────────────────────────────────────────────

const Profile = () => {
  const { user, login } = useContext(AuthContext);

  // Called after a successful avatar upload to refresh the user in context
  const handleAvatarUpdate = (newAvatarUrl) => {
    const token = localStorage.getItem('token');
    login(token, { ...user, avatarUrl: newAvatarUrl });
  };

  // Called after saving business profile to sync the updated user in context
  const handleBusinessUpdate = (updatedUser) => {
    const token = localStorage.getItem('token');
    login(token, { ...user, ...updatedUser });
  };

  if (!user) return null;

  return (
    <section className="container" style={{ paddingTop: '0.5rem', paddingBottom: '2rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '1rem', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '760px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: 'var(--font-brand)', margin: '0 0 1.5rem', fontSize: '1.5rem' }}>Account Settings</h1>

          {/* Avatar + name row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
            <AvatarUpload
              avatarUrl={user.avatarUrl}
              fullName={user.fullName}
              onUploadComplete={handleAvatarUpdate}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-brand)', margin: 0, fontSize: '1.3rem' }}>{user.fullName}</h2>
                {user.accountType === 'BUSINESS' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    background: 'linear-gradient(135deg, #0d9488, #065f46)',
                    color: '#fff', fontSize: '0.65rem', fontWeight: '700',
                    padding: '0.2rem 0.55rem', borderRadius: '999px',
                    letterSpacing: '0.04em',
                  }}>
                    🏢 Professional Account
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>@{user.handle || user.email}</p>
              <p style={{ color: 'var(--muted)', margin: '0.1rem 0 0 0', fontSize: '0.8rem' }}>{user.email}</p>
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

          {/* Location */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
            <h3 style={{ fontFamily: 'var(--font-brand)', marginBottom: '1rem', fontSize: '1rem' }}>Location Information</h3>
            <p><strong>Your Locality:</strong> {user.locality || 'Not specified'}</p>
            <p style={{ color: 'var(--mint)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
              Connected to neighborhood
            </p>
          </div>

          {/* Business Profile Section */}
          <BusinessProfileSection user={user} onUpdate={handleBusinessUpdate} />
      </div>
    </section>
  );
};

export default Profile;
