import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { uploadPostImage, deletePostImage } from '../api/supabaseClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format an ISO timestamp as "2h ago", "3d ago", etc. */
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

/** Format an ISO timestamp as a full readable date + time string. */
const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

/** Map a PostType enum value to a display label + badge color. */
const POST_TYPE_META = {
  GENERAL: '💬',
  ANNOUNCEMENT: '📢',
  QUESTION: '❓',
  RECOMMENDATION: '⭐',
  EMERGENCY_ALERT: '🚨',
};

const POST_CATEGORIES = [
  'None', 'Restaurant', 'Grocery Store', 'Barber / Salon',
  'Medical / Pharmacy', 'Dance Studio', 'Services', 'Events',
];

const POST_CATEGORY_EMOJI = {
  Restaurant: '🍕',
  'Grocery Store': '🛒',
  'Barber / Salon': '💈',
  'Medical / Pharmacy': '💊',
  'Dance Studio': '💃',
  Services: '🛠️',
  Events: '🎉',
};

/** Deterministic avatar color from a name string. */
const avatarColor = (name = '') => {
  const palette = ['#ee7d22', '#17645c', '#7c3aed', '#b45309', '#be123c', '#0369a1'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

// ─── SVG Icons (no emoji — so we can properly color them) ────────────────────

/** Solid heart icon — red when liked */
const HeartIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#e11d48' : 'none'}
    stroke={filled ? '#e11d48' : 'currentColor'} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

/** Comment bubble icon */
const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

/** Link/share icon */
const ShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

/** Camera icon for image upload button */
const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Circular avatar: image if available, else coloured initial. */
const Avatar = ({ name = '', avatarUrl, size = 40 }) => {
  const bg = avatarColor(name);
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        flexShrink: 0, border: '2px solid var(--line)',
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: bg, color: '#fff', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: Math.round(size * 0.38),
      textDecoration: 'none', userSelect: 'none',
    }}>
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  );
};

/** Shimmer skeleton for a post card while loading. */
const PostSkeleton = () => (
  <div className="feed-card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
    {/* Header */}
    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.9rem', alignItems: 'center' }}>
      <div className="skel" style={{ width: 44, height: 44, borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="skel" style={{ height: 13, width: '35%', borderRadius: 6, marginBottom: 6 }} />
        <div className="skel" style={{ height: 11, width: '22%', borderRadius: 6 }} />
      </div>
    </div>
    {/* Image */}
    <div className="skel" style={{ height: 280, width: '100%' }} />
    {/* Actions */}
    <div style={{ padding: '0.75rem 1rem' }}>
      <div className="skel" style={{ height: 12, width: '30%', borderRadius: 6, marginBottom: 8 }} />
      <div className="skel" style={{ height: 12, width: '60%', borderRadius: 6 }} />
    </div>
  </div>
);

/** A single comment row (avatar + name + text + time + helpful button). */
const CommentRow = ({ comment, postId, currentUserId, onToggleHelpful }) => {
  const isMine = currentUserId && Number(comment.authorId) === Number(currentUserId);
  const helpfulCount = comment.helpfulCount || 0;
  const helpfulByMe = comment.helpfulByMe || false;

  return (
    <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', paddingBottom: '0.65rem' }}>
      <Link to={`/app/users/${comment.authorId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
        <Avatar name={comment.authorName} avatarUrl={comment.authorAvatarUrl} size={28} />
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          backgroundColor: 'var(--cream)', borderRadius: '0 0.85rem 0.85rem 0.85rem',
          padding: '0.45rem 0.75rem', fontSize: '0.875rem', lineHeight: 1.45,
        }}>
          <Link
            to={`/app/users/${comment.authorId}`}
            style={{
              fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)',
              marginRight: '0.4rem', textDecoration: 'none', display: 'inline',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--teal)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink)'}
          >
            {comment.authorName}
          </Link>
          <span style={{ color: 'var(--ink)', wordBreak: 'break-word' }}>
            {comment.content}
          </span>
        </div>

        {/* Comment footer: timestamp + Helpful button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', marginLeft: '0.25rem' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
            {timeAgo(comment.createdAt)}
          </span>

          {/* Helpful button */}
          <button
            type="button"
            onClick={() => onToggleHelpful(comment.id)}
            disabled={isMine}
            title={isMine ? 'You cannot mark your own comment as helpful' : 'Mark as helpful (+5 Padosi Score)'}
            style={{
              border: helpfulByMe ? '1px solid #fecdd3' : '1px solid transparent',
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: helpfulByMe ? '700' : '500',
              color: helpfulByMe ? '#e11d48' : 'var(--muted)',
              cursor: isMine ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: helpfulByMe ? '#fee2e2' : 'transparent',
              transition: 'all 0.18s cubic-bezier(.34,1.56,.64,1)',
              opacity: isMine ? 0.45 : 1,
            }}
            onMouseEnter={e => {
              if (!isMine && !helpfulByMe) {
                e.currentTarget.style.backgroundColor = '#fff1f2';
                e.currentTarget.style.color = '#e11d48';
              }
            }}
            onMouseLeave={e => {
              if (!isMine && !helpfulByMe) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted)';
              }
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={helpfulByMe ? '#e11d48' : 'none'}
              stroke={helpfulByMe ? '#e11d48' : 'currentColor'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: helpfulByMe ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.18s ease'
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Expandable comments section — any authenticated user can view & post.
 * Refreshes the list every time it is opened (catches comments from other users).
 */
const CommentsSection = ({ postId, initialCommentCount, currentUser }) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef(null);

  // Re-fetch comments every time the section is opened (gets other users' new comments too)
  useEffect(() => {
    if (!open) return;
    setLoadingComments(true);
    api.get(`/posts/${postId}/comments`)
      .then(r => {
        setComments(r.data);
        setCommentCount(r.data.length); // sync live count
      })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [open, postId]);

  const handleToggleHelpful = async (commentId) => {
    try {
      const res = await api.post(`/posts/${postId}/comments/${commentId}/helpful`);
      // res.data = { helpful: boolean, helpfulCount: number }
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            helpfulByMe: res.data.helpful,
            helpfulCount: res.data.helpfulCount
          };
        }
        return c;
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update helpful vote.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    setSubmitError('');
    try {
      const res = await api.post(`/posts/${postId}/comments`, { content: text });
      setComments(prev => [...prev, res.data]);
      setCommentCount(c => c + 1);
      setCommentText('');
      setOpen(true); // keep section open after posting
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not post comment. Are you logged in?');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      {/* "View all N comments" link */}
      {commentCount > 0 && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none', border: 'none', padding: '0 0 0.5rem', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '0.82rem', fontFamily: 'var(--sans)',
            display: 'block',
          }}
        >
          {open ? 'Hide comments' : `View all ${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
        </button>
      )}

      {/* Comments list */}
      {open && (
        <div style={{ marginBottom: '0.5rem' }}>
          {loadingComments
            ? <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '0 0 0.5rem' }}>Loading…</p>
            : comments.map(c => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  postId={postId}
                  currentUserId={currentUser?.id}
                  onToggleHelpful={handleToggleHelpful}
                />
              ))
          }
        </div>
      )}

      {/* Add comment — visible to ALL users */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <Avatar name={currentUser?.fullName || ''} avatarUrl={currentUser?.avatarUrl} size={28} />
        <input
          ref={inputRef}
          id={`comment-input-${postId}`}
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Add a comment…"
          style={{
            flex: 1, border: 'none', borderBottom: '1.5px solid var(--line)',
            outline: 'none', fontSize: '0.875rem', fontFamily: 'var(--sans)',
            padding: '0.25rem 0', background: 'transparent', color: 'var(--ink)',
          }}
          onFocus={() => setOpen(true)}
        />
        {commentText.trim() && (
          <button type="submit" disabled={posting} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--teal)', fontWeight: '700', fontSize: '0.85rem',
            fontFamily: 'var(--sans)', whiteSpace: 'nowrap',
          }}>
            {posting ? '…' : 'Post'}
          </button>
        )}
      </form>
      {submitError && (
        <p style={{ color: '#be123c', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>{submitError}</p>
      )}
    </div>
  );
};

