import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const categoryIcons = {
  FURNITURE: '🛋️', ELECTRONICS: '📱', BOOKS: '📚',
  CLOTHING: '👕', VEHICLES: '🛵', HOME: '🏠', OTHER: '📦'
};

const conditionColor = { GOOD: 'var(--mint)', FAIR: '#fff3e0', POOR: '#fce4ec' };

const ListingCard = ({ listing }) => {
  return (
    <article style={{
      backgroundColor: '#fff',
      border: '1px solid var(--line)',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      display: 'flex',
      gap: '1rem',
      marginBottom: '0.75rem',
    }}>
      {/* Category icon */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '0.5rem',
        backgroundColor: 'var(--mint)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0
      }}>
        {categoryIcons[listing.category] || '📦'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{listing.title}</h3>
          <strong style={{ color: 'var(--teal)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
            ₹{Number(listing.price).toLocaleString('en-IN')}
          </strong>
        </div>
        <p style={{ margin: '0.3rem 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
          {listing.sellerName} · {listing.localityName}
        </p>
        {listing.description && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', lineHeight: 1.5 }}>
            {listing.description}
          </p>
        )}
        <span style={{
          display: 'inline-block', marginTop: '0.5rem',
          fontSize: '0.72rem', padding: '0.15rem 0.5rem',
          borderRadius: '99px', fontWeight: '600',
          backgroundColor: conditionColor[listing.itemCondition] || 'var(--mint)'
        }}>
          {listing.itemCondition}
        </span>
      </div>
    </article>
  );
};

/** Second-hand marketplace page — shows radius-filtered available listings. */
const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/marketplace');
        setListings(res.data);
      } catch (err) {
        setError('Could not load listings. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', marginBottom: '0.25rem' }}>Marketplace</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Second-hand items available within {user?.searchRadiusKm || 5} km of you
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Loading listings…</p>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <p style={{ fontSize: '2rem' }}>🛒</p>
          <p>No items listed nearby yet.<br />Check back later!</p>
        </div>
      ) : (
        listings.map(l => <ListingCard key={l.id} listing={l} />)
      )}
    </div>
  );
};

export default Marketplace;
