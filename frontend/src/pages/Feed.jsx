import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

/** A single post card in the feed. */
const PostCard = ({ post }) => {
  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const typeColor = post.postType === 'ANNOUNCEMENT' ? 'var(--orange)' : 'var(--teal)';
  const typeLabel = post.postType === 'ANNOUNCEMENT' ? '📢 Announcement' : '💬 General';

  return (
    <article style={{
      backgroundColor: '#fff',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      border: '1px solid var(--line)',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Avatar */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'var(--orange)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '0.9rem', flexShrink: 0
        }}>
          {post.authorName?.charAt(0).toUpperCase() || '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.95rem' }}>{post.authorName}</strong>
            <small style={{ color: 'var(--muted)' }}>{post.localityName} · {timeAgo(post.createdAt)}</small>
          </div>
          <span style={{ fontSize: '0.72rem', color: typeColor, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {typeLabel}
          </span>
          <p style={{ margin: '0.5rem 0 0', lineHeight: 1.6 }}>{post.content}</p>
        </div>
      </div>
    </article>
  );
};

/** Community feed page — shows radius-filtered posts. */
const Feed = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('GENERAL');
  const [posting, setPosting] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data);
    } catch (err) {
      setError('Could not load posts. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/posts', { content, postType });
      setPosts(prev => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      setError('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', marginBottom: '0.25rem' }}>Community Feed</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Posts from people within {user?.searchRadiusKm || 5} km of you
      </p>

      {/* Create post box */}
      <form onSubmit={handlePost} style={{
        backgroundColor: '#fff',
        border: '1px solid var(--line)',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share something with your neighborhood…"
          rows={3}
          style={{
            width: '100%', border: 'none', outline: 'none', resize: 'vertical',
            fontFamily: 'var(--sans)', fontSize: '0.95rem', color: 'var(--ink)',
            backgroundColor: 'transparent'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--line)' }}>
          <select
            value={postType}
            onChange={e => setPostType(e.target.value)}
            style={{ border: '1px solid var(--line)', borderRadius: '0.4rem', padding: '0.3rem 0.6rem', fontSize: '0.85rem', color: 'var(--ink)' }}
          >
            <option value="GENERAL">💬 General</option>
            <option value="ANNOUNCEMENT">📢 Announcement</option>
          </select>
          <button
            type="submit"
            disabled={posting || !content.trim()}
            className="button button-small"
          >
            {posting ? 'Sharing…' : 'Share update'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      {/* Posts */}
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading posts…</p>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <p style={{ fontSize: '2rem' }}>👋</p>
          <p>No posts yet in your neighborhood.<br />Be the first to share something!</p>
        </div>
      ) : (
        posts.map(post => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
};

export default Feed;