// ─── Post Card (Instagram layout) ────────────────────────────────────────────
/**
 * Instagram-style card:
 *   [Header: avatar + name + locality + distance + time + ...]
 *   [Full-width image]
 *   [Action row: heart / comment / share]
 *   [Like count]
 *   [Caption: author name + description text]
 *   [Comments section]
 */
const PostCard = ({ post, currentUser, onDelete }) => {
  const [liked, setLiked] = useState(Boolean(post.likedByMe));
  const [likeCount, setLikeCount] = useState(Number(post.likeCount) || 0);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const menuRef = useRef(null);

  const isOwnPost = currentUser?.id === post.authorId;
  const typeEmoji = POST_TYPE_META[post.postType] || POST_TYPE_META.GENERAL;

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /**
   * Optimistic like toggle.
   * Updates UI instantly, then syncs with server.
   * Rolls back if the server call fails.
   */
  const handleLike = async () => {
    const wasLiked = liked;
    const prevCount = likeCount;

    // Instant UI update
    const nowLiked = !wasLiked;
    setLiked(nowLiked);
    setLikeCount(c => nowLiked ? c + 1 : c - 1);
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 350);

    try {
      const res = await api.post(`/posts/${post.id}/like`);
      // Sync confirmed state from server
      setLiked(Boolean(res.data.liked));
      setLikeCount(Number(res.data.likeCount));
    } catch {
      // Rollback on failure
      setLiked(wasLiked);
      setLikeCount(prevCount);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/app/feed#post-${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setToastMsg('Link copied!');
    } catch {
      setToastMsg('Copy failed');
    }
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setMenuOpen(false);
    try {
      if (post.imageUrl) {
        await deletePostImage(post.imageUrl);
      }
      await api.delete(`/posts/${post.id}`);
      onDelete(post.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete post. Please try again.');
    }
  };

  // Ad is "active" only if adExpiresAt is in the future (or is null but isAd=true)
  const adIsActive = post.isAd && (!post.adExpiresAt || new Date(post.adExpiresAt) > new Date());

  return (
    <article id={`post-${post.id}`} className="feed-card" style={{ marginBottom: '1.25rem' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem' }}>
        {/* Clickable avatar → author's profile */}
        <Link to={`/app/users/${post.authorId}`} style={{ flexShrink: 0, display: 'block', textDecoration: 'none' }}>
          <Avatar name={post.authorName} avatarUrl={post.authorAvatarUrl} size={42} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Clickable author name → profile + business badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Link
              to={`/app/users/${post.authorId}`}
              style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.2,
                textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--teal)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--ink)'}
            >
              {post.authorCompanyName || post.authorName}
            </Link>
            {post.authorIsBusiness && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                background: 'linear-gradient(135deg, #0d9488, #065f46)',
                color: '#fff', fontSize: '0.58rem', fontWeight: '700',
                padding: '0.12rem 0.45rem', borderRadius: '999px',
                letterSpacing: '0.04em', flexShrink: 0,
              }}>
                🏢 Professional
              </span>
            )}
          </div>
          {/* Sponsored tag — shown directly below name for active ads */}
          {adIsActive && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.65rem', fontWeight: '700', color: '#b45309',
              backgroundColor: '#fef3c7', border: '1px solid #fcd34d',
              borderRadius: '4px', padding: '0.1rem 0.45rem',
              marginTop: '0.15rem', letterSpacing: '0.03em',
            }}>
              📢 Sponsored
            </div>
          )}
          <div className="post-meta-row" style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.1rem' }}>
            <span>
              {post.localityName}
              {post.distanceKm > 0 && ` · ${post.distanceKm} km away`}
              {' · '}{timeAgo(post.createdAt)}
            </span>
            <span role="img" className="post-type-emoji" title={`Post type: ${post.postType?.toLowerCase() || 'general'}`} aria-label={`Post type: ${post.postType?.toLowerCase() || 'general'}`}>
              {typeEmoji}
            </span>
            {post.category && post.category !== 'None' && (
              <span className="post-category-tag">
                {POST_CATEGORY_EMOJI[post.category] || '📍'} {post.category}
              </span>
            )}
          </div>
        </div>
        {/* ··· Menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Post options"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: '1.4rem', lineHeight: 1,
              padding: '0.2rem 0.4rem', borderRadius: '4px',
            }}
          >
            ···
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 4px)',
              backgroundColor: '#fff', border: '1px solid var(--line)',
              borderRadius: '0.6rem', boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              zIndex: 20, minWidth: '150px', overflow: 'hidden',
            }}>
              {isOwnPost ? (
                <button onClick={handleDelete} style={{
                  display: 'block', width: '100%', textAlign: 'left', background: 'none',
                  border: 'none', cursor: 'pointer', padding: '0.65rem 1rem',
                  fontSize: '0.875rem', color: '#be123c', fontFamily: 'var(--sans)',
                }}>
                  🗑️ Delete post
                </button>
              ) : (
                <button onClick={() => { alert('Thank you for reporting. We will review this post.'); setMenuOpen(false); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '0.65rem 1rem',
                    fontSize: '0.875rem', color: 'var(--muted)', fontFamily: 'var(--sans)',
                  }}>
                  🚩 Report post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── IMAGE (blurred background fill, crisp foreground — like Instagram/YouTube) ── */}
      {post.imageUrl && (
        <div style={{
          width: '100%',
          aspectRatio: '4 / 5',
          maxHeight: '560px',
          position: 'relative',
          overflow: 'hidden',
          lineHeight: 0,
          backgroundColor: '#111',
        }}>
          {/* Blurred background layer — same image, covers gaps */}
          <img
            src={post.imageUrl}
            alt=""
            aria-hidden="true"
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
          {/* Crisp foreground image — contained, centered */}
          <img
            src={post.imageUrl}
            alt="Post"
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={e => { e.currentTarget.closest('div').style.display = 'none'; }}
          />
        </div>
      )}

      {/* ── ACTION ROW (like / comment / share) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.1rem', padding: '0.6rem 0.75rem 0.3rem' }}>
        {/* Like */}
        <button
          onClick={handleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: liked ? '#e11d48' : 'var(--muted)',
            padding: '0.35rem', borderRadius: '50%',
            transform: likeAnimating ? 'scale(1.4)' : 'scale(1)',
            transition: 'transform 0.25s cubic-bezier(.34,1.56,.64,1), color 0.15s',
            display: 'flex', alignItems: 'center',
          }}
        >
          <HeartIcon filled={liked} />
        </button>

        {/* Comment */}
        <button
          onClick={() => document.getElementById(`comment-input-${post.id}`)?.focus()}
          aria-label="Comment"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: '0.35rem', borderRadius: '50%',
            display: 'flex', alignItems: 'center',
          }}
        >
          <CommentIcon />
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          aria-label="Share"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', padding: '0.35rem', borderRadius: '50%',
            display: 'flex', alignItems: 'center',
          }}
        >
          <ShareIcon />
        </button>

        {/* Toast */}
        {toastMsg && (
          <span style={{
            marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--teal)',
            fontWeight: '600', animation: 'fadeIn 0.2s ease',
          }}>
            ✓ {toastMsg}
          </span>
        )}
      </div>

      {/* ── LIKE COUNT ── */}
      {likeCount > 0 && (
        <div style={{ padding: '0 1rem 0.3rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--ink)' }}>
          {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
        </div>
      )}

      {/* ── CAPTION (author name + description text — below image like Instagram) ── */}
      <div style={{ padding: '0.1rem 1rem 0.6rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--ink)' }}>
          <strong style={{ marginRight: '0.4rem' }}>{post.authorName}</strong>
          <span
            style={{
              display: captionExpanded ? 'inline' : '-webkit-box',
              WebkitLineClamp: captionExpanded ? undefined : 1,
              WebkitBoxOrient: 'vertical',
              overflow: captionExpanded ? 'visible' : 'hidden',
              verticalAlign: 'middle',
            }}
          >
            {post.content}
          </span>
        </p>
        {post.content && post.content.length > 60 && (
          <button
            onClick={() => setCaptionExpanded(e => !e)}
            style={{
              background: 'none', border: 'none', padding: '0.1rem 0 0',
              cursor: 'pointer', color: 'var(--muted)',
              fontSize: '0.82rem', fontFamily: 'var(--sans)',
              fontWeight: '600',
            }}
          >
            {captionExpanded ? 'View less' : 'View more'}
          </button>
        )}
      </div>

      {/* ── COMMENTS ── */}
      <div style={{ padding: '0 1rem 0.85rem', borderTop: '1px solid var(--line)', paddingTop: '0.6rem' }}>
        <CommentsSection
          postId={post.id}
          initialCommentCount={post.commentCount || 0}
          currentUser={currentUser}
        />
      </div>
    </article>
  );
};

