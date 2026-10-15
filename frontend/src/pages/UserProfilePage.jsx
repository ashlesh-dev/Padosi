import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { deletePostImage, uploadAvatar } from '../api/supabaseClient';

const SUPABASE_CONFIGURED = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
);

// ─── Score helpers ────────────────────────────────────────────────────────────

/**
 * Tiered color scale for unlimited Padosi Score (starting at 5, +5 per helpful vote):
 *   100+  Amber/Orange  Community Champion
 *   50+   Purple        Super Neighbor
 *   25+   Blue          Active Contributor
 *   10+   Green         Helpful Neighbor
 *   5+    Teal          Good Neighbor (Starting Score)
 */
function scoreColor(s) {
  if (s >= 100) return '#ea580c'; // orange
  if (s >= 50)  return '#7c3aed'; // purple
  if (s >= 25)  return '#0284c7'; // blue
  if (s >= 10)  return '#16a34a'; // green
  if (s >= 5)   return '#0d9488'; // teal (starting base score)
  return '#64748b';               // muted
}

function scoreBg(s) {
  if (s >= 100) return '#ffedd5';
  if (s >= 50)  return '#ede9fe';
  if (s >= 25)  return '#e0f2fe';
  if (s >= 10)  return '#dcfce7';
  if (s >= 5)   return '#ccfbf1';
  return '#f1f5f9';
}

