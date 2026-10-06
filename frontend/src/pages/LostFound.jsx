import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const kindStyle = {
  LOST:  { bg: '#fff3e0', color: '#e65100', emoji: '🔍', label: 'LOST' },
  FOUND: { bg: 'var(--mint)', color: 'var(--teal)', emoji: '✅', label: 'FOUND' },
};

const LostFoundCard = ({ item }) => {
  const kind = kindStyle[item.kind] || kindStyle.LOST;
  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <article style={{
      backgroundColor: kind.bg,
      border: `1px solid ${kind.color}33`,
      borderLeft: `4px solid ${kind.color}`,
      borderRadius: '0.75rem',
      padding: '1.25rem',
      marginBottom: '0.75rem',
      display: 'flex',
      gap: '1rem',
    }}>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: '60px', height: '60px', borderRadius: '0.5rem',
          backgroundColor: kind.color + '22', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0
        }}>
          {kind.emoji}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: '700', color: kind.color,
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            {kind.emoji} {kind.label}
          </span>
          <small style={{ color: 'var(--muted)' }}>{timeAgo(item.createdAt)}</small>
        </div>
        <h3 style={{ margin: '0.25rem 0', fontSize: '1rem' }}>{item.title}</h3>
        {item.description && (
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.875rem', lineHeight: 1.5 }}>{item.description}</p>
        )}
        {item.placeHint && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
            📍 {item.placeHint}
          </p>
        )}
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
          Reported by {item.reporterName} · {item.localityName}
        </p>
      </div>
    </article>
  );
};

/** Lost & Found page — separate from the main feed and emergency alerts. */
const LostFound = () => {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/alerts/lost-found');
        setItems(res.data);
      } catch (err) {
        setError('Could not load lost & found items. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = filter === 'ALL' ? items : items.filter(i => i.kind === filter);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', marginBottom: '0.25rem' }}>Lost &amp; Found</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Open notices within {user?.searchRadiusKm || 5} km of you
      </p>

      {/* Filter buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {['ALL', 'LOST', 'FOUND'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.35rem 0.9rem',
              borderRadius: '99px',
              border: '1px solid var(--line)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: filter === f ? '700' : '400',
              backgroundColor: filter === f ? 'var(--ink)' : '#fff',
              color: filter === f ? '#fff' : 'var(--ink)',
              transition: 'all 0.15s',
            }}
          >
            {f === 'LOST' ? '🔍 Lost' : f === 'FOUND' ? '✅ Found' : 'All'}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading notices…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: '2rem' }}>🔍</p>
          <p style={{ color: 'var(--muted)' }}>No {filter !== 'ALL' ? filter.toLowerCase() : ''} notices nearby.</p>
        </div>
      ) : (
        filtered.map(item => <LostFoundCard key={item.id} item={item} />)
      )}
    </div>
  );
};

export default LostFound;
