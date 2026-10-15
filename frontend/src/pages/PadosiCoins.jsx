import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosInstance';

const PadosiCoins = () => {
  const { user, login } = useContext(AuthContext);
  const [wallet, setWallet] = useState({ balance: user?.padosiCoins || 0, history: [] });
  const [loading, setLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [coins, setCoins] = useState('500');
  const [paymentState, setPaymentState] = useState('idle');
  const [error, setError] = useState('');

  const loadWallet = async () => {
    try {
      const response = await api.get('/wallet');
      setWallet(response.data);
      if (response.data.balance !== user?.padosiCoins) {
        const token = localStorage.getItem('token');
        login(token, { ...user, padosiCoins: response.data.balance });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your coin wallet. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.accountType === 'BUSINESS') loadWallet();
    else setLoading(false);
  }, [user?.accountType]);

  const startDemoTopUp = async event => {
    event.preventDefault();
    const amount = Number(coins);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000) {
      setError('Choose between 1 and 1,000,000 coins.');
      return;
    }
    setError('');
    setPaymentState('processing');
    await new Promise(resolve => setTimeout(resolve, 1600));
    try {
      const response = await api.post('/wallet/demo-top-up', { coins: amount });
      setWallet(response.data);
      const token = localStorage.getItem('token');
      login(token, { ...user, padosiCoins: response.data.balance });
      setPaymentState('success');
      setTimeout(() => {
        setTopUpOpen(false);
        setPaymentState('idle');
      }, 1400);
    } catch (requestError) {
      setPaymentState('idle');
      setError(requestError.response?.data?.message || 'Demo top-up failed. Please try again.');
    }
  };

  return (
    <section style={{ maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-brand)', margin: '0 0 0.35rem' }}>🪙 Padosi Coins</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Your Professional wallet, top-ups and transaction history.</p>
      </div>

      {user?.accountType !== 'BUSINESS' ? (
        <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: '0.9rem', padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem' }}>Professional account required</h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 1rem', lineHeight: 1.6 }}>Padosi Coins and paid listings are available to Professional accounts. Enable Professional Account in your settings to access your wallet.</p>
          <Link to="/app/account#professional-account" style={{ display: 'inline-block', textDecoration: 'none', borderRadius: '0.5rem', padding: '0.7rem 1rem', background: 'var(--teal)', color: '#fff', fontWeight: 700 }}>Open Professional Account settings</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>1 coin = ₹1 · Listing fee: 199 coins per 30 days</p>
            <button type="button" onClick={() => { setError(''); setTopUpOpen(true); }} style={{ border: 0, borderRadius: '0.5rem', padding: '0.7rem 1rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>＋ Add Padosi Coins</button>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #0f766e, #134e4a)', color: '#fff', padding: '1.4rem 1.6rem', borderRadius: '0.8rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>Available balance</div>
            <strong style={{ display: 'block', fontSize: '2rem', marginTop: '0.15rem' }}>{loading ? '…' : `${Number(wallet.balance || 0).toLocaleString('en-IN')} coins`}</strong>
          </div>

          <div style={{ background: 'var(--surface, #fff)', border: '1px solid var(--line)', borderRadius: '0.8rem', padding: '1.2rem' }}>
            <h2 style={{ margin: '0 0 0.9rem', fontSize: '1rem' }}>Transaction history</h2>
            {error && !topUpOpen && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{error} <button type="button" onClick={loadWallet} style={{ marginLeft: '0.4rem', border: 0, background: 'none', color: 'var(--teal)', fontWeight: 700, cursor: 'pointer' }}>Retry</button></p>}
            {!loading && wallet.history.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.875rem', margin: 0 }}>No coin activity yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.55rem' }}>
                {wallet.history.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.8rem', border: '1px solid var(--line)', borderRadius: '0.55rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem' }}>{entry.description}</strong>
                      <small style={{ color: 'var(--muted)' }}>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Just now'} · Balance {Number(entry.balanceAfter).toLocaleString('en-IN')}</small>
                    </div>
                    <strong style={{ color: entry.entryType === 'CREDIT' ? '#047857' : '#b91c1c', whiteSpace: 'nowrap' }}>{entry.entryType === 'CREDIT' ? '+' : '−'}{Number(entry.amount).toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {topUpOpen && (
            <div role="dialog" aria-modal="true" aria-labelledby="coin-topup-title" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(15,23,42,0.6)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
              <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <h2 id="coin-topup-title" style={{ margin: 0, fontSize: '1.1rem' }}>Add Padosi Coins</h2>
                  {paymentState === 'idle' && <button type="button" aria-label="Close" onClick={() => setTopUpOpen(false)} style={{ border: 0, background: 'none', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>}
                </div>
                {paymentState === 'processing' ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <style>{`@keyframes coin-demo-spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ width: 54, height: 54, border: '5px solid #ccfbf1', borderTopColor: '#0f766e', borderRadius: '50%', margin: '0 auto 1rem', animation: 'coin-demo-spin 0.8s linear infinite' }} />
                    <strong>Simulating UPI payment…</strong>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Demo only. No UPI app is contacted and no money is charged.</p>
                  </div>
                ) : paymentState === 'success' ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}><div style={{ fontSize: '3rem' }}>✅</div><strong>Demo top-up complete</strong><p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{Number(coins).toLocaleString('en-IN')} coins added. This was a simulation, not a real payment.</p></div>
                ) : (
                  <form onSubmit={startDemoTopUp} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    <label style={{ display: 'grid', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600 }}>Coins to add<input type="number" min="1" max="1000000" step="1" value={coins} onChange={event => setCoins(event.target.value)} required style={{ padding: '0.75rem', border: '1px solid var(--line)', borderRadius: '0.5rem', fontSize: '1rem' }} /></label>
                    <div style={{ padding: '0.9rem', borderRadius: '0.6rem', background: 'var(--cream)', fontSize: '0.9rem' }}>Demo UPI amount <strong style={{ float: 'right' }}>₹{(Number(coins) || 0).toLocaleString('en-IN')}</strong></div>
                    <p style={{ margin: 0, color: '#92400e', background: '#fffbeb', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.78rem' }}>Simulation only: this does not open UPI, collect payment details, or charge real money.</p>
                    {error && <p role="alert" style={{ color: '#b91c1c', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
                    <button type="submit" style={{ padding: '0.8rem', border: 0, borderRadius: '0.5rem', background: 'var(--teal)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Simulate UPI top-up</button>
                  </form>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PadosiCoins;