// ─── Create Post Box ──────────────────────────────────────────────────────────

/**
 * The "create post" box at the top of the feed.
 * Supports real image upload via Supabase Storage.
 */
const CreatePostBox = ({ currentUser, onCreated }) => {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('GENERAL');
  const [category, setCategory] = useState('None');
  const [imageFile, setImageFile] = useState(null);       // File object from input
  const [imagePreview, setImagePreview] = useState('');   // local blob URL for preview
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Ad post state — only usable by BUSINESS accounts
  const isBusiness = currentUser?.accountType === 'BUSINESS';
  const [isAd, setIsAd] = useState(false);
  const [adRadiusKm, setAdRadiusKm] = useState(5);
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [walletBalance, setWalletBalance] = useState(currentUser?.padosiCoins || 0);

  useEffect(() => {
    if (isBusiness) {
      api.get('/wallet').then(response => setWalletBalance(response.data.balance)).catch(() => {});
    }
  }, [isBusiness]);

  const SUPABASE_CONFIGURED = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    import.meta.env.VITE_SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here'
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { // 5 MB limit
      setError('Image must be under 5 MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) { setError('Please write something first.'); return; }
    setPosting(true);
    setError('');

    let finalImageUrl = undefined;

    // Upload image to Supabase Storage if one was selected
    if (imageFile) {
      setUploading(true);
      try {
        finalImageUrl = await uploadPostImage(imageFile, currentUser?.id);
      } catch (uploadErr) {
        setError(`Image upload failed: ${uploadErr.message}. Check Supabase bucket setup.`);
        setUploading(false);
        setPosting(false);
        return;
      }
      setUploading(false);
    }

    try {
      const res = await api.post('/posts', {
        content: content.trim(),
        postType,
        category,
        imageUrl: finalImageUrl,
        // Ad fields — only sent when user has toggled isAd on
        ...(isBusiness && isAd ? {
          isAd: true,
          adRadiusKm: Number(adRadiusKm),
          adDurationDays: Number(adDurationDays),
        } : { isAd: false }),
      });
      onCreated(res.data);
      if (isBusiness && isAd) {
        api.get('/wallet').then(response => setWalletBalance(response.data.balance)).catch(() => {});
      }
      // Reset form
      setContent('');
      setPostType('GENERAL');
      setCategory('None');
      setIsAd(false);
      setAdRadiusKm(5);
      setAdDurationDays(7);
      removeImage();
      setExpanded(false);
    } catch (err) {
      setError(err.response?.status >= 500
        ? 'Post could not be saved. Run the latest migration SQL in Supabase SQL Editor, then try again.'
        : err.response?.data?.message || 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const isSubmitting = posting || uploading;

  return (
    <div className="feed-card" style={{ marginBottom: '1.25rem' }}>
      {/* Collapsed trigger */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem', cursor: 'text' }}
        onClick={() => setExpanded(true)}
      >
        <Avatar name={currentUser?.fullName || ''} avatarUrl={currentUser?.avatarUrl} size={42} />
        <div style={{
          flex: 1, border: '1.5px solid var(--line)', borderRadius: '2rem',
          padding: '0.55rem 1.1rem', fontSize: '0.9rem', color: 'var(--muted)',
          backgroundColor: 'var(--cream)', userSelect: 'none',
        }}>
          What's happening in your neighbourhood?
        </div>
        {/* Photo shortcut */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); fileInputRef.current?.click(); }}
          title="Add photo"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--teal)', display: 'flex', alignItems: 'center', padding: '0.4rem',
          }}
        >
          <CameraIcon />
        </button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <form onSubmit={handleSubmit} style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--line)' }}>
          {/* Text input */}
          <textarea
            autoFocus
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share something with your neighbours…"
            rows={4}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'var(--sans)', fontSize: '0.95rem', color: 'var(--ink)',
              padding: '0.75rem 0', lineHeight: 1.65, background: 'transparent',
            }}
          />

          {/* Image preview (if selected) */}
          {imagePreview && (
            <div style={{ position: 'relative', marginBottom: '0.75rem', lineHeight: 0 }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '0.6rem' }}
              />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
                  border: 'none', borderRadius: '50%', width: 28, height: 28,
                  cursor: 'pointer', color: '#fff', fontSize: '1rem', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {/* Bottom bar: photo, category and post type selectors + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Photo upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={SUPABASE_CONFIGURED ? 'Upload a photo' : 'Set VITE_SUPABASE_ANON_KEY in frontend/.env to enable uploads'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                border: '1.5px solid var(--line)', borderRadius: '0.4rem',
                padding: '0.35rem 0.7rem', fontSize: '0.82rem', fontFamily: 'var(--sans)',
                color: SUPABASE_CONFIGURED ? 'var(--teal)' : 'var(--muted)',
                background: '#fff', cursor: 'pointer',
              }}
            >
              <CameraIcon />
              {imageFile ? imageFile.name.slice(0, 18) + '…' : 'Photo'}
            </button>

            <label className="post-selector">
              <span>Category / Business Tag</span>
              <select
                aria-label="Category / Business Tag"
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  border: '1.5px solid var(--line)', borderRadius: '0.4rem',
                  padding: '0.35rem 0.6rem', fontSize: '0.82rem', color: 'var(--ink)',
                  backgroundColor: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
              >
                {POST_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <label className="post-selector">
              <span>Post Type</span>
              <select
                aria-label="Post Type"
                value={postType}
                onChange={e => setPostType(e.target.value)}
                style={{
                  border: '1.5px solid var(--line)', borderRadius: '0.4rem',
                  padding: '0.35rem 0.6rem', fontSize: '0.82rem', color: 'var(--ink)',
                  backgroundColor: 'var(--surface)', cursor: 'pointer', fontFamily: 'var(--sans)',
                }}
              >
                <option value="GENERAL">General</option>
                <option value="QUESTION">Question</option>
                <option value="RECOMMENDATION">Recommendation</option>
                <option value="ANNOUNCEMENT">Announcement</option>
                <option value="EMERGENCY_ALERT">🚨 Emergency Alert</option>
              </select>
            </label>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Cancel */}
            <button
              type="button"
              onClick={() => { setExpanded(false); removeImage(); setError(''); setIsAd(false); }}
              style={{
                border: '1.5px solid var(--line)', borderRadius: '0.4rem',
                padding: '0.4rem 0.9rem', fontSize: '0.875rem', background: '#fff',
                cursor: 'pointer', fontFamily: 'var(--sans)', color: 'var(--muted)',
              }}
            >
              Cancel
            </button>

            {/* Share */}
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="button button-small"
            >
              {uploading ? 'Uploading…' : posting ? 'Sharing…' : 'Share'}
            </button>
          </div>

          {/* ── Ad options (Business accounts only) ── */}
          {isBusiness && (
            <div style={{
              marginTop: '0.75rem', padding: '0.85rem 1rem',
              backgroundColor: isAd ? '#fffbeb' : 'var(--cream)',
              borderRadius: '0.6rem',
              border: `1.5px solid ${isAd ? '#fcd34d' : 'var(--line)'}`,
              transition: 'all 0.15s',
            }}>
              {/* Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <div
                  onClick={() => setIsAd(v => !v)}
                  style={{
                    width: '38px', height: '20px', borderRadius: '10px', flexShrink: 0,
                    backgroundColor: isAd ? '#f59e0b' : '#d1d5db',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '2px',
                    left: isAd ? '20px' : '2px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    backgroundColor: '#fff', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: isAd ? '#92400e' : 'var(--muted)' }}>
                  📢 Is this an Advertisement?
                </span>
              </label>

              {/* Radius + duration selectors */}
              {isAd && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <label className="post-selector">
                    <span style={{ color: '#92400e' }}>Target Radius</span>
                    <select
                      value={adRadiusKm}
                      onChange={e => setAdRadiusKm(Number(e.target.value))}
                      style={{
                        border: '1.5px solid #fcd34d', borderRadius: '0.4rem',
                        padding: '0.35rem 0.6rem', fontSize: '0.82rem',
                        backgroundColor: '#fffbeb', cursor: 'pointer', fontFamily: 'var(--sans)',
                      }}
                    >
                      <option value={1}>1 km</option>
                      <option value={5}>5 km</option>
                      <option value={10}>10 km</option>
                    </select>
                  </label>

                  <label className="post-selector">
                    <span style={{ color: '#92400e' }}>Duration</span>
                    <select
                      value={adDurationDays}
                      onChange={e => setAdDurationDays(Number(e.target.value))}
                      style={{
                        border: '1.5px solid #fcd34d', borderRadius: '0.4rem',
                        padding: '0.35rem 0.6rem', fontSize: '0.82rem',
                        backgroundColor: '#fffbeb', cursor: 'pointer', fontFamily: 'var(--sans)',
                      }}
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </label>

                  <p style={{ fontSize: '0.72rem', color: '#92400e', margin: 'auto 0 0', fontStyle: 'italic' }}>
                    Ad will be visible within {adRadiusKm} km for {adDurationDays} days
                  </p>
                  <p style={{ flexBasis: '100%', fontSize: '0.75rem', color: '#78350f', margin: '0.15rem 0 0' }}>
                    Listing fee: <strong>199 Padosi Coins</strong> for this period (deducted when published). Wallet balance: {Number(walletBalance || 0).toLocaleString('en-IN')} coins.
                  </p>
                </div>
              )}
            </div>
          )}

          {!SUPABASE_CONFIGURED && (
            <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '0.5rem 0 0' }}>
              ℹ️ Image upload requires <code>VITE_SUPABASE_ANON_KEY</code> in <code>frontend/.env</code>. See setup instructions below.
            </p>
          )}

          {error && <p style={{ color: '#be123c', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{error}</p>}
        </form>
      )}
    </div>
  );
};