function scoreLabel(s) {
  if (s >= 100) return 'Community Champion';
  if (s >= 50)  return 'Super Neighbor';
  if (s >= 25)  return 'Active Contributor';
  if (s >= 10)  return 'Helpful Neighbor';
  if (s >= 5)   return 'Good Neighbor';
  return 'Community Member';
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar = ({ avatarUrl, fullName, size = 96, isEditable = false, userId, onUploadComplete }) => {
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const initial = fullName?.charAt(0)?.toUpperCase() || '?';

  const commonStyle = {
    width: size, height: size, borderRadius: '50%',
    border: '3px solid #fff',
    boxShadow: '0 0 0 2px var(--teal)',
    flexShrink: 0,
    textDecoration: 'none',
  };

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

    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(file, userId);
      await api.patch('/users/me/avatar', { avatarUrl: publicUrl });
      if (onUploadComplete) onUploadComplete(publicUrl);
    } catch (err) {
      alert('Failed to upload profile picture: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl} alt={fullName}
          style={{ ...commonStyle, objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          ...commonStyle,
          backgroundColor: 'var(--orange)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.38, fontWeight: '700',
          textDecoration: 'none', userSelect: 'none',
        }}>
          {initial}
        </div>
      )}

      {/* Editable camera overlay */}
      {isEditable && SUPABASE_CONFIGURED && (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.48)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            opacity: hovered || uploading ? 1 : 0,
            transition: 'opacity 0.2s ease',
            color: '#fff',
            zIndex: 10,
          }}
          title="Change profile picture"
        >
          {uploading ? (
            <span style={{ fontSize: '1.4rem' }}>⏳</span>
          ) : (
            <>
              <span style={{ fontSize: '1.3rem' }}>📷</span>
              <span style={{ fontSize: '0.62rem', fontWeight: '700', marginTop: '2px', textAlign: 'center', lineHeight: 1.1 }}>
                Change<br />Photo
              </span>
            </>
          )}
        </div>
      )}

      {isEditable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      )}
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
  // Score may be missing/null from older or partial API responses — never let that crash the page.
  const value = Number.isFinite(Number(score)) ? Number(score) : null;
  const color = value === null ? '#64748b' : scoreColor(value);
  const bg    = value === null ? '#f1f5f9' : scoreBg(value);
  const label = value === null ? 'No score yet' : scoreLabel(value);

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column',
      alignItems: 'center', gap: '0.35rem',
      backgroundColor: bg,
      border: `1.5px solid ${color}33`,
      borderRadius: '1rem', padding: '0.85rem 1.6rem',
      minWidth: '140px',
    }}>
      {/* Score value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
        <span style={{ fontSize: '2.25rem', fontWeight: '800', color, lineHeight: 1 }}>
          {value === null ? '—' : Math.round(value)}
        </span>
        <span style={{ fontSize: '0.85rem', color, fontWeight: '700', letterSpacing: '0.04em' }}>
          PTS
        </span>
      </div>

      {/* Label */}
      <span style={{
        fontSize: '0.72rem', fontWeight: '700', color,
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

const PostCard = ({ post, currentUser, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount) || 0);
  const [commentCount, setCommentCount] = useState(Number(post.commentCount) || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const tc = typeColors[post.postType] || typeColors.GENERAL;
  const isOwnPost = Number(currentUser?.id) === Number(post.authorId);

  useEffect(() => {
    if (!commentsOpen) return;
    setCommentsLoading(true);
    api.get(`/posts/${post.id}/comments`)
      .then(response => {
        setComments(response.data);
        setCommentCount(response.data.length);
      })
      .catch(requestError => setActionError(requestError.response?.data?.message || 'Could not load comments.'))
      .finally(() => setCommentsLoading(false));
  }, [commentsOpen, post.id]);

  const handleLike = async () => {
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!previousLiked);
    setLikeCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));
    setActionError('');
    try {
      const response = await api.post(`/posts/${post.id}/like`);
      setLiked(Boolean(response.data.liked));
      setLikeCount(Number(response.data.likeCount) || 0);
    } catch (requestError) {
      setLiked(previousLiked);
      setLikeCount(previousCount);
      setActionError(requestError.response?.data?.message || 'Could not update like. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setMenuOpen(false);
    setActionError('');
    try {
      if (post.imageUrl) await deletePostImage(post.imageUrl);
      await api.delete(`/posts/${post.id}`);
      onDelete(post.id);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not delete post. Please try again.');
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    const content = commentText.trim();
    if (!content) return;
    setCommentPosting(true);
    setActionError('');
    try {
      const response = await api.post(`/posts/${post.id}/comments`, { content });
      setComments(previous => [...previous, response.data]);
      setCommentCount(count => count + 1);
      setCommentText('');
      setCommentsOpen(true);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not post comment. Please try again.');
    } finally {
      setCommentPosting(false);
    }
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{timeAgo(post.createdAt)}</small>
          {isOwnPost && (
            <div style={{ position: 'relative' }}>
              <button type="button" aria-label="Post options" onClick={() => setMenuOpen(open => !open)} style={{ border: 0, background: 'none', color: 'var(--muted)', fontSize: '1.25rem', cursor: 'pointer' }}>···</button>
              {menuOpen && <button type="button" onClick={handleDelete} style={{ position: 'absolute', right: 0, top: '100%', zIndex: 5, whiteSpace: 'nowrap', border: '1px solid var(--line)', borderRadius: '0.5rem', background: '#fff', color: '#be123c', padding: '0.55rem 0.75rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.12)' }}>🗑️ Delete post</button>}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p style={{
        margin: 0, fontSize: '0.9rem', lineHeight: 1.6,
        color: 'var(--ink)',
        display: captionExpanded ? 'block' : '-webkit-box',
        WebkitLineClamp: captionExpanded ? undefined : 1,
        WebkitBoxOrient: 'vertical',
        overflow: captionExpanded ? 'visible' : 'hidden',
      }}>
        {post.content}
      </p>
      {post.content && post.content.length > 60 && (
        <button
          onClick={() => setCaptionExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', padding: '0.25rem 0 0',
            cursor: 'pointer', color: 'var(--muted)',
            fontSize: '0.82rem', fontFamily: 'var(--sans)',
            fontWeight: '600',
          }}
        >
          {captionExpanded ? 'View less' : 'View more'}
        </button>
      )}

      {/* Image preview */}
      {post.imageUrl && (
        <div style={{
          width: '100%',
          aspectRatio: '4 / 5',
          maxHeight: '560px',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '0.5rem',
          marginTop: '0.75rem',
          backgroundColor: '#111',
        }}>
          {/* Blurred background layer */}
          <img
            src={post.imageUrl} alt="" aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(22px) brightness(0.55)',
              transform: 'scale(1.08)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
          {/* Crisp foreground image */}
          <img
            src={post.imageUrl} alt=""
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleLike} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} style={{ border: 0, borderRadius: '0.5rem', padding: '0.4rem 0.6rem', background: liked ? '#fff1f2' : 'transparent', color: liked ? '#e11d48' : 'var(--muted)', cursor: 'pointer', fontWeight: 700 }}>❤️ {likeCount} {likeCount === 1 ? 'like' : 'likes'}</button>
        <button type="button" onClick={() => setCommentsOpen(open => !open)} aria-expanded={commentsOpen} style={{ border: 0, borderRadius: '0.5rem', padding: '0.4rem 0.6rem', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>💬 {commentsOpen ? 'Hide comments' : `${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}</button>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {post.localityName}</span>
      </div>
      {actionError && <p role="alert" style={{ color: '#be123c', fontSize: '0.78rem', margin: '0.5rem 0 0' }}>{actionError}</p>}
      {commentsOpen && (
        <div style={{ borderTop: '1px solid var(--line)', marginTop: '0.65rem', paddingTop: '0.65rem' }}>
          {commentsLoading ? <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Loading comments…</p> : comments.map(comment => (
            <div key={comment.id} style={{ display: 'flex', gap: '0.5rem', padding: '0.35rem 0', fontSize: '0.84rem' }}>
              <strong>{comment.authorName}</strong><span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.content}</span>
            </div>
          ))}
          {!commentsLoading && comments.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No comments yet. Start the conversation.</p>}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input value={commentText} onChange={event => setCommentText(event.target.value)} maxLength={1000} placeholder="Add a comment…" aria-label="Add a comment" style={{ flex: 1, minWidth: 0, border: '1px solid var(--line)', borderRadius: '0.5rem', padding: '0.55rem 0.7rem', color: 'var(--ink)', background: '#fff' }} />
            <button type="submit" disabled={commentPosting || !commentText.trim()} style={{ border: 0, borderRadius: '0.5rem', padding: '0 0.8rem', background: 'var(--teal)', color: '#fff', cursor: commentPosting ? 'wait' : 'pointer', fontWeight: 700 }}>{commentPosting ? '…' : 'Post'}</button>
          </form>
        </div>
      )}
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
  const { user: me, login } = useContext(AuthContext);
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

  const handleAvatarUpdate = (newAvatarUrl) => {
    const token = localStorage.getItem('token');
    if (login) login(token, { ...me, avatarUrl: newAvatarUrl });
    setProfile(p => p ? { ...p, avatarUrl: newAvatarUrl } : p);
  };

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
                <Avatar
                  avatarUrl={profile.avatarUrl}
                  fullName={profile.fullName}
                  size={96}
                  isEditable={isOwnProfile}
                  userId={me?.id}
                  onUploadComplete={handleAvatarUpdate}
                />

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

              {/* Name + Professional badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '1.45rem',
                  fontFamily: 'var(--serif)',
                  color: 'var(--ink)',
                }}>
                  {profile.accountType === 'BUSINESS' && profile.companyName
                    ? profile.companyName
                    : profile.fullName}
                </h1>
                {profile.accountType === 'BUSINESS' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    background: 'linear-gradient(135deg, #0d9488, #065f46)',
                    color: '#fff', fontSize: '0.65rem', fontWeight: '700',
                    padding: '0.2rem 0.6rem', borderRadius: '999px',
                    letterSpacing: '0.04em', flexShrink: 0,
                  }}>
                    🏢 Professional Account
                  </span>
                )}
              </div>
              {/* Show real name under company name for business accounts */}
              {profile.accountType === 'BUSINESS' && profile.companyName && (
                <p style={{ margin: '0 0 0.1rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
                  by {profile.fullName}
                </p>
              )}

              {/* Locality */}
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                📍 {profile.localityName}, {profile.city}
              </p>

              {/* Personal bio */}
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

              {/* Business details section */}
              {profile.accountType === 'BUSINESS' && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.6rem',
                  padding: '0.85rem 1rem',
                  marginBottom: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.4rem',
                }}>
                  {profile.businessCategory && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {profile.businessCategory}
                    </p>
                  )}
                  {profile.businessBio && (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.55 }}>
                      {profile.businessBio}
                    </p>
                  )}
                  {profile.businessContact && (
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>
                      📞 <strong>Contact:</strong> {profile.businessContact}
                    </p>
                  )}
                  {profile.businessWebsite && (
                    <p style={{ margin: 0, fontSize: '0.82rem' }}>
                      🌐 <strong>Website:</strong>{' '}
                      <a href={profile.businessWebsite} target="_blank" rel="noreferrer"
                        style={{ color: 'var(--teal)', wordBreak: 'break-all' }}>
                        {profile.businessWebsite}
                      </a>
                    </p>
                  )}
                </div>
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

              {/* Padosi Score */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src="/padosi-score-badge.jpg"
                    alt="Padosi Score"
                    style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Padosi Score
                  </p>
                </div>
                <ScoreBadge score={profile.behaviourScore} />
                <p style={{ margin: 0, fontSize: '0.77rem', color: 'var(--muted)', lineHeight: 1.55, maxWidth: '480px' }}>
                  This score reflects {isOwnProfile ? 'your' : "this member's"} community reputation. Every member starts with a base score of <strong>5</strong>, and earns <strong>+5 points</strong> every time a neighbor marks their comments or chat messages helpful!
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
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={me}
                onDelete={deletedId => {
                  setPosts(previous => previous.filter(item => item.id !== deletedId));
                  setProfile(previous => previous ? { ...previous, postCount: Math.max(0, previous.postCount - 1) } : previous);
                }}
              />
            ))}

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
