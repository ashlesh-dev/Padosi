import { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { uploadLostFoundImage } from '../api/supabaseClient';

const clampRadiusKm = (value) => {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, n));
};

// ─── Formatters & Helpers ───────────────────────────────────────────────────

/** Relative time formatting matching Padosi standard */
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/** Formatted date string for modal and detailed view */
const formatFullDate = (iso) => {
  if (!iso) return 'Date not specified';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const KIND_META = {
  LOST: {
    bg: '#fff7ed',
    border: '#fed7aa',
    color: '#c2410c',
    badgeBg: '#ffedd5',
    emoji: '🔍',
    label: 'LOST',
    emptyTitle: 'No Lost Items Reported',
    emptyDesc: 'There are currently no lost item notices in your neighborhood.',
  },
  FOUND: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    color: 'var(--teal)',
    badgeBg: 'var(--mint)',
    emoji: '✅',
    label: 'FOUND',
    emptyTitle: 'No Found Items Reported',
    emptyDesc: 'There are currently no found item notices in your neighborhood.',
  },
};

// ─── Shared Item Card Component ─────────────────────────────────────────────

const LostFoundCard = ({ item, onViewDetails, onMessageReporter, onResolve, isMessaging, isResolving, currentUserId }) => {
  const [imageError, setImageError] = useState(false);
  const normalizedKind = item.kind?.toUpperCase() === 'FOUND' ? 'FOUND' : 'LOST';
  const meta = KIND_META[normalizedKind];

  const handleKeyDown = (e) => {
    if (e.target !== e.currentTarget && e.target.closest('button')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onViewDetails(item);
    }
  };

  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={`View details for ${meta.label.toLowerCase()} item: ${item.title}`}
      onClick={() => onViewDetails(item)}
      onKeyDown={handleKeyDown}
      className="lf-card"
      style={{
        backgroundColor: '#fff',
        borderRadius: '0.875rem',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 6px rgba(16, 41, 70, 0.04)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Top Media Section */}
      <div
        style={{
          width: '100%',
          height: '180px',
          backgroundColor: 'var(--cream)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {item.imageUrl && !imageError ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
            }}
            className="lf-card-img"
          />
        ) : (
          /* Graceful Missing Image / Error Fallback */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              color: 'var(--muted)',
              padding: '1rem',
              textAlign: 'center',
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, var(--cream) 0%, ${meta.badgeBg} 100%)`,
            }}
          >
            <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{meta.emoji}</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: meta.color,
              }}
            >
              {meta.label} NOTICE
            </span>
          </div>
        )}

        {/* Status Badge overlay */}
        <div
          style={{
            position: 'absolute',
            top: '0.75rem',
            left: '0.75rem',
            backgroundColor: meta.badgeBg,
            color: meta.color,
            border: `1px solid ${meta.border}`,
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: '800',
            letterSpacing: '0.06em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>

        {/* Item Status (OPEN / RESOLVED) badge if present */}
        {item.status && item.status.toUpperCase() !== 'OPEN' && (
          <div
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              backgroundColor: '#e2e8f0',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '0.25rem 0.55rem',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {item.status}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        style={{
          padding: '1.15rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
          gap: '0.85rem',
        }}
      >
        <div>
          {/* Header row: Relative time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--muted)',
                fontWeight: '500',
              }}
            >
              {item.createdAt ? timeAgo(item.createdAt) : ''}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--teal)',
                fontWeight: '600',
              }}
            >
              {item.localityName || 'Hyperlocal'}
            </span>
          </div>

          {/* Title */}
          <h3
            style={{
              margin: '0 0 0.45rem',
              fontSize: '1.08rem',
              fontWeight: '700',
              color: 'var(--ink)',
              lineHeight: 1.35,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: 'var(--muted)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {item.description || 'No additional description provided.'}
          </p>
        </div>

        {/* Location & Reporter Info */}
        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          {item.placeHint && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: 'var(--ink)',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={item.placeHint}
            >
              <span style={{ color: 'var(--orange)', flexShrink: 0 }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.placeHint}
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--muted)',
            }}
          >
            <span>
              By <strong style={{ color: 'var(--ink)' }}>{item.reporterName || 'Neighbor'}</strong>
            </span>

            {/* View Details CTA */}
            <span
              style={{
                color: 'var(--teal)',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              Details &rarr;
            </span>
          </div>
          <button
            type="button"
            disabled={!item.reporterId || item.reporterId === currentUserId || isMessaging}
            onClick={(event) => { event.stopPropagation(); onMessageReporter(item); }}
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.6rem 0.8rem', border: 'none', borderRadius: '0.5rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: item.reporterId && !isMessaging ? 'pointer' : 'not-allowed', opacity: item.reporterId ? 1 : 0.55 }}
          >
            {item.reporterId === currentUserId ? 'Your report' : isMessaging ? 'Opening chat…' : 'Message Reporter'}
          </button>
          {item.reporterId === currentUserId && (
            <button
              type="button"
              disabled={isResolving}
              onClick={(event) => { event.stopPropagation(); onResolve(item); }}
              style={{ width: '100%', marginTop: '0.55rem', padding: '0.6rem 0.8rem', border: '1px solid var(--teal)', borderRadius: '0.5rem', background: '#fff', color: 'var(--teal)', fontWeight: 700, cursor: isResolving ? 'wait' : 'pointer' }}
            >
              {isResolving ? 'Removing listing…' : item.kind?.toUpperCase() === 'FOUND' ? '✓ Mark as collected' : '✓ Mark as found'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// ─── Item Details Modal ──────────────────────────────────────────────────────

const LostFoundDetailModal = ({ item, onClose, onMessageReporter, isMessaging, currentUserId }) => {
  const [imageError, setImageError] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    // Focus close button on mount
    closeButtonRef.current?.focus();

    // Escape key closes modal
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const normalizedKind = item.kind?.toUpperCase() === 'FOUND' ? 'FOUND' : 'LOST';
  const meta = KIND_META[normalizedKind];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lf-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(16, 41, 70, 0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(16, 41, 70, 0.25)',
          animation: 'modalSlideUp 0.22s ease-out',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                backgroundColor: meta.badgeBg,
                color: meta.color,
                border: `1px solid ${meta.border}`,
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: '800',
                letterSpacing: '0.06em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </span>
            {item.status && (
              <span
                style={{
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}
              >
                Status: {item.status}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
          {item.reporterId && <button type="button" disabled={isMessaging || item.reporterId === currentUserId} onClick={() => onMessageReporter(item)} style={{ padding: '0.6rem 1rem', backgroundColor: 'var(--teal)', color: '#fff', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: isMessaging ? 'wait' : 'pointer', opacity: item.reporterId === currentUserId ? 0.55 : 1 }}>{item.reporterId === currentUserId ? 'Your report' : isMessaging ? 'Opening chat…' : 'Message Reporter'}</button>}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close details dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--muted)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cream)';
              e.currentTarget.style.color = 'var(--ink)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            &times;
          </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {/* Image Display */}
          {item.imageUrl && !imageError ? (
            <div
              style={{
                width: '100%',
                maxHeight: '340px',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                marginBottom: '1.25rem',
                backgroundColor: 'var(--cream)',
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                onError={() => setImageError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                height: '120px',
                borderRadius: '0.75rem',
                marginBottom: '1.25rem',
                background: `linear-gradient(135deg, var(--cream) 0%, ${meta.badgeBg} 100%)`,
                border: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>{meta.emoji}</span>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: meta.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                No Photo Provided
              </span>
            </div>
          )}

          {/* Title */}
          <h2
            id="lf-modal-title"
            style={{
              margin: '0 0 0.75rem',
              fontFamily: 'var(--serif)',
              fontSize: '1.5rem',
              color: 'var(--ink)',
              lineHeight: 1.3,
            }}
          >
            {item.title}
          </h2>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4
              style={{
                margin: '0 0 0.35rem',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--muted)',
              }}
            >
              Description
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {item.description || 'No detailed description provided for this notice.'}
            </p>
          </div>

          {/* Information Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              backgroundColor: 'var(--cream)',
              padding: '1rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--line)',
            }}
          >
            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  fontWeight: '700',
                }}
              >
                📍 Location / Spot Hint
              </span>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.9rem',
                  color: 'var(--ink)',
                  fontWeight: '600',
                }}
              >
                {item.placeHint || 'Not specified'}
              </p>
            </div>

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  fontWeight: '700',
                }}
              >
                🏘️ Locality
              </span>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.9rem',
                  color: 'var(--ink)',
                  fontWeight: '600',
                }}
              >
                {item.localityName || 'Hyperlocal Neighborhood'}
              </p>
            </div>

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  fontWeight: '700',
                }}
              >
                👤 Reported By
              </span>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.9rem',
                  color: 'var(--ink)',
                  fontWeight: '600',
                }}
              >
                {item.reporterName || 'Neighbor'}
              </p>
            </div>

            <div>
              <span
                style={{
                  display: 'block',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                  fontWeight: '700',
                }}
              >
                🗓️ Reported Date
              </span>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.9rem',
                  color: 'var(--ink)',
                  fontWeight: '600',
                }}
              >
                {formatFullDate(item.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#fff',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.6rem 1.4rem',
              backgroundColor: 'var(--ink)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Loading Skeleton Component ─────────────────────────────────────────────

const CardSkeleton = () => (
  <div
    style={{
      backgroundColor: '#fff',
      borderRadius: '0.875rem',
      border: '1px solid var(--line)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <div style={{ height: '180px' }} className="lf-skel" />
    <div style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ width: '40%', height: '14px', borderRadius: '4px' }} className="lf-skel" />
      <div style={{ width: '85%', height: '20px', borderRadius: '4px' }} className="lf-skel" />
      <div style={{ width: '100%', height: '14px', borderRadius: '4px' }} className="lf-skel" />
      <div style={{ width: '65%', height: '14px', borderRadius: '4px' }} className="lf-skel" />
    </div>
  </div>
);

// ─── Report Lost / Found Item Modal ─────────────────────────────────────────

const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
);

const ReportItemModal = ({ user, onClose, onCreated }) => {
  const [kind, setKind] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [placeHint, setPlaceHint] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image must be under 5 MB.');
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validate = () => {
    const errors = {};
    if (!kind) errors.kind = 'Please choose Lost or Found.';
    if (!title.trim()) errors.title = 'Item name is required.';
    else if (title.trim().length > 150) errors.title = 'Item name must be under 150 characters.';
    if (placeHint.trim().length > 200) errors.placeHint = 'Location hint must be under 200 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      let imageUrl;
      if (imageFile) {
        if (!SUPABASE_CONFIGURED) {
          setErrorMsg('Image upload is not configured. You can still submit without a photo, or add Supabase keys in frontend/.env.');
          setIsSubmitting(false);
          return;
        }
        imageUrl = await uploadLostFoundImage(imageFile, user?.id);
      }

      const res = await api.post('/alerts/lost-found', {
        kind,
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        placeHint: placeHint.trim() || undefined,
        imageUrl,
      });
      onCreated(res.data);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors && typeof apiErrors === 'object' && Object.keys(apiErrors).length > 0) {
        setFieldErrors(apiErrors);
        setErrorMsg(err.response?.data?.message || 'Please fix the highlighted fields.');
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Could not submit this report. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const kindMeta = kind ? KIND_META[kind] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lf-report-title"
      onClick={() => { if (!isSubmitting) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(16, 41, 70, 0.72)',
        backdropFilter: 'blur(3px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#fff',
          borderRadius: '1rem',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(16, 41, 70, 0.25)',
          animation: 'modalSlideUp 0.22s ease-out',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 id="lf-report-title" style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: '1.35rem', color: 'var(--ink)' }}>
            {kind ? `Report a ${kindMeta.label.toLowerCase()} item` : 'Report an Item'}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cancel report"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              color: 'var(--muted)',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
            }}
          >
            &times;
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {errorMsg && (
            <div
              role="alert"
              style={{
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '0.75rem 0.9rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {errorMsg}
            </div>
          )}

          {!kind ? (
            <div>
              <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.92rem' }}>
                  What would you like to report?
              </p>
              {fieldErrors.kind && (
                <p style={{ color: '#b91c1c', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>{fieldErrors.kind}</p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {['LOST', 'FOUND'].map((option) => {
                  const meta = KIND_META[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => { setKind(option); setFieldErrors((prev) => ({ ...prev, kind: undefined })); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        padding: '1rem 1.1rem',
                        backgroundColor: meta.bg,
                        border: `1.5px solid ${meta.border}`,
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '1.6rem' }}>{meta.emoji}</span>
                      <span>
                        <strong style={{ display: 'block', color: meta.color, fontSize: '1rem' }}>
                          {option === 'LOST' ? 'I Lost an Item' : 'I Found an Item'}
                        </strong>
                        <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                          {option === 'LOST'
                            ? 'Ask neighbours to help you recover something missing.'
                            : 'Let the owner know you found something nearby.'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <button
                type="button"
                onClick={() => setKind(null)}
                disabled={isSubmitting}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: 'var(--teal)',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  padding: 0,
                  fontSize: '0.85rem',
                }}
              >
                ← Change report type
              </button>

              <div>
                <label htmlFor="lf-title" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  Item name
                </label>
                <input
                  id="lf-title"
                  required
                  type="text"
                  maxLength={150}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === 'LOST' ? 'e.g. Black umbrella' : 'e.g. Set of keys'}
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${fieldErrors.title ? '#fca5a5' : 'var(--line)'}`,
                    fontFamily: 'var(--sans)',
                  }}
                />
                {fieldErrors.title && <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>{fieldErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="lf-desc" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  Description
                </label>
                <textarea
                  id="lf-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Colour, brand, distinguishing marks…"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--line)',
                    resize: 'vertical',
                    fontFamily: 'var(--sans)',
                  }}
                />
              </div>

              <div>
                <label htmlFor="lf-category" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>Category</label>
                <select id="lf-category" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '0.5rem', border: '1px solid var(--line)', fontFamily: 'var(--sans)' }}>
                  {['OTHER', 'DOCUMENTS', 'ELECTRONICS', 'KEYS', 'CLOTHING', 'BAGS', 'PETS', 'JEWELLERY', 'ACCESSORIES'].map((option) => <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="lf-place" style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  Location where it was {kind === 'LOST' ? 'lost' : 'found'}
                </label>
                <input
                  id="lf-place"
                  type="text"
                  maxLength={200}
                  value={placeHint}
                  onChange={(e) => setPlaceHint(e.target.value)}
                  placeholder="e.g. Near the society gate / Andheri station east exit"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.8rem',
                    borderRadius: '0.5rem',
                    border: `1px solid ${fieldErrors.placeHint ? '#fca5a5' : 'var(--line)'}`,
                    fontFamily: 'var(--sans)',
                  }}
                />
                {fieldErrors.placeHint && (
                  <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '0.35rem 0 0' }}>{fieldErrors.placeHint}</p>
                )}
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Distance filtering uses your saved neighbourhood location
                  {user?.locality ? ` (${user.locality})` : ''}. Exact coordinates are not collected here.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  Photo (optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                />
                {imagePreview && (
                  <div style={{ position: 'relative', marginTop: '0.75rem' }}>
                    <img
                      src={imagePreview}
                      alt="Selected item preview"
                      style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '0.6rem' }}
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={isSubmitting}
                      aria-label="Remove photo"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        color: '#fff',
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                {!SUPABASE_CONFIGURED && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.4rem 0 0' }}>
                    Photo upload needs Supabase keys in frontend/.env. You can still submit without a photo.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '0.65rem 1.1rem',
                    background: '#fff',
                    border: '1.5px solid var(--line)',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.65rem 1.2rem',
                    backgroundColor: 'var(--teal)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const RadiusSlider = ({ value, onChange }) => (
  <div style={{ flex: '1 1 100%', minWidth: '220px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
      <label htmlFor="lf-radius" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--ink)' }}>
        Distance from your neighbourhood
      </label>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--teal)' }}>
        Within {value} km
      </span>
    </div>
    <input
      id="lf-radius"
      type="range"
      min={1}
      max={10}
      step={1}
      value={value}
      onChange={(e) => onChange(clampRadiusKm(e.target.value))}
      aria-valuemin={1}
      aria-valuemax={10}
      aria-valuenow={value}
      aria-valuetext={`Within ${value} kilometres`}
      style={{ width: '100%', accentColor: 'var(--teal)', cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>
      <span>1 km</span>
      <span>10 km</span>
    </div>
  </div>
);

const ResolveListingModal = ({ item, isSubmitting, error, onCancel, onConfirm }) => {
  if (!item) return null;
  const isFoundReport = item.kind?.toUpperCase() === 'FOUND';
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="lf-resolve-title" onClick={() => !isSubmitting && onCancel()} style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(16, 41, 70, 0.72)', backdropFilter: 'blur(3px)' }}>
      <div onClick={(event) => event.stopPropagation()} style={{ width: '100%', maxWidth: '440px', padding: '1.5rem', borderRadius: '1rem', background: '#fff', boxShadow: '0 20px 40px rgba(16, 41, 70, 0.25)' }}>
        <h2 id="lf-resolve-title" style={{ margin: '0 0 0.65rem', fontFamily: 'var(--serif)', color: 'var(--ink)', fontSize: '1.35rem' }}>{isFoundReport ? 'Mark item as collected?' : 'Mark item as found?'}</h2>
        <p style={{ margin: '0 0 1rem', color: 'var(--muted)', lineHeight: 1.55 }}>{isFoundReport ? `Has the original owner collected “${item.title}” from you? Confirming will remove this listing.` : `Have you actually found “${item.title}”? Confirming will remove this listing.`}</p>
        {error && <p role="alert" style={{ margin: '0 0 1rem', padding: '0.7rem', borderRadius: '0.5rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.88rem' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button type="button" disabled={isSubmitting} onClick={onCancel} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>Cancel</button>
          <button type="button" disabled={isSubmitting} onClick={onConfirm} style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>{isSubmitting ? 'Removing…' : 'Yes, remove listing'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Lost & Found Page Component ───────────────────────────────────────

const LostFound = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messagingId, setMessagingId] = useState(null);
  const [resolveCandidate, setResolveCandidate] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveError, setResolveError] = useState('');

  // Raw data from API
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Tab: 'LOST' or 'FOUND'
  const [activeTab, setActiveTab] = useState('LOST');

  // Search, Location Filter, Sorting, and Radius
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [searchRadius, setSearchRadius] = useState(() => clampRadiusKm(user?.searchRadiusKm || 5));

  // Detail Modal item
  const [selectedItem, setSelectedItem] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Tab button refs for keyboard navigation
  const lostTabRef = useRef(null);
  const foundTabRef = useRef(null);

  // Fetch notices from existing backend endpoint with PostGIS radius
  const fetchLostFound = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/alerts/lost-found', { params: { radius: searchRadius } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load lost & found notices:', err);
      setError(
        err.response?.data?.message ||
          'Could not load lost & found notices. Please verify the backend connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [searchRadius]);

  const handleMessageReporter = async (item) => {
    if (!item.reporterId || item.reporterId === user?.id) return;
    setMessagingId(item.id);
    try {
      const res = await api.post('/chat/conversations', { recipientId: item.reporterId });
      setSelectedItem(null);
      navigate(`/app/chats?conversationId=${res.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not start a conversation with this reporter.');
    } finally {
      setMessagingId(null);
    }
  };

  const requestResolve = (item) => {
    setResolveError('');
    setResolveCandidate(item);
  };

  const confirmResolve = async () => {
    if (!resolveCandidate || resolvingId) return;
    const item = resolveCandidate;
    setResolvingId(item.id);
    setResolveError('');
    try {
      await api.delete(`/alerts/lost-found/${item.id}`);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelectedItem((current) => current?.id === item.id ? null : current);
      setResolveCandidate(null);
    } catch (err) {
      setResolveError(err.response?.data?.message || 'Could not remove this listing. Please try again.');
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    fetchLostFound();
  }, [fetchLostFound]);

  // ─── Correct Data Separation ──────────────────────────────────────────────
  // Separated strictly by the data model field 'kind' (LOST vs FOUND)
  const lostItems = useMemo(() => {
    return items.filter((item) => item?.kind?.toUpperCase() === 'LOST');
  }, [items]);

  const foundItems = useMemo(() => {
    return items.filter((item) => item?.kind?.toUpperCase() === 'FOUND');
  }, [items]);

  // Collection for the currently active tab
  const currentTabItems = activeTab === 'LOST' ? lostItems : foundItems;
  const currentMeta = KIND_META[activeTab];

  // Distinct localities available in the active collection for the location filter
  const localities = useMemo(() => {
    const set = new Set();
    currentTabItems.forEach((item) => {
      if (item.localityName) set.add(item.localityName);
    });
    return Array.from(set).sort();
  }, [currentTabItems]);

  // Apply Search, Locality Filter, and Sorting to the active collection
  const displayedItems = useMemo(() => {
    let result = [...currentTabItems];

    // Filter by locality
    if (selectedLocality !== 'ALL') {
      result = result.filter((item) => item.localityName === selectedLocality);
    }

    // Filter by search query (title, description, and placeHint)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        const placeMatch = item.placeHint?.toLowerCase().includes(q);
        const reporterMatch = item.reporterName?.toLowerCase().includes(q);
        return titleMatch || descMatch || placeMatch || reporterMatch;
      });
    }

    // Sort by createdAt date
    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortBy === 'NEWEST' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [currentTabItems, selectedLocality, searchQuery, sortBy]);

  // Keyboard navigation for WAI-ARIA tablist
  const handleTabKeyDown = (e, tab) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab = tab === 'LOST' ? 'FOUND' : 'LOST';
      setActiveTab(nextTab);
      if (nextTab === 'LOST') {
        lostTabRef.current?.focus();
      } else {
        foundTabRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('LOST');
      lostTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('FOUND');
      foundTabRef.current?.focus();
    }
  };

  // Reset active filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedLocality('ALL');
  };

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedLocality !== 'ALL';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      {/* ─── Lost & Found section header ─── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--serif)',
                  fontSize: '1.85rem',
                  fontWeight: '700',
                  color: 'var(--ink)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Lost &amp; Found
              </h1>
              <span
                style={{
                  backgroundColor: 'var(--mint)',
                  color: 'var(--teal)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Neighborhood Notices
              </span>
            </div>
            <p style={{ color: 'var(--muted)', margin: '0.3rem 0 0', fontSize: '0.92rem' }}>
              Hyperlocal community reports within {searchRadius} km of{' '}
              <strong style={{ color: 'var(--ink)' }}>{user?.locality || 'your neighbourhood'}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.7rem 1.15rem',
            fontSize: '0.92rem',
            whiteSpace: 'nowrap',
          }}
        >
          + Report an Item
        </button>
      </header>

      {/* ─── Two Functional Tabs: Lost Items & Found Items ─── */}
      <div
        role="tablist"
        aria-label="Lost and Found categories"
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid var(--line)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        {/* Tab 1: Lost Items */}
        <button
          ref={lostTabRef}
          role="tab"
          id="tab-lost"
          aria-selected={activeTab === 'LOST'}
          aria-controls="tabpanel-lostfound"
          tabIndex={activeTab === 'LOST' ? 0 : -1}
          onClick={() => setActiveTab('LOST')}
          onKeyDown={(e) => handleTabKeyDown(e, 'LOST')}
          className="lf-tab-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.75rem 1.4rem',
            backgroundColor: activeTab === 'LOST' ? '#fff' : 'transparent',
            color: activeTab === 'LOST' ? '#c2410c' : 'var(--muted)',
            border: 'none',
            borderBottom: activeTab === 'LOST' ? '3px solid #ea580c' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontSize: '0.98rem',
            fontWeight: activeTab === 'LOST' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '1.15rem' }}>🔍</span>
          <span>Lost Items</span>
          <span
            style={{
              backgroundColor: activeTab === 'LOST' ? '#ffedd5' : 'var(--cream)',
              color: activeTab === 'LOST' ? '#c2410c' : 'var(--muted)',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              border: `1px solid ${activeTab === 'LOST' ? '#fed7aa' : 'var(--line)'}`,
            }}
          >
            {lostItems.length}
          </span>
        </button>

        {/* Tab 2: Found Items */}
        <button
          ref={foundTabRef}
          role="tab"
          id="tab-found"
          aria-selected={activeTab === 'FOUND'}
          aria-controls="tabpanel-lostfound"
          tabIndex={activeTab === 'FOUND' ? 0 : -1}
          onClick={() => setActiveTab('FOUND')}
          onKeyDown={(e) => handleTabKeyDown(e, 'FOUND')}
          className="lf-tab-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.75rem 1.4rem',
            backgroundColor: activeTab === 'FOUND' ? '#fff' : 'transparent',
            color: activeTab === 'FOUND' ? 'var(--teal)' : 'var(--muted)',
            border: 'none',
            borderBottom: activeTab === 'FOUND' ? '3px solid var(--teal)' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: '0.5rem 0.5rem 0 0',
            fontSize: '0.98rem',
            fontWeight: activeTab === 'FOUND' ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '1.15rem' }}>✅</span>
          <span>Found Items</span>
          <span
            style={{
              backgroundColor: activeTab === 'FOUND' ? 'var(--mint)' : 'var(--cream)',
              color: activeTab === 'FOUND' ? 'var(--teal)' : 'var(--muted)',
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.12rem 0.5rem',
              borderRadius: '999px',
              border: `1px solid ${activeTab === 'FOUND' ? '#99f6e4' : 'var(--line)'}`,
            }}
          >
            {foundItems.length}
          </span>
        </button>
      </div>

      {/* ─── Search, Location Filter, and Sort Controls ─── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          border: '1px solid var(--line)',
        }}
      >
        {/* Left Controls: Search & Locality */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          {/* Search Field */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
                fontSize: '0.95rem',
                pointerEvents: 'none',
              }}
            >
              🔎
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()} items by title, spot...`}
              aria-label={`Search ${activeTab.toLowerCase()} items`}
              style={{
                width: '100%',
                padding: '0.6rem 2rem 0.6rem 2.25rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--line)',
                fontSize: '0.9rem',
                fontFamily: 'var(--sans)',
                color: 'var(--ink)',
                backgroundColor: '#fff',
                outline: 'none',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Location / Locality Filter */}
          {localities.length > 0 && (
            <div style={{ minWidth: '160px' }}>
              <select
                value={selectedLocality}
                onChange={(e) => setSelectedLocality(e.target.value)}
                aria-label="Filter by locality"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--line)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--sans)',
                  color: 'var(--ink)',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="ALL">All Localities ({currentTabItems.length})</option>
                {localities.map((loc) => {
                  const count = currentTabItems.filter((i) => i.localityName === loc).length;
                  return (
                    <option key={loc} value={loc}>
                      {loc} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <RadiusSlider value={searchRadius} onChange={setSearchRadius} />
        </div>

        {/* Right Controls: Sort Dropdown & Clear Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontWeight: '600' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort notices by date"
              style={{
                padding: '0.55rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--line)',
                fontSize: '0.85rem',
                fontFamily: 'var(--sans)',
                color: 'var(--ink)',
                backgroundColor: '#fff',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--teal)',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '0.2rem 0.4rem',
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Active Tab Content Panel ─── */}
      <div
        role="tabpanel"
        id="tabpanel-lostfound"
        aria-labelledby={`tab-${activeTab.toLowerCase()}`}
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        {/* Error State */}
        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <strong>Unable to load notices</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem' }}>{error}</p>
              </div>
            </div>
            <button
              onClick={fetchLostFound}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#b91c1c',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        )}

        {/* Loaded Content: Results Grid or Empty States */}
        {!loading && !error && (
          <>
            {/* Results Counter if filtered */}
            {(hasActiveFilters || displayedItems.length > 0) && (
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  marginBottom: '1rem',
                  fontWeight: '500',
                }}
              >
                Showing {displayedItems.length}
                {hasActiveFilters ? ` of ${currentTabItems.length}` : ''} {activeTab.toLowerCase()} items
                {' '}within {searchRadius} km
              </p>
            )}

            {/* Case A: Active Tab Collection is Completely Empty */}
            {currentTabItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3.5rem 1.5rem',
                  backgroundColor: '#fff',
                  borderRadius: '1rem',
                  border: '1px solid var(--line)',
                  boxShadow: '0 2px 6px rgba(16, 41, 70, 0.04)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: currentMeta.badgeBg,
                    color: currentMeta.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    margin: '0 auto 1rem',
                  }}
                >
                  {currentMeta.emoji}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: '1.35rem',
                    color: 'var(--ink)',
                    margin: '0 0 0.5rem',
                  }}
                >
                  {currentMeta.emptyTitle}
                </h3>
                <p
                  style={{
                    color: 'var(--muted)',
                    maxWidth: '420px',
                    margin: '0 auto',
                    fontSize: '0.92rem',
                    lineHeight: 1.5,
                  }}
                >
                  {currentMeta.emptyDesc} Notices within {searchRadius} km of your neighbourhood will appear here.
                </p>
              </div>
            ) : /* Case B: Collection has items, but Search / Filters matched nothing */
            displayedItems.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  backgroundColor: '#fff',
                  borderRadius: '1rem',
                  border: '1px solid var(--line)',
                }}
              >
                <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>🔍</p>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: 'var(--ink)' }}>
                  No matching {activeTab.toLowerCase()} items found
                </h3>
                <p style={{ color: 'var(--muted)', margin: '0 0 1.25rem', fontSize: '0.9rem' }}>
                  No notices match &ldquo;{searchQuery}&rdquo;{' '}
                  {selectedLocality !== 'ALL' ? `in ${selectedLocality}` : ''}.
                </p>
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '0.55rem 1.2rem',
                    backgroundColor: 'var(--teal)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              /* Case C: Render Grid of Shared Item Cards */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {displayedItems.map((item) => (
                  <LostFoundCard
                    key={item.id}
                    item={item}
                    onViewDetails={(selected) => setSelectedItem(selected)}
                    onMessageReporter={handleMessageReporter}
                    onResolve={requestResolve}
                    isMessaging={messagingId === item.id}
                    isResolving={resolvingId === item.id}
                    currentUserId={user?.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Item Detail Modal ─── */}
      {selectedItem && (
        <LostFoundDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onMessageReporter={handleMessageReporter}
          isMessaging={messagingId === selectedItem.id}
          currentUserId={user?.id}
        />
      )}

      {isReportOpen && (
        <ReportItemModal
          user={user}
          onClose={() => setIsReportOpen(false)}
          onCreated={(created) => {
            const submittedKind = created?.kind?.toUpperCase() === 'FOUND' ? 'FOUND' : 'LOST';
            setActiveTab(submittedKind);
            setIsReportOpen(false);
            fetchLostFound();
          }}
        />
      )}

      <ResolveListingModal
        item={resolveCandidate}
        isSubmitting={resolvingId === resolveCandidate?.id}
        error={resolveError}
        onCancel={() => { setResolveCandidate(null); setResolveError(''); }}
        onConfirm={confirmResolve}
      />

      {/* ─── Scoped Component Styles ─── */}
      <style>{`
        .lf-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(16, 41, 70, 0.08) !important;
          border-color: #cbd5e1 !important;
        }
        .lf-card:focus-visible {
          outline: 2px solid var(--teal) !important;
          outline-offset: 2px;
        }
        .lf-card:hover .lf-card-img {
          transform: scale(1.03);
        }
        .lf-tab-btn:focus-visible {
          outline: 2px solid var(--teal) !important;
          outline-offset: -2px;
        }
        .lf-skel {
          background: linear-gradient(90deg, #eee 25%, #f9f9f9 50%, #eee 75%);
          background-size: 200% 100%;
          animation: lfShimmer 1.4s infinite;
        }
        @keyframes lfShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 640px) {
          .lf-card {
            border-radius: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LostFound;
