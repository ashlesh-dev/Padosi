import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [locationState, setLocationState] = useState('idle'); // idle, locating, success, error
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  
  const [localities, setLocalities] = useState([]);
  const [localityId, setLocalityId] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch localities for fallback
    const fetchLocalities = async () => {
      try {
        const res = await api.get('/localities');
        setLocalities(res.data);
      } catch (err) {
        console.error('Failed to fetch localities', err);
      }
    };
    fetchLocalities();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setLocationState('success');
        setLocalityId(''); // Clear manual fallback if exact is used
        setError('');
      },
      (err) => {
        setLocationState('error');
        setError('Unable to retrieve your location. Please select your locality manually.');
      }
    );
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!latitude && !localityId) {
      setError('Please provide your location or select a locality.');
      return;
    }
    
    setError('');
    setLoading(true);
    
    const payload = {
      fullName: name, // Updated from name to fullName to match backend DTO
      email,
      password,
      latitude,
      longitude,
      localityId: localityId ? parseInt(localityId) : null
    };
    
    try {
      const res = await api.post('/auth/register', payload);
      login(res.data.token, res.data.user);
      navigate('/app/feed');
    } catch (err) {
      // If it's a validation error, try to show the specific field errors
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const fieldErrors = Object.values(err.response.data.errors).join(', ');
        setError(`Validation failed: ${fieldErrors}`);
      } else {
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--cream)', padding: '2rem 1rem' }}>
      <div style={{ padding: '2rem', backgroundColor: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Padosi" style={{ height: '32px', marginRight: '0.5rem' }} />
          <span style={{ fontFamily: 'var(--font-brand)', fontSize: '1.25rem', fontWeight: '700', color: 'var(--ink)' }}>Padosi</span>
        </Link>
        <h2 style={{ fontFamily: 'var(--font-brand)', textAlign: 'center', marginBottom: '1.5rem', color: 'var(--ink)' }}>Join your neighborhood</h2>
        
        {error && <div style={{ color: 'red', backgroundColor: '#fee', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Email address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem' }}
            />
          </div>
          
          <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'var(--cream)', borderRadius: '0.5rem', border: '1px solid #eee' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontFamily: 'var(--font-brand)', fontSize: '1rem' }}>Location</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 1rem 0' }}>
              We need your location to show you what's happening nearby. Your exact location is never shared with others.
            </p>
            
            {locationState === 'success' ? (
              <div style={{ color: 'var(--mint)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                <span style={{ fontSize: '1.25rem' }}>✓</span> Exact location acquired
              </div>
            ) : (
              <button 
                type="button" 
                onClick={handleGetLocation}
                className="button button-light"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
              >
                {locationState === 'locating' ? 'Locating...' : 'Use my current location (Recommended)'}
              </button>
            )}
            
            {locationState === 'error' && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Or select your locality</label>
                <select 
                  value={localityId}
                  onChange={(e) => {
                    setLocalityId(e.target.value);
                    setLatitude(null);
                    setLongitude(null);
                    setLocationState('idle');
                    setError('');
                  }}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #ddd', fontSize: '1rem', backgroundColor: '#fff' }}
                >
                  <option value="">-- Select Locality --</option>
                  {localities.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}, {loc.city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="button"
            style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--orange)', fontWeight: '600' }}>Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
