import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function SubscriptionVerify() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      return;
    }
    api.get(`/subscriptions/verify-payment?reference=${reference}`)
      .then((res) => {
        if (res.success && res.data?.status === 'success') {
          setStatus('success');
          setMessage('Your subscription has been activated!');
        } else {
          setStatus('pending');
          setMessage(res.data?.message || 'Payment received. Your subscription will be activated shortly.');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Failed to verify payment. Contact support.');
      });
  }, [searchParams]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
      {status === 'loading' && (
        <>
          <Loader size={48} style={{ marginBottom: 16, animation: 'spin 1s linear infinite' }} />
          <h2>Verifying Payment...</h2>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={48} color="#16a34a" style={{ marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Payment Successful!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{message}</p>
          <Link to="/vendor-dashboard" style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 600 }}>
            Go to Dashboard
          </Link>
        </>
      )}
      {status === 'pending' && (
        <>
          <Loader size={48} color="#f59e0b" style={{ marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Payment Received</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{message}</p>
          <Link to="/vendor-dashboard" style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 600 }}>
            Back to Dashboard
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={48} color="#dc2626" style={{ marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Verification Failed</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{message}</p>
          <Link to="/vendor-dashboard" style={{ padding: '10px 24px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 600 }}>
            Back to Dashboard
          </Link>
        </>
      )}
    </div>
  );
}
