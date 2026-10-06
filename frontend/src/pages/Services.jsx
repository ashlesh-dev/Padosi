import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const ProviderCard = ({ provider }) => (
  <article style={{
    backgroundColor: '#fff',
    border: '1px solid var(--line)',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.75rem',
  }}>
    {/* Avatar or icon */}
    <div style={{
      width: '48px', height: '48px', borderRadius: '50%',
      backgroundColor: 'var(--teal)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: '700', fontSize: '1.1rem', flexShrink: 0
    }}>
      {provider.providerName?.charAt(0).toUpperCase() || '?'}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{provider.providerName}</h3>
          <small style={{ color: 'var(--muted)' }}>{provider.categoryName} · {provider.localityName}</small>
        </div>
        {provider.available && (
          <span style={{
            fontSize: '0.72rem', padding: '0.2rem 0.6rem',
            borderRadius: '99px', fontWeight: '600',
            backgroundColor: 'var(--mint)', color: 'var(--teal)'
          }}>
            Available
          </span>
        )}
      </div>
      <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', fontWeight: '500' }}>{provider.headline}</p>
      {provider.description && (
        <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {provider.description}
        </p>
      )}
      {provider.contactPhone && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
          📞 <a href={`tel:${provider.contactPhone}`} style={{ color: 'var(--orange)' }}>{provider.contactPhone}</a>
        </p>
      )}
      {provider.experienceYears != null && (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
          {provider.experienceYears}+ years experience
        </p>
      )}
    </div>
  </article>
);

/** Local service providers page — shows radius-filtered available providers. */
const Services = () => {
  const { user } = useContext(AuthContext);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/services');
        setProviders(res.data);
      } catch (err) {
        setError('Could not load service providers. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', marginBottom: '0.25rem' }}>Local Services</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Trusted service providers within {user?.searchRadiusKm || 5} km · sorted by proximity
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Finding providers near you…</p>
      ) : providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <p style={{ fontSize: '2rem' }}>🔧</p>
          <p>No service providers listed nearby yet.<br />Check back later!</p>
        </div>
      ) : (
        providers.map(p => <ProviderCard key={p.id} provider={p} />)
      )}
    </div>
  );
};

export default Services;
