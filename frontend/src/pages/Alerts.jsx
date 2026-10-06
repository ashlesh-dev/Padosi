import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const severityStyle = {
  CRITICAL: { bg: '#fee2e2', color: '#b91c1c', label: '🚨 Critical' },
  WARNING:  { bg: '#fef3c7', color: '#b45309', label: '⚠️ Warning' },
  INFO:     { bg: 'var(--mint)', color: 'var(--teal)', label: 'ℹ️ Info' },
};

const typeEmoji = {
  MEDICAL: '🏥', FIRE: '🔥', SAFETY: '🚔', WEATHER: '🌧️', UTILITY: '💧', OTHER: '📣'
};

const AlertCard = ({ alert }) => {
  const sev = severityStyle[alert.severity] || severityStyle.INFO;
  const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <article style={{
      backgroundColor: sev.bg,
      border: `1px solid ${sev.color}33`,
      borderLeft: `4px solid ${sev.color}`,
      borderRadius: '0.75rem',
      padding: '1.25rem',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: sev.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {sev.label} · {typeEmoji[alert.alertType]} {alert.alertType}
          </span>
          <h3 style={{ margin: '0.25rem 0', fontSize: '1rem', color: '#1a1a1a' }}>{alert.title}</h3>
        </div>
        <small style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{timeAgo(alert.createdAt)}</small>
      </div>
      {alert.description && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', lineHeight: 1.6 }}>{alert.description}</p>
      )}
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}>
        Posted by {alert.authorName} · {alert.localityName}
      </p>
    </article>
  );
};

/** Emergency alerts page — shows active, unexpired alerts near the user. */
const Alerts = () => {
  const { user } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/alerts');
        setAlerts(res.data);
      } catch (err) {
        setError('Could not load alerts. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', marginBottom: '0.25rem' }}>Emergency Alerts</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
        Active alerts within {user?.searchRadiusKm || 5} km of you
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Checking for alerts…</p>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#fff', borderRadius: '0.75rem', border: '1px solid var(--line)' }}>
          <p style={{ fontSize: '2rem' }}>✅</p>
          <p style={{ color: 'var(--muted)' }}>No active alerts in your area.<br />Stay safe!</p>
        </div>
      ) : (
        alerts.map(a => <AlertCard key={a.id} alert={a} />)
      )}
    </div>
  );
};

export default Alerts;