// ─── Emergency Alert Popup ────────────────────────────────────────────────────

/**
 * Floating popup at the top-right of the Community Feed that auto-displays
 * emergency alerts (posts with type EMERGENCY_ALERT) from nearby neighbours.
 * Includes fade-in animation, red border, and a close (×) button.
 */
const EmergencyAlertPopup = ({ radiusKm, extraAlerts = [] }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState(null);

  // Fetch emergency alerts from the regular posts endpoint filtered by postType
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await api.get('/posts', {
        params: { radiusKm, page: 0, size: 20 },
      });
      // Filter only EMERGENCY_ALERT posts from the response
      const emergencyPosts = res.data.filter(p => p.postType === 'EMERGENCY_ALERT');
      setAlerts(emergencyPosts);
    } catch {
      // Silent fail — don't break the feed
    } finally {
      setLoading(false);
    }
  }, [radiusKm]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Merge any alerts the user just created (live insertion)
  useEffect(() => {
    if (extraAlerts.length > 0) {
      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const newOnes = extraAlerts.filter(a => !existingIds.has(a.id));
        if (newOnes.length === 0) return prev;
        // Re-open popup if it was dismissed and new alerts arrive
        setDismissed(false);
        return [...newOnes, ...prev];
      });
    }
  }, [extraAlerts]);

  // Trigger fade-in after first render
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // Nothing to show
  if (dismissed || (alerts.length === 0 && !loading)) return null;

  const expandedAlert = expandedAlertId ? alerts.find(a => a.id === expandedAlertId) : null;

  return (
    <div
      className="emergency-popup"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-12px)',
      }}
    >
      {/* Close button */}
      <button
        className="emergency-popup-close"
        onClick={() => { setDismissed(true); setExpandedAlertId(null); }}
        aria-label="Dismiss emergency alerts"
      >
        ×
      </button>

      {/* Heading */}
      <div className="emergency-popup-header">
        <span className="emergency-popup-icon">⚠️</span>
        <span>ALERTS</span>
        {alerts.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, opacity: 0.7, marginRight: '1.2rem' }}>
            {alerts.length}
          </span>
        )}
      </div>

      {/* ── Expanded detail card ── */}
      {expandedAlert ? (
        <div className="emergency-detail" key={expandedAlert.id}>
          {/* Back button */}
          <button
            className="emergency-detail-back"
            onClick={() => setExpandedAlertId(null)}
          >
            ← Back to alerts
          </button>

          {/* Author row */}
          <div className="emergency-detail-author">
            <Link to={`/app/users/${expandedAlert.authorId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <Avatar name={expandedAlert.authorName} avatarUrl={expandedAlert.authorAvatarUrl} size={36} />
            </Link>
            <div style={{ minWidth: 0 }}>
              <Link
                to={`/app/users/${expandedAlert.authorId}`}
                style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)', textDecoration: 'none', display: 'block' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--teal)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink)'}
              >
                {expandedAlert.authorName}
              </Link>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                {expandedAlert.localityName}
                {expandedAlert.distanceKm > 0 && ` · ${expandedAlert.distanceKm} km away`}
              </span>
            </div>
          </div>

          {/* Alert description */}
          <p className="emergency-detail-content">{expandedAlert.content}</p>

          {/* Image (if any) */}
          {expandedAlert.imageUrl && (
            <img
              src={expandedAlert.imageUrl}
              alt="Alert"
              style={{
                width: '100%', borderRadius: '0.5rem', maxHeight: '200px',
                objectFit: 'cover', marginBottom: '0.7rem',
              }}
            />
          )}

          {/* Meta details */}
          <div className="emergency-detail-meta">
            <div className="emergency-detail-meta-row">
              <span className="emergency-detail-meta-label">📍 Location</span>
              <span>{expandedAlert.localityName}{expandedAlert.distanceKm > 0 ? ` (${expandedAlert.distanceKm} km)` : ''}</span>
            </div>
            <div className="emergency-detail-meta-row">
              <span className="emergency-detail-meta-label">🕐 Date & Time</span>
              <span>{formatDateTime(expandedAlert.createdAt)}</span>
            </div>
            <div className="emergency-detail-meta-row">
              <span className="emergency-detail-meta-label">🏷️ Category</span>
              <span>{expandedAlert.category && expandedAlert.category !== 'None' ? expandedAlert.category : 'Emergency'}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Alert list view ── */
        <div className="emergency-popup-body">
          {loading && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>Loading alerts…</p>
          )}
          {!loading && alerts.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>No emergency alerts nearby.</p>
          )}
          {alerts.map((alert, idx) => (
            <div
              key={alert.id}
              className="emergency-popup-item"
              style={{ animationDelay: `${idx * 0.08}s`, cursor: 'pointer' }}
              onClick={() => setExpandedAlertId(alert.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpandedAlertId(alert.id); }}
            >
              <div className="emergency-popup-item-header">
                <Avatar name={alert.authorName} avatarUrl={alert.authorAvatarUrl} size={26} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--ink)' }}>
                    {alert.authorName}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: '0.4rem' }}>
                    {alert.localityName} · {timeAgo(alert.createdAt)}
                  </span>
                </div>
              </div>
              <p className="emergency-popup-item-content">{alert.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Feed Page ───────────────────────────────────────────────────────────

/** Community feed page — Instagram-style, radius-filtered. */
const Feed = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radiusKm, setRadiusKm] = useState(5);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newEmergencyAlerts, setNewEmergencyAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const PAGE_SIZE = 10;

  /** Load page 0 (clears list). Called when radius changes. */
  const fetchPosts = useCallback(async (radius, query = '', category = '') => {
    setLoading(true);
    setError('');
    setPosts([]);
    try {
      const res = await api.get('/posts', { params: {
        radiusKm: radius, page: 0, size: PAGE_SIZE,
        q: query.trim() || undefined, category: category || undefined,
      } });
      setPosts(res.data);
      setPage(1);
      setHasMore(res.data.length === PAGE_SIZE);
    } catch (requestError) {
      const status = requestError.response?.status;
      const serverMessage = requestError.response?.data?.message;
      setError(status
        ? `Could not load posts (${status}): ${serverMessage || 'The server rejected the request.'}`
        : `Could not load posts: ${requestError.message || 'The backend could not be reached.'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => fetchPosts(radiusKm, searchTerm, selectedCategory), 220);
    return () => clearTimeout(timeoutId);
  }, [radiusKm, searchTerm, selectedCategory, fetchPosts]);

  useEffect(() => {
    const query = searchTerm.trim();
    let active = true;
    if (!query) {
      setPeople([]);
      setPeopleLoading(false);
      return () => { active = false; };
    }
    const timeoutId = setTimeout(async () => {
      setPeopleLoading(true);
      try {
        const res = await api.get('/users/search', { params: { q: query } });
        if (active) setPeople(res.data);
      } catch {
        if (active) setPeople([]);
      } finally {
        if (active) setPeopleLoading(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(timeoutId); };
  }, [searchTerm]);

  /** Append next page. */
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get('/posts', { params: {
        radiusKm, page, size: PAGE_SIZE,
        q: searchTerm.trim() || undefined, category: selectedCategory || undefined,
      } });
      setPosts(prev => [...prev, ...res.data]);
      setPage(p => p + 1);
      setHasMore(res.data.length === PAGE_SIZE);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  };

  return (
    <>
      {/* Scoped styles */}
      <style>{`
        .feed-card {
          background: #fff;
          border-radius: 0.85rem;
          border: 1px solid var(--line);
          box-shadow: 0 1px 3px rgba(16,41,70,0.06);
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .feed-card:hover { box-shadow: 0 4px 18px rgba(16,41,70,0.1); }
        .skel {
          background: linear-gradient(90deg, #eee 25%, #f9f9f9 50%, #eee 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rpill {
          padding: 0.28rem 0.85rem;
          border-radius: 2rem;
          border: 1.5px solid var(--line);
          background: #fff;
          cursor: pointer;
          font-size: 0.82rem;
          font-family: var(--sans);
          color: var(--muted);
          transition: all 0.15s;
        }
        .rpill.active {
          background: var(--teal);
          border-color: var(--teal);
          color: #fff;
          font-weight: 600;
        }
        .rpill:hover:not(.active) { background: var(--mint); border-color: var(--teal); color: var(--teal); }
        .load-more-btn {
          display: block; width: 100%;
          padding: 0.75rem; margin-top: 0.5rem;
          border: 1.5px solid var(--line); border-radius: 0.75rem;
          background: #fff; cursor: pointer;
          font-family: var(--sans); font-size: 0.9rem;
          color: var(--teal); font-weight: 600;
          transition: background 0.15s;
        }
        .load-more-btn:hover:not(:disabled) { background: var(--mint); }
        .load-more-btn:disabled { opacity: 0.6; cursor: default; }
        .post-category-tag {
          display: inline-flex; align-items: center; flex-shrink: 0; padding: .2rem .5rem; border-radius: 999px;
          background: var(--mint); color: var(--teal); font-size: .68rem; font-weight: 700;
        }
        .post-meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: .3rem .5rem; }
        .post-type-emoji { font-size: .92rem; line-height: 1; }
        .post-selector { display: grid; gap: .2rem; color: var(--muted); font: 600 .68rem var(--sans); }
        .feed-search-input {
          width: 100%; border: 1px solid var(--line); border-radius: 999px;
          padding: .72rem 1rem; background: var(--surface); color: var(--ink);
          font: .9rem var(--sans); outline: none;
        }
        .feed-search-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px color-mix(in srgb, var(--teal) 15%, transparent); }
        .feed-category-pill {
          border: 1px solid var(--line); border-radius: 999px; padding: .38rem .7rem;
          background: var(--surface); color: var(--muted); font: 600 .76rem var(--sans); cursor: pointer;
          white-space: nowrap;
        }
        .feed-category-pill.active { background: var(--teal); border-color: var(--teal); color: #fff; }
        .feed-people-result { display: flex; align-items: center; gap: .7rem; padding: .65rem .75rem; color: var(--ink); text-decoration: none; border-radius: .65rem; }
        .feed-people-result:hover { background: var(--cream); }

        /* ── Emergency Alert Popup ── */
        .emergency-popup {
          position: fixed;
          top: 5.5rem;
          right: 1.25rem;
          width: 340px;
          max-height: calc(100vh - 7rem);
          background: var(--surface);
          border: 2px solid #dc2626;
          border-radius: 0.85rem;
          box-shadow: 0 8px 32px rgba(220,38,38,0.18), 0 2px 8px rgba(0,0,0,0.08);
          z-index: 900;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .emergency-popup-close {
          position: absolute;
          top: 0.55rem;
          right: 0.6rem;
          background: none;
          border: none;
          font-size: 1.35rem;
          color: var(--muted);
          cursor: pointer;
          line-height: 1;
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          transition: color 0.15s, background 0.15s;
        }
        .emergency-popup-close:hover {
          color: #dc2626;
          background: #fef2f2;
        }
        .emergency-popup-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.7rem 1rem;
          border-bottom: 1px solid #fecaca;
          background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
          font-weight: 800;
          font-size: 0.88rem;
          color: #dc2626;
          letter-spacing: 0.06em;
          font-family: var(--sans);
        }
        .emergency-popup-icon {
          font-size: 1.1rem;
          animation: alertPulse 2s ease-in-out infinite;
        }
        @keyframes alertPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .emergency-popup-body {
          padding: 0.65rem 0.85rem;
          overflow-y: auto;
          flex: 1;
          max-height: 380px;
        }
        .emergency-popup-item {
          padding: 0.6rem 0.45rem;
          border-bottom: 1px solid var(--line);
          animation: alertSlideIn 0.35s ease both;
          border-radius: 0.45rem;
          transition: background 0.15s;
        }
        .emergency-popup-item:hover {
          background: #fef2f2;
        }
        .emergency-popup-item:last-child { border-bottom: none; }
        .emergency-popup-item-header {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 0.3rem;
        }
        .emergency-popup-item-content {
          margin: 0;
          font-size: 0.82rem;
          color: var(--ink);
          line-height: 1.5;
          padding-left: 2.15rem;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Expanded detail card ── */
        @keyframes detailFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .emergency-detail {
          padding: 0.75rem 1rem 1rem;
          overflow-y: auto;
          max-height: 420px;
          animation: detailFadeIn 0.3s ease both;
        }
        .emergency-detail-back {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--teal);
          font-weight: 600;
          font-size: 0.78rem;
          font-family: var(--sans);
          padding: 0.2rem 0;
          margin-bottom: 0.65rem;
          display: inline-flex;
          align-items: center;
          transition: color 0.15s;
        }
        .emergency-detail-back:hover { color: var(--ink); }
        .emergency-detail-author {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.7rem;
        }
        .emergency-detail-content {
          margin: 0 0 0.75rem;
          font-size: 0.9rem;
          color: var(--ink);
          line-height: 1.65;
          word-break: break-word;
        }
        .emergency-detail-meta {
          background: var(--cream);
          border: 1px solid var(--line);
          border-radius: 0.6rem;
          padding: 0.55rem 0.75rem;
        }
        .emergency-detail-meta-row {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          padding: 0.3rem 0;
          font-size: 0.8rem;
          color: var(--ink);
        }
        .emergency-detail-meta-row + .emergency-detail-meta-row {
          border-top: 1px solid var(--line);
        }
        .emergency-detail-meta-label {
          font-weight: 700;
          font-size: 0.72rem;
          color: var(--muted);
          min-width: 6.5rem;
          flex-shrink: 0;
        }

        /* Responsive: collapse popup on narrow screens */
        @media (max-width: 768px) {
          .emergency-popup {
            left: 0.5rem;
            right: 0.5rem;
            width: auto;
            top: 4.5rem;
          }
        }
      `}</style>

      {/* Emergency Alert Popup — floats at top-right corner of the Community Feed */}
      <EmergencyAlertPopup radiusKm={radiusKm} extraAlerts={newEmergencyAlerts} />

      {/* Centered Instagram-style feed column */}
      <div style={{ maxWidth: '614px', margin: '0 auto', paddingBottom: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontFamily: 'var(--serif)', margin: 0, fontSize: '1.55rem', color: 'var(--ink)' }}>
            Community Feed
          </h1>
          <p style={{ color: 'var(--muted)', margin: '0.2rem 0 0', fontSize: '0.875rem' }}>
            Posts from neighbours within <strong>{radiusKm} km</strong>
          </p>
        </div>

        {/* Search people and posts */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            className="feed-search-input"
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search people, posts, #hashtags, or categories"
            aria-label="Search community feed"
          />
          <div style={{ display: 'flex', gap: '.45rem', overflowX: 'auto', padding: '.65rem 0 .2rem' }}>
            <button className={`feed-category-pill${selectedCategory === '' ? ' active' : ''}`} onClick={() => setSelectedCategory('')}>All</button>
            {POST_CATEGORIES.map(category => (
              <button
                key={category}
                className={`feed-category-pill${selectedCategory === category ? ' active' : ''}`}
                onClick={() => setSelectedCategory(current => current === category ? '' : category)}
              >{category}</button>
            ))}
          </div>
        </div>

        {!!searchTerm.trim() && (
          <section aria-label="People search results" style={{ marginBottom: '1rem' }}>
            {people.length > 0 && <h2 style={{ fontSize: '.82rem', color: 'var(--muted)', margin: '0 0 .35rem .25rem' }}>PEOPLE</h2>}
            {people.map(person => (
              <Link className="feed-people-result" key={person.id} to={`/app/users/${person.id}`}>
                <Avatar name={person.fullName} avatarUrl={person.avatarUrl} size={38} />
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', fontSize: '.88rem' }}>{person.fullName}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: '.76rem' }}>@{person.handle} · {person.localityName}</span>
                </span>
              </Link>
            ))}
            {peopleLoading && <p style={{ color: 'var(--muted)', fontSize: '.8rem', paddingLeft: '.3rem' }}>Searching people…</p>}
          </section>
        )}

        {/* Radius pills */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginRight: '0.1rem' }}>Radius:</span>
          {[1, 5, 10].map(r => (
            <button key={r} className={`rpill${radiusKm === r ? ' active' : ''}`}
              onClick={() => setRadiusKm(r)}>
              {r} km
            </button>
          ))}
        </div>

        {/* Create post */}
        <CreatePostBox
          currentUser={user}
          onCreated={(newPost) => {
            setPosts(prev => [newPost, ...prev]);
            // If the new post is an emergency alert, push it into the popup too
            if (newPost.postType === 'EMERGENCY_ALERT') {
              setNewEmergencyAlerts(prev => [newPost, ...prev]);
            }
          }}
        />

        {/* Error banner */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem',
            padding: '0.9rem 1rem', color: '#be123c', fontSize: '0.875rem', marginBottom: '1rem',
          }}>
            ⚠️ {error}{' '}
            <button onClick={() => fetchPosts(radiusKm, searchTerm, selectedCategory)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#be123c', fontWeight: '700', fontSize: '0.875rem', textDecoration: 'underline',
            }}>Retry</button>
          </div>
        )}

        {/* Skeletons */}
        {loading && [1, 2, 3].map(n => <PostSkeleton key={n} />)}

        {/* Empty state */}
        {!loading && !error && posts.length === 0 && !(searchTerm.trim() || selectedCategory) && (
          <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            backgroundColor: '#fff', borderRadius: '0.85rem', border: '1px solid var(--line)',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏘️</div>
            <p style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--ink)', margin: '0 0 0.4rem' }}>
              No posts nearby yet
            </p>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
              Be the first to share something with your neighbourhood!
            </p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (searchTerm.trim() || selectedCategory) && !peopleLoading && people.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '.85rem' }}>
            <p style={{ color: 'var(--ink)', fontWeight: 700, margin: '0 0 .35rem' }}>No results found</p>
            <p style={{ color: 'var(--muted)', fontSize: '.88rem', margin: 0 }}>Try another name, keyword, hashtag, or category.</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (searchTerm.trim() || selectedCategory) && people.length > 0 && (
          <p style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '.88rem' }}>No matching posts found.</p>
        )}

        {/* Post list */}
        {!loading && posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
          />
        ))}

        {/* Load more */}
        {!loading && hasMore && posts.length > 0 && (
          <button className="load-more-btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : 'Load more posts'}
          </button>
        )}

        {/* End of feed */}
        {!loading && !hasMore && posts.length > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '1.25rem 0' }}>
            ✓ You've seen all posts within {radiusKm} km
          </p>
        )}
      </div>
    </>
  );
};

export default Feed;
