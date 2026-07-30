import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import api from '../services/api';
import ErrorState from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';

export default function WalletVerify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const toast = useToast();

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference found.');
      toast.error('No payment reference found.');
      return;
    }
    api.get(`/payments/verify-deposit?reference=${reference}`)
      .then((res) => {
        const payload = res?.data;
        if (payload?.wallet) {
          setStatus('success');
          setMessage(`₦${Number(payload.wallet?.balance || 0).toLocaleString()} wallet balance`);
          toast.success('Payment verified successfully.');
        } else {
          setStatus('error');
          setMessage(res?.error || 'Verification failed');
          toast.error(res?.error || 'Verification failed');
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || err.message || 'Verification failed');
        toast.error(err.response?.data?.error || err.message || 'Verification failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
      {status === 'verifying' && (
        <>
          <Loader size={48} className="spin" style={{ marginBottom: 16, color: 'var(--color-primary)' }} />
          <h2>Verifying Payment...</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Please wait while we confirm your payment</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle size={48} style={{ marginBottom: 16, color: '#16a34a' }} />
          <h2>Payment Successful!</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>{message}</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </>
      )}
      {status === 'pending' && (
        <div style={{ maxWidth: 480, background: 'var(--color-surface)', padding: 24, borderRadius: 'var(--radius)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <Clock size={48} style={{ marginBottom: 16, color: 'var(--color-primary)' }} />
          <h2>Awaiting Payment</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 16 }}>{message}</p>
          {(() => {
            const method = searchParams.get('method') || 'card';
            if (method === 'ussd') {
              return (
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 8px' }}><strong>Dial the USSD code</strong> we sent from your wallet on your registered phone number to complete payment.</p>
                  <p style={{ margin: '0', color: 'var(--color-text-muted)' }}>Your wallet will be credited automatically once the bank confirms.</p>
                </div>
              );
            }
            if (method === 'bank') {
              const acct = searchParams.get('account_number');
              const bank = searchParams.get('bank_name');
              return (
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 8px' }}><strong>Transfer</strong> the exact amount to the dedicated account:</p>
                  {bank && <div><strong>Bank:</strong> {bank}</div>}
                  {acct && <div><strong>Account:</strong> {acct}</div>}
                  <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)' }}>Use the reference included in the previous step so we can credit your wallet.</p>
                </div>
              );
            }
            if (method === 'mobile_money') {
              return (
                <div style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                  <p style={{ margin: '0 0 8px' }}><strong>Approve the mobile money prompt</strong> on your phone or transfer to the merchant number shown in the previous step.</p>
                  <p style={{ margin: '0', color: 'var(--color-text-muted)' }}>Your wallet will be credited as soon as we receive confirmation.</p>
                </div>
              );
            }
            return <p style={{ color: 'var(--color-text-muted)' }}>Complete payment via your selected method.</p>;
          })()}
          <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      )}
      {status === 'error' && (
        <>
          <ErrorState message={message} onRetry={() => navigate('/dashboard')} />
        </>
      )}
    </div>
  );
}
