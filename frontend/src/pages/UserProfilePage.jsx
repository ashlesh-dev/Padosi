import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

// ─── Score helpers ────────────────────────────────────────────────────────────

/**
 * 4-band colour scale per the Padosi design spec:
 *   8.0–10.0  Green        Excellent
 *   6.5– 7.9  Light Green  Good
 *   4.0– 6.4  Orange       Needs Attention
 *   0.0– 3.9  Red          Poor
 */
function scoreColor(s) {
  if (s >= 8.0) return '#16a34a'; // green
  if (s >= 6.5) return '#65a30d'; // light green
  if (s >= 4.0) return '#ea580c'; // orange
  return '#dc2626';               // red
}

function scoreBg(s) {
  if (s >= 8.0) return '#dcfce7';
  if (s >= 6.5) return '#ecfccb';
  if (s >= 4.0) return '#ffedd5';
  return '#fee2e2';
}

function scoreLabel(s) {
  if (s >= 8.0) return 'Excellent community member';
  if (s >= 6.5) return 'Good community member';
  if (s >= 4.0) return 'Needs attention';
  return 'Poor standing';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ avatarUrl, fullName, size = 96 }) => {
  const initial = fullName?.charAt(0)?.toUpperCase() || '?';
  const commonStyle = {
    width: size, height: size, borderRadius: '50%',
    border: '3px solid #fff',
    boxShadow: '0 0 0 2px var(--teal)',
    flexShrink: 0,
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl} alt={fullName}
        style={{ ...commonStyle, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div style={{
      ...commonStyle,
      backgroundColor: 'var(--orange)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: '700',
    }}>
      {initial}
    </div>
  );
};

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

const Skel = ({ w = '100%', h = '14px', r = '6px', style = {} }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    ...style,
  }} />
);

// ─── Score Badge ──────────────────────────────────────────────────────────────

const ScoreBadge = ({ score }) => {
  const color = scoreColor(score);
  const bg    = scoreBg(score);
  const label = scoreLabel(score);

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column',
      alignItems: 'center', gap: '0.35rem',
      backgroundColor: bg,
      border: `1.5px solid ${color}33`,
      borderRadius: '1rem', padding: '0.9rem 1.5rem',
    }}>
      {/* Score value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: '800', color, lineHeight: 1 }}>
          {score.toFixed(1)}
        </span>
        <span style={{ fontSize: '1rem', color, fontWeight: '600' }}>/10</span>
      </div>

      {/* Label */}
      <span style={{
        fontSize: '0.75rem', fontWeight: '600', color,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </span>
    </div>
  );
};

// ─── Mini Post Card ───────────────────────────────────────────────────────────

