import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';
import { uploadMarketplaceImage } from '../api/supabaseClient';

const CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '🏪' },
  { id: 'ELECTRONICS', label: 'Electronics', icon: '📱' },
  { id: 'FURNITURE', label: 'Furniture', icon: '🛋️' },
  { id: 'HOME', label: 'Home & Kitchen', icon: '🏠' },
  { id: 'CLOTHING', label: 'Fashion & Accessories', icon: '👕' },
  { id: 'BOOKS', label: 'Books & Study', icon: '📚' },
  { id: 'OTHER', label: 'Other', icon: '📦' }
];

const conditionColor = { GOOD: 'var(--mint)', FAIR: '#fff3e0', POOR: '#fce4ec' };

const getCategoryIcon = (id) => CATEGORIES.find(c => c.id === id)?.icon || '📦';
const getCategoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label || 'Other';

const ListingCard = ({ listing, onClick, onToggleSave }) => {
  return (
    <article 
      onClick={() => onClick(listing)}
      className="listing-card"
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        backgroundColor: 'var(--cream)',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: '1px solid var(--line)'
      }}>
        {listing.imageUrl ? (
          <img src={listing.imageUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '3.5rem', opacity: 0.8 }}>{getCategoryIcon(listing.category)}</span>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleSave(listing.id); }} 
          title={listing.isSaved ? "Unsave Listing" : "Save Listing"}
          style={{ 
            position: 'absolute', top: '0.75rem', right: '0.75rem', 
            background: 'rgba(255, 255, 255, 0.9)', border: 'none', 
            borderRadius: '50%', width: '36px', height: '36px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', fontSize: '1.2rem',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            transition: 'transform 0.1s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {listing.isSaved ? '❤️' : '🤍'}
        </button>
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--ink)' }}>
          {Number(listing.price) === 0 ? 'Free' : `₹${Number(listing.price).toLocaleString('en-IN')}`}
        </h3>
        <p style={{ margin: '0.25rem 0', fontSize: '1rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.title}
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {listing.localityName}
        </p>
      </div>
    </article>
  );
};

const CreateListingModal = ({ onClose, onListingCreated, user }) => {
  const [formData, setFormData] = useState({ title: '', price: '', category: 'OTHER', itemCondition: 'GOOD', description: '' });
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadMarketplaceImage(imageFile, user.id);
      }
      const res = await api.post('/marketplace', { ...formData, imageUrl });
      onListingCreated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while creating the listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(16, 41, 70, 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--serif)', color: 'var(--ink)' }}>Create New Listing</h2>
          <button onClick={() => onClose(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
        </div>
        
        {errorMsg && <div style={{ backgroundColor: '#fce4ec', color: '#c62828', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem' }}>{errorMsg}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Image</label>
            <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Title</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)' }} placeholder="What are you selling?" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Price (₹)</label>
            <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)' }} placeholder="0 for free items" />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Category</label>
              <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)', backgroundColor: '#fff' }}>
                {CATEGORIES.filter(c => c.id !== 'ALL').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Condition</label>
              <select required value={formData.itemCondition} onChange={e => setFormData({...formData, itemCondition: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)', backgroundColor: '#fff' }}>
                <option value="GOOD">Good / Like New</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>Description</label>
            <textarea rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)', resize: 'vertical' }} placeholder="Item details, flaws, pick-up preferences..." />
          </div>
          <button type="submit" disabled={isSubmitting} style={{ backgroundColor: 'var(--teal)', color: 'white', padding: '0.85rem', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1rem', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
            {isSubmitting ? 'Publishing...' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  );
};

const ListingDetailModal = ({ listing, onClose, onReport }) => {
  const [reportReason, setReportReason] = useState('INAPPROPRIATE');
  const [isReporting, setIsReporting] = useState(false);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(16, 41, 70, 0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', overflow: 'hidden' }} className="listing-detail-container">
        
        {/* Left Side: Image */}
        <div style={{ flex: '1.2', backgroundColor: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} className="listing-detail-image-area">
          {listing.imageUrl ? (
             <img src={listing.imageUrl} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
             <span style={{ fontSize: '8rem', opacity: 0.8 }}>{getCategoryIcon(listing.category)}</span>
          )}
          <button onClick={onClose} style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.5rem', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} className="mobile-close-btn">
            &times;
          </button>
        </div>
        
        {/* Right Side: Details */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 'bold', color: 'var(--ink)' }}>{listing.title}</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }} className="desktop-close-btn">&times;</button>
            </div>
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', color: 'var(--teal)' }}>
              {Number(listing.price) === 0 ? 'Free' : `₹${Number(listing.price).toLocaleString('en-IN')}`}
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ backgroundColor: 'var(--cream)', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '600' }}>
                 📍 {listing.localityName}
              </span>
              <span style={{ backgroundColor: 'var(--cream)', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '600' }}>
                 {getCategoryIcon(listing.category)} {getCategoryLabel(listing.category)}
              </span>
              <span style={{ backgroundColor: conditionColor[listing.itemCondition] || 'var(--mint)', padding: '0.3rem 0.75rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: '600' }}>
                 {listing.itemCondition} condition
              </span>
            </div>

            <p style={{ margin: '0 0 2rem 0', fontSize: '1rem', lineHeight: '1.6', color: 'var(--ink)' }}>
              {listing.description || 'No description provided.'}
            </p>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--ink)' }}>Seller Information</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                 <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.25rem', overflow: 'hidden' }}>
                    {listing.sellerAvatarUrl ? <img src={listing.sellerAvatarUrl} alt={listing.sellerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : listing.sellerName.charAt(0).toUpperCase()}
                 </div>
                 <div>
                    <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--ink)' }}>{listing.sellerName}</strong>
                 </div>
              </div>
              
              <button style={{ width: '100%', padding: '0.85rem', backgroundColor: 'var(--teal)', color: 'white', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                ✉️ Message Seller
              </button>

              <div style={{ backgroundColor: 'var(--cream)', padding: '1rem', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>Report Listing</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--line)' }}>
                    <option value="INAPPROPRIATE">Inappropriate</option>
                    <option value="SCAM">Scam</option>
                    <option value="COUNTERFEIT">Counterfeit</option>
                    <option value="OTHER">Other</option>
                  </select>
                  <button onClick={async () => { setIsReporting(true); await onReport(listing.id, reportReason); setIsReporting(false); }} disabled={isReporting} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--ink)', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                    {isReporting ? '...' : 'Report'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('RECOMMENDED');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [viewingSaved, setViewingSaved] = useState(false);
  const [searchRadius, setSearchRadius] = useState(user?.searchRadiusKm || 5);

  useEffect(() => {
    fetchListings();
  }, [viewingSaved, searchRadius]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const endpoint = viewingSaved ? '/marketplace/saved' : '/marketplace';
      const res = await api.get(endpoint, {
        params: !viewingSaved ? { radius: searchRadius } : {}
      });
      setListings(res.data);
      setError('');
    } catch (_err) {
      setError('Could not load listings. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async (id) => {
    try {
      await api.post(`/marketplace/${id}/save`);
      setListings(prev => prev.map(l => l.id === id ? { ...l, isSaved: !l.isSaved } : l));
      if (viewingSaved) {
        setListings(prev => prev.filter(l => l.isSaved || l.id !== id));
      }
    } catch (e) {
      console.error(e);
      alert('Failed to save listing');
    }
  };

  const handleReport = async (id, reason) => {
    try {
      await api.post(`/marketplace/${id}/report`, { reason, description: '' });
      alert('Listing reported successfully. Our team will review it.');
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to report listing, or you have already reported it.');
    }
  };

  const filteredListings = listings.filter(l => {
    if (selectedCategory !== 'ALL' && l.category !== selectedCategory) return false;
    if (searchQuery && !l.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(l.description && l.description.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'PRICE_LOW') return a.price - b.price;
    if (sortBy === 'PRICE_HIGH') return b.price - a.price;
    if (sortBy === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100%', alignItems: 'flex-start' }} className="marketplace-layout">
      <style>{`
        .marketplace-sidebar {
           width: 280px;
           flex-shrink: 0;
           position: sticky;
           top: 2rem;
           display: flex;
           flex-direction: column;
           gap: 1.5rem;
           height: calc(100vh - 4rem);
           padding-right: 1.5rem;
           border-right: 1px solid var(--line);
        }
        .marketplace-main {
           flex: 1;
           min-width: 0;
           padding-left: 1.5rem;
        }
        .listing-grid {
           display: grid;
           grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
           gap: 1.5rem;
        }
        .listing-card:hover img {
           transform: scale(1.05);
        }
        .listing-card img {
           transition: transform 0.3s ease;
        }
        .mobile-search-bar { display: none; }
        .mobile-close-btn { display: none !important; }
        
        @media (max-width: 992px) {
           .listing-detail-container { flex-direction: column; }
           .listing-detail-image-area { flex: none; height: 300px; }
           .desktop-close-btn { display: none !important; }
           .mobile-close-btn { display: flex !important; }
        }
        
        @media (max-width: 768px) {
           .marketplace-layout { flex-direction: column; }
           .marketplace-sidebar { display: none; }
           .marketplace-main { padding-left: 0; width: 100%; }
           .mobile-search-bar { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem; }
           .listing-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
        }
      `}</style>

      <aside className="marketplace-sidebar">
        <div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.75rem', margin: '0 0 1.25rem 0', color: 'var(--ink)' }}>Marketplace</h1>
          <div style={{ position: 'relative' }}>
             <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
             <input 
               type="text" 
               placeholder="Search Marketplace" 
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '99px', border: 'none', backgroundColor: 'var(--cream)', fontSize: '0.95rem' }} 
             />
          </div>
        </div>

        <button 
          onClick={() => setIsCreateOpen(true)}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#e2edf6', color: 'var(--ink)', borderRadius: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem', color: 'var(--teal)' }}>+</span> Create New Listing
        </button>
        
        <button 
          onClick={() => setViewingSaved(!viewingSaved)}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: viewingSaved ? 'var(--mint)' : 'transparent', color: viewingSaved ? 'var(--teal)' : 'var(--ink)', borderRadius: '0.5rem', fontWeight: 'bold', border: viewingSaved ? 'none' : '1px solid var(--line)', cursor: 'pointer' }}>
          {viewingSaved ? 'Back to All Listings' : '❤️ View Saved Listings'}
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--ink)' }}>Categories</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {CATEGORIES.map(category => (
              <li key={category.id}>
                <button
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: selectedCategory === category.id ? 'var(--cream)' : 'transparent',
                    color: selectedCategory === category.id ? 'var(--teal)' : 'var(--ink)',
                    fontWeight: selectedCategory === category.id ? '600' : '400',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.95rem',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => { if(selectedCategory !== category.id) e.currentTarget.style.backgroundColor = '#f9f6ef80'; }}
                  onMouseOut={(e) => { if(selectedCategory !== category.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: selectedCategory === category.id ? 'var(--mint)' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {category.icon}
                  </div>
                  {category.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--line)', fontSize: '0.85rem', color: 'var(--muted)' }}>
           <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: 'var(--ink)' }}>Search Radius: {searchRadius} km</label>
           <input 
             type="range" 
             min="0" 
             max="10" 
             value={searchRadius} 
             onChange={(e) => setSearchRadius(Number(e.target.value))} 
             style={{ width: '100%', accentColor: 'var(--teal)' }}
           />
        </div>
      </aside>

      <main className="marketplace-main">
        <div className="mobile-search-bar">
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: '1.5rem', margin: 0, color: 'var(--ink)' }}>Marketplace</h1>
          <input 
             type="text" 
             placeholder="Search listings..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '99px', border: '1px solid var(--line)', backgroundColor: '#fff', fontSize: '0.95rem' }} 
          />
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
             {CATEGORIES.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => setSelectedCategory(c.id)}
                  style={{ whiteSpace: 'nowrap', padding: '0.5rem 1rem', borderRadius: '99px', border: 'none', background: selectedCategory === c.id ? 'var(--ink)' : 'var(--cream)', color: selectedCategory === c.id ? 'white' : 'var(--ink)', fontWeight: '600', cursor: 'pointer' }}
                >
                  {c.label}
                </button>
             ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink)', fontWeight: '700' }}>
              {viewingSaved ? 'Saved Listings' : (selectedCategory === 'ALL' ? "Today's Picks" : `${getCategoryLabel(selectedCategory)}`)}
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              {viewingSaved ? 'Your bookmarked items' : `Discover great deals in ${user?.locality || 'your neighbourhood'}`}
            </p>
          </div>
          
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '99px', border: '1px solid var(--line)', backgroundColor: 'transparent', color: 'var(--ink)', fontWeight: '600', cursor: 'pointer', outline: 'none' }}
          >
             <option value="RECOMMENDED">Recommended</option>
             <option value="NEWEST">Newest First</option>
             <option value="PRICE_LOW">Price: Low to High</option>
             <option value="PRICE_HIGH">Price: High to Low</option>
          </select>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fce4ec', color: '#c62828', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
             {error}
          </div>
        )}

        {loading ? (
          <div className="listing-grid">
             {[...Array(8)].map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--cream)', borderRadius: '0.5rem', animation: 'pulse 1.5s infinite' }} />
                   <div style={{ height: '1.25rem', width: '40%', backgroundColor: 'var(--cream)', borderRadius: '0.25rem' }} />
                   <div style={{ height: '1rem', width: '80%', backgroundColor: 'var(--cream)', borderRadius: '0.25rem' }} />
                   <div style={{ height: '0.85rem', width: '60%', backgroundColor: 'var(--cream)', borderRadius: '0.25rem' }} />
                </div>
             ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--muted)', backgroundColor: 'var(--cream)', borderRadius: '1rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🛒</span>
            <h3 style={{ color: 'var(--ink)', margin: '0 0 0.5rem 0' }}>No items found</h3>
            <p style={{ margin: 0 }}>Try adjusting your filters, search term, or check back later!</p>
          </div>
        ) : (
          <div className="listing-grid">
            {filteredListings.map(l => <ListingCard key={l.id} listing={l} onClick={setSelectedListing} onToggleSave={handleToggleSave} />)}
          </div>
        )}
      </main>

      {isCreateOpen && <CreateListingModal user={user} onClose={() => setIsCreateOpen(false)} onListingCreated={(newListing) => { setListings([newListing, ...listings]); }} />}
      {selectedListing && <ListingDetailModal listing={selectedListing} onClose={() => setSelectedListing(null)} onReport={handleReport} />}
    </div>
  );
};

export default Marketplace;
