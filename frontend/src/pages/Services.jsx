import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const DURATION_OPTIONS = [7, 14, 30];

const ServiceCard = ({ provider, currentUserId, onMessage }) => (
  <article style={{ background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: '0.9rem', padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 3px 12px rgba(15, 23, 42, 0.04)' }}>
    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
      {provider.avatarUrl ? (
        <img src={provider.avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: '50%', background: '#ccfbf1', color: '#0f766e', display: 'grid', placeItems: 'center', fontSize: '1.25rem', fontWeight: 700 }}>
          {provider.categoryIcon || '🛠️'}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--teal)', background: '#ccfbf1', padding: '0.2rem 0.5rem', borderRadius: 999 }}>{provider.categoryName}</span>
          {provider.available && <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700 }}>Available</span>}
        </div>
        <h3 style={{ margin: '0.35rem 0 0', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{provider.headline}</h3>
        <p style={{ margin: '0.15rem 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>by {provider.providerName} · 📍 {provider.localityName}</p>
      </div>
    </div>
    {provider.description && <p style={{ margin: 0, color: 'var(--ink)', lineHeight: 1.5, fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>{provider.description}</p>}
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', color: 'var(--muted)', fontSize: '0.78rem' }}>
      {provider.experienceYears != null && <span>⭐ {provider.experienceYears} years experience</span>}
      {provider.contactPhone && <a href={`tel:${provider.contactPhone}`} style={{ color: 'var(--teal)', textDecoration: 'none' }}>📞 {provider.contactPhone}</a>}
      {provider.expiresAt && <span>Listed until {new Date(provider.expiresAt).toLocaleDateString()}</span>}
    </div>
    <button
      type="button"
      onClick={() => onMessage(provider)}
      disabled={Number(provider.providerUserId) === Number(currentUserId)}
      style={{ marginTop: 'auto', width: '100%', border: 0, borderRadius: '0.55rem', padding: '0.7rem', background: Number(provider.providerUserId) === Number(currentUserId) ? 'var(--cream)' : 'var(--teal)', color: Number(provider.providerUserId) === Number(currentUserId) ? 'var(--muted)' : '#fff', fontWeight: 700, cursor: Number(provider.providerUserId) === Number(currentUserId) ? 'default' : 'pointer' }}
    >
      {Number(provider.providerUserId) === Number(currentUserId) ? 'Your service listing' : '💬 Contact service provider'}
    </button>
  </article>
);

const ServiceListingModal = ({ categories, balance, existingListing, onClose, onCreated }) => {
  const [form, setForm] = useState(() => existingListing ? {
    categoryId: existingListing.categoryId,
    headline: existingListing.headline || '',
    description: existingListing.description || '',
    contactPhone: existingListing.contactPhone || '',
    experienceYears: existingListing.experienceYears ?? '',
    durationDays: existingListing.durationDays || 30,
  } : { categoryId: '', headline: '', description: '', contactPhone: '', experienceYears: '', durationDays: 30 });
  const [walletBalance, setWalletBalance] = useState(balance || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/wallet').then(response => setWalletBalance(response.data.balance)).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/services', {
        ...form,
        categoryId: Number(form.categoryId),
        experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
        durationDays: Number(form.durationDays),
      });
      onCreated(response.data);
      onClose();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not publish your service. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="service-listing-title" style={{ background: 'var(--surface, #fff)', color: 'var(--ink)', borderRadius: '1rem', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div><h2 id="service-listing-title" style={{ margin: 0, fontSize: '1.25rem' }}>{existingListing ? 'Update / renew your service' : 'List a local service'}</h2><p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.82rem' }}>Reach neighbours who need your skills.</p></div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: 0, background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>×</button>
        </div>
        {error && <p role="alert" style={{ color: '#b91c1c', background: '#fef2f2', padding: '0.7rem', borderRadius: '0.5rem', fontSize: '0.84rem' }}>{error}</p>}
        <form onSubmit={submit} style={{ display: 'grid', gap: '0.85rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>Service category
            <select required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} style={fieldStyle}>
              <option value="">Select a category</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.icon ? `${category.icon} ` : ''}{category.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>Listing title
            <input required maxLength={100} value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="e.g. Maths tutor for grades 6–10" style={fieldStyle} />
          </label>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>About your service
            <textarea rows={4} maxLength={1500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Tell neighbours what you offer, your availability, and service area." style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>Contact phone (optional)
              <input maxLength={15} value={form.contactPhone} onChange={e => setForm({ ...form, contactPhone: e.target.value })} placeholder="Phone number" style={fieldStyle} />
            </label>
            <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>Years of experience
              <input type="number" min="0" max="60" value={form.experienceYears} onChange={e => setForm({ ...form, experienceYears: e.target.value })} placeholder="Optional" style={fieldStyle} />
            </label>
          </div>
          <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600 }}>Listing duration
            <select value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} style={fieldStyle}>
              {DURATION_OPTIONS.map(days => <option key={days} value={days}>{days} days</option>)}
            </select>
          </label>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.8rem', borderRadius: '0.55rem', fontSize: '0.82rem', color: '#78350f' }}>
            Fee: <strong>199 Padosi Coins</strong> for up to 30 days. Publishing or renewing replaces your current service listing and charges this fee. Your balance: <strong>{Number(walletBalance || 0).toLocaleString('en-IN')}</strong> coins.
          </div>
          <button disabled={saving || categories.length === 0} type="submit" style={{ border: 0, borderRadius: '0.55rem', padding: '0.8rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Publishing…' : `${existingListing ? 'Update / renew' : 'Publish service'} · 199 coins`}
          </button>
        </form>
      </div>
    </div>
  );
};

const fieldStyle = { width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid var(--line)', background: 'var(--surface, #fff)', color: 'var(--ink)', boxSizing: 'border-box', font: 'inherit' };

const Services = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [localityFilter, setLocalityFilter] = useState('ALL');
  const [radius, setRadius] = useState(user?.searchRadiusKm || 5);
  const [listingOpen, setListingOpen] = useState(false);
  const [messagingId, setMessagingId] = useState(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const [providersResponse, categoriesResponse] = await Promise.all([
        api.get('/services', { params: { radiusKm: radius } }),
        api.get('/services/categories'),
      ]);
      setProviders(Array.isArray(providersResponse.data) ? providersResponse.data : []);
      setCategories(Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load local services. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [radius]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const localities = useMemo(() => [...new Set(providers.map(provider => provider.localityName).filter(Boolean))].sort(), [providers]);
  const filteredProviders = useMemo(() => providers.filter(provider => {
    if (categoryFilter !== 'ALL' && provider.categoryName !== categoryFilter) return false;
    if (localityFilter !== 'ALL' && provider.localityName !== localityFilter) return false;
    const haystack = `${provider.headline} ${provider.description || ''} ${provider.providerName} ${provider.categoryName}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  }), [providers, categoryFilter, localityFilter, query]);

  const messageProvider = async (provider) => {
    if (Number(provider.providerUserId) === Number(user?.id)) return;
    setMessagingId(provider.id);
    try {
      const response = await api.post('/chat/conversations', {
        recipientId: provider.providerUserId,
        initialMessage: `Hi, I found your ${provider.categoryName} service listing: ${provider.headline}. Is it available?`,
      });
      navigate(`/app/chats?conversationId=${response.data.id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not open a chat with this provider.');
    } finally {
      setMessagingId(null);
    }
  };

  const professional = user?.accountType === 'BUSINESS';
  const ownListing = providers.find(provider => Number(provider.providerUserId) === Number(user?.id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <div><h1 style={{ fontFamily: 'var(--serif)', margin: '0 0 0.25rem' }}>Local Services</h1><p style={{ color: 'var(--muted)', margin: 0 }}>Find tutors, electricians, artists and skilled neighbours around {user?.locality || 'your neighbourhood'}.</p></div>
        {professional ? (
          <button type="button" onClick={() => setListingOpen(true)} style={{ border: 0, borderRadius: '0.55rem', padding: '0.75rem 1rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>＋ {ownListing ? 'Update / renew your service' : 'List your service'}</button>
        ) : (
          <Link to="/app/account" style={{ borderRadius: '0.55rem', padding: '0.75rem 1rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>Upgrade to Professional</Link>
        )}
      </div>

      <section aria-label="Service filters" style={{ background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: '0.8rem', padding: '1rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(2, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }} className="service-filter-grid">
        <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700 }}>Search services
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tutor, electrician, artist…" style={fieldStyle} />
        </label>
        <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700 }}>Category
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={fieldStyle}><option value="ALL">All categories</option>{categories.map(category => <option key={category.id} value={category.name}>{category.name}</option>)}</select>
        </label>
        <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700 }}>Locality
          <select value={localityFilter} onChange={e => setLocalityFilter(e.target.value)} style={fieldStyle}><option value="ALL">All nearby localities</option>{localities.map(locality => <option key={locality}>{locality}</option>)}</select>
        </label>
        <label style={{ gridColumn: '1 / -1', display: 'grid', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700 }}>
          Search radius: {radius} km
          <input type="range" min="1" max="10" step="1" value={radius} onChange={e => setRadius(Number(e.target.value))} style={{ accentColor: 'var(--teal)' }} />
        </label>
      </section>

      {error && <div role="alert" style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: '0.6rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}><span>{error}</span><button onClick={fetchServices} type="button" style={{ border: 0, background: 'transparent', color: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Retry</button></div>}

      {loading ? <p style={{ color: 'var(--muted)' }}>Finding services within {radius} km…</p> : filteredProviders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--muted)', background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: '0.9rem' }}>
          <div style={{ fontSize: '2.5rem' }}>🧰</div>
          <h2 style={{ color: 'var(--ink)', fontSize: '1.1rem' }}>No services match these filters</h2>
          <p>Try another search, locality or radius. Professional members can be the first to list a service here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
          {filteredProviders.map(provider => <ServiceCard key={provider.id} provider={provider} currentUserId={user?.id} onMessage={messageProvider} />)}
        </div>
      )}

      {listingOpen && <ServiceListingModal categories={categories} balance={user?.padosiCoins} existingListing={ownListing} onClose={() => setListingOpen(false)} onCreated={provider => setProviders(current => [provider, ...current.filter(item => item.id !== provider.id)])} />}
      {messagingId && <div role="status" style={{ position: 'fixed', right: '1rem', bottom: '1rem', zIndex: 50, background: 'var(--ink)', color: '#fff', padding: '0.75rem 1rem', borderRadius: '0.6rem' }}>Opening chat…</div>}
      <style>{`@media(max-width: 760px) { .service-filter-grid { grid-template-columns: 1fr !important; } .service-filter-grid label { grid-column: 1 !important; } }`}</style>
    </div>
  );
};

export default Services;