const typeColors = {
  GENERAL:        { bg: 'var(--mint)',  color: 'var(--teal)' },
  ANNOUNCEMENT:   { bg: '#fef3c7',      color: '#b45309' },
  QUESTION:       { bg: '#ede9fe',      color: '#7c3aed' },
  RECOMMENDATION: { bg: '#fce7f3',      color: '#be185d' },
  ALERT:          { bg: '#fee2e2',      color: '#b91c1c' },
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const PostCard = ({ post }) => {
  const [hovered, setHovered] = useState(false);
  const tc = typeColors[post.postType] || typeColors.GENERAL;

  return (
    <article
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${hovered ? 'var(--teal)' : 'var(--line)'}`,
        borderRadius: '0.875rem',
        padding: '1.1rem 1.25rem',
        marginBottom: '0.75rem',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: hovered ? '0 4px 20px rgba(0,0,0,0.07)' : 'none',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Type badge + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: '700', letterSpacing: '0.05em',
          textTransform: 'uppercase', padding: '0.2rem 0.55rem',
          borderRadius: '99px', backgroundColor: tc.bg, color: tc.color,
        }}>
          {post.postType}
        </span>
        <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
          {timeAgo(post.createdAt)}
        </small>
      </div>

      {/* Content */}
      <p style={{
        margin: 0, fontSize: '0.9rem', lineHeight: 1.6,
        color: 'var(--ink)',
        display: '-webkit-box', WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {post.content}
      </p>

      {/* Image preview */}
      {post.imageUrl && (
        <img
          src={post.imageUrl} alt=""
          style={{
            width: '100%', maxHeight: '180px', objectFit: 'cover',
            borderRadius: '0.5rem', marginTop: '0.75rem',
          }}
        />
      )}

      {/* Footer: likes + comments + locality */}
      <div style={{
        display: 'flex', gap: '1.1rem', marginTop: '0.75rem',
        fontSize: '0.8rem', color: 'var(--muted)',
      }}>
        <span>❤️ {post.likeCount}</span>
        <span>💬 {post.commentCount}</span>
        <span style={{ marginLeft: 'auto' }}>📍 {post.localityName}</span>
      </div>
    </article>
  );
};

// ─── Report Modal ─────────────────────────────────────────────────────────────

const ReportModal = ({ targetName, onClose }) => {
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);

  const reasons = [
    'Spam or misleading content',
    'Harassment or bullying',
    'False emergency alerts',
    'Hate speech or discrimination',
    'Fake profile or impersonation',
    'Other',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason) return;
    // In a real app: POST /api/reports  with { targetUserId, reason }
    // For now, acknowledge and close
    setSent(true);
    setTimeout(onClose, 2200);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#fff', borderRadius: '1rem',
          padding: '1.75rem', width: '100%', maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        {sent ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✅</p>
            <p style={{ fontWeight: '600' }}>Report submitted. Thank you.</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Our team will review this within 24 hours.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontFamily: 'var(--serif)' }}>
              Report {targetName}
            </h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Why are you reporting this user?
            </p>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {reasons.map(r => (
                  <label key={r} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.85rem', borderRadius: '0.5rem', cursor: 'pointer',
                    backgroundColor: reason === r ? 'var(--mint)' : '#f9fafb',
                    border: `1px solid ${reason === r ? 'var(--teal)' : 'var(--line)'}`,
                    transition: 'all 0.12s',
                  }}>
                    <input
                      type="radio" name="reason" value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      style={{ accentColor: 'var(--teal)' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>{r}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button" onClick={onClose}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.5rem',
                    border: '1px solid var(--line)', background: '#fff',
                    cursor: 'pointer', fontSize: '0.875rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={!reason}
                  style={{
                    flex: 1, padding: '0.6rem', borderRadius: '0.5rem',
                    border: 'none', backgroundColor: reason ? '#dc2626' : '#e5e7eb',
                    color: reason ? '#fff' : '#9ca3af',
                    cursor: reason ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem', fontWeight: '600',
                    transition: 'background 0.15s',
                  }}
                >
                  Submit Report
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: me } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile]         = useState(null);
  const [posts,   setPosts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [error,   setError]           = useState('');
  const [page,    setPage]            = useState(0);
  const [hasMore, setHasMore]         = useState(true);
  const [showReport, setShowReport]   = useState(false);

  const PAGE_SIZE    = 10;
  const isOwnProfile = me && Number(userId) === Number(me.id);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/users/${userId}`)
      .then(res => setProfile(res.data))
      .catch(() => setError('Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  // ── Fetch first page of posts ──────────────────────────────────────────────
  useEffect(() => {
    setPage(0);
    setPosts([]);
    setHasMore(true);
    setPostsLoading(true);
    api.get(`/users/${userId}/posts?page=0&size=${PAGE_SIZE}`)
      .then(res => {
        setPosts(res.data);
        setHasMore(res.data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [userId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    api.get(`/users/${userId}/posts?page=${nextPage}&size=${PAGE_SIZE}`)
      .then(res => {
        setPosts(prev => [...prev, ...res.data]);
        setHasMore(res.data.length === PAGE_SIZE);
      });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>😕</p>
      <p style={{ color: 'var(--muted)' }}>{error}</p>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginTop: '1rem', padding: '0.55rem 1.25rem', borderRadius: '0.5rem',
          border: '1px solid var(--line)', background: '#fff', cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        ← Go Back
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>

      {/* Keyframe styles */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* ── Back button ─────────────────────────── */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          marginBottom: '1.25rem', padding: '0.4rem 0.85rem',
          borderRadius: '0.5rem', border: '1px solid var(--line)',
          background: '#fff', cursor: 'pointer', fontSize: '0.85rem',
          color: 'var(--muted)', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--mint)'; e.currentTarget.style.color = 'var(--teal)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--muted)'; }}
      >
        ← Back
      </button>

      {/* ── Profile card ────────────────────────── */}
      <section style={{
        backgroundColor: '#fff',
        borderRadius: '1.125rem',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        marginBottom: '1.5rem',
      }}>

        {loading ? (
          /* Skeleton */
          <div style={{ padding: '2.5rem 2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Skel w="96px" h="96px" r="50%" />
              <Skel w="160px" h="22px" />
              <Skel w="120px" h="14px" />
            </div>
            <Skel h="14px" style={{ marginBottom: '0.4rem' }} />
            <Skel w="80%" h="14px" style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Skel w="180px" h="80px" r="1rem" />
            </div>
          </div>
        ) : profile && (
          <>
            {/* Teal header bar */}
            <div style={{
              height: '80px',
              background: 'linear-gradient(135deg, var(--teal) 0%, #065f46 100%)',
            }} />

            <div style={{ padding: '0 2rem 2rem', marginTop: '-48px' }}>

              {/* Avatar (overlapping the bar) + action buttons */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-end', marginBottom: '1rem',
              }}>
                <Avatar avatarUrl={profile.avatarUrl} fullName={profile.fullName} size={96} />

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.25rem' }}>
                  {isOwnProfile ? (
                    <span style={{
                      padding: '0.45rem 1rem', borderRadius: '0.5rem',
                      border: '1px solid var(--line)', fontSize: '0.82rem',
                      fontWeight: '600', color: 'var(--ink)', backgroundColor: '#fff',
                    }}>
                      👤 Your profile
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowReport(true)}
                      style={{
                        padding: '0.45rem 0.9rem', borderRadius: '0.5rem',
                        border: '1px solid #fca5a5', fontSize: '0.82rem',
                        fontWeight: '500', color: '#dc2626', backgroundColor: '#fff',
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                      🚩 Report
                    </button>
                  )}
                </div>
              </div>

              {/* Name */}
              <h1 style={{
                margin: '0 0 0.2rem',
                fontSize: '1.45rem',
                fontFamily: 'var(--serif)',
                color: 'var(--ink)',
              }}>
                {profile.fullName}
              </h1>

              {/* Locality */}
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                📍 {profile.localityName}, {profile.city}
              </p>

              {/* Bio */}
              {profile.bio && (
                <p style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.9rem', lineHeight: 1.6,
                  color: 'var(--ink)',
                  fontStyle: 'italic',
                }}>
                  "{profile.bio}"
                </p>
              )}

              {/* Member since + post count */}
              <div style={{
                display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
                fontSize: '0.82rem', color: 'var(--muted)',
                marginBottom: '1.5rem',
              }}>
                <span>🗓️ Joined {formatDate(profile.memberSince)}</span>
                <span>📝 {profile.postCount} post{profile.postCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Divider */}
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', marginBottom: '1.5rem' }} />

              {/* Behaviour Score */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.65rem' }}>
                <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Padosi Behaviour Score
                </p>
                <ScoreBadge score={profile.behaviourScore} />
                <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--muted)', lineHeight: 1.55, maxWidth: '480px' }}>
                  This score reflects {isOwnProfile ? 'your' : 'this member\'s'} overall behaviour and contribution to the Padosi community.
                  It is calculated from community participation and platform activity — not popularity or followers.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Posts section ───────────────────────── */}
      <section>
        <h2 style={{
          fontFamily: 'var(--serif)', fontSize: '1.1rem',
          color: 'var(--ink)', marginBottom: '1rem',
        }}>
          {isOwnProfile
            ? 'Your Posts'
            : `Posts by ${profile?.fullName?.split(' ')[0] ?? 'this user'}`}
        </h2>

        {postsLoading ? (
          /* Post skeletons */
          [1, 2, 3].map(i => (
            <div key={i} style={{
              backgroundColor: '#fff', borderRadius: '0.875rem',
              border: '1px solid var(--line)', padding: '1.1rem 1.25rem',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <Skel w="80px" h="20px" r="99px" />
                <Skel w="60px" h="12px" />
              </div>
              <Skel h="13px" style={{ marginBottom: '0.4rem' }} />
              <Skel w="85%" h="13px" style={{ marginBottom: '0.4rem' }} />
              <Skel w="65%" h="13px" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '3rem 1rem',
            backgroundColor: '#fff', borderRadius: '0.875rem',
            border: '1px solid var(--line)',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted yet."}
            </p>
          </div>
        ) : (
          <>
            {posts.map(post => <PostCard key={post.id} post={post} />)}

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: '0.75rem', paddingBottom: '1rem' }}>
                <button
                  onClick={loadMore}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
                    border: '1px solid var(--teal)', backgroundColor: '#fff',
                    color: 'var(--teal)', cursor: 'pointer',
                    fontWeight: '600', fontSize: '0.875rem',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--mint)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#fff'}
                >
                  Load more posts
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Report modal ─────────────────────────── */}
      {showReport && (
        <ReportModal
          targetName={profile?.fullName ?? 'this user'}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
