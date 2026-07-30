import { useState, useCallback } from 'react';
import { X, Loader, ExternalLink, CheckCircle, Copy, Wallet, Banknote, Smartphone, CreditCard } from 'lucide-react';
import api from '../../services/api';
import Alert from '../common/Alert';
import { useToast } from '../../context/ToastContext';

const CHANNELS = [
  { id: 'card', label: 'Card', icon: CreditCard, desc: 'Debit/credit card' },
  { id: 'bank', label: 'Bank Transfer', icon: Banknote, desc: 'Transfer from your bank' },
  { id: 'ussd', label: 'USSD', icon: Smartphone, desc: 'Dial a code on your phone' },
  { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'Pay with mobile wallet' },
];

const MODAL_STYLES = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', padding: '28px 32px',
    maxWidth: 460, width: '100%', position: 'relative',
    maxHeight: '90vh', overflowY: 'auto',
  },
  label: {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: 'var(--color-text)', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 14px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
    fontSize: '1.2rem', background: 'var(--color-bg)',
    color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', fontWeight: 700,
  },
  btnPrimary: {
    padding: '12px 20px', background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600,
    fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: 8,
    transition: 'all 0.2s', width: '100%', justifyContent: 'center',
  },
  presetBtn: (isActive) => ({
    padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
    borderRadius: 'var(--radius-pill)', transition: 'all 0.2s',
    border: isActive ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    background: isActive ? 'var(--color-primary)' : 'var(--color-bg)',
    color: isActive ? '#fff' : 'var(--color-text)',
  }),
  card: {
    background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', padding: '16px 20px',
  },
};

export default function FundWalletModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [channel, setChannel] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nextSteps, setNextSteps] = useState(null);
  const toast = useToast();

  const copyToClipboard = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(
        () => toast.success('Copied to clipboard'),
        () => toast.error('Failed to copy')
      );
    }
  };

  const handlePay = useCallback(async () => {
    setError('');
    setSuccess('');
    const num = parseFloat(amount);
    if (!num || num < 100) return setError('Minimum deposit is ₦100');
    if (num > 10000000) return setError('Maximum deposit is ₦10,000,000');
    setLoading(true);
    try {
      const { data } = await api.post('/payments/initialize-deposit', { amount: num, channel });
      if (data.success) {
        const d = data.data || {};
        // Paystack returns a hosted payment URL. Redirect there for all
        // supported methods (card, bank transfer).
        if (d.authorizationUrl) {
          setSuccess('Redirecting to Paystack...');
          toast.success('Redirecting to Paystack...');
          window.location.href = d.authorizationUrl;
          return;
        }
        // Fallback for providers that return channel-specific details.
        if (channel === 'bank' && d.accountNumber) {
          setNextSteps({
            type: 'bank',
            accountNumber: d.accountNumber,
            bankName: d.bankName || '',
            accountName: d.accountName || 'Tasknija Ltd',
            amount: d.amount || num,
            reference: d.reference || ''
          });
          toast.success('Bank transfer details generated.');
          return;
        }
        const msg = d.message || data.error?.message || 'Failed to initialize payment';
        setError(msg);
        toast.error(msg);
      } else {
        const msg = data.error?.message || data.error?.code || 'Failed to initialize payment';
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.error?.code || err.message || 'Payment failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [amount, channel, toast]);

  const presetAmounts = [5000, 10000, 20000, 50000, 100000, 200000];

  function StepIcon({ type }) {
    const props = { size: 18, style: { color: 'var(--color-primary)' } };
    if (type === 'ussd') return <Smartphone {...props} />;
    if (type === 'bank') return <Banknote {...props} />;
    if (type === 'mobile_money') return <Smartphone {...props} />;
    return <ExternalLink {...props} />;
  }

  return (
    <div style={MODAL_STYLES.overlay} onClick={onClose}>
      <div style={MODAL_STYLES.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={20} style={{ color: 'var(--color-primary)' }} /> Fund Wallet
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              Deposit funds to your TaskNija wallet
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--color-text-muted)',
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: 16 }}>
            <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
          </div>
        )}
        {success && !nextSteps && (
          <div style={{
            padding: '10px 14px', background: '#16a34a12', color: '#16a34a',
            borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.85rem',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <div style={MODAL_STYLES.card}>
          <label style={{ ...MODAL_STYLES.label, marginBottom: 10 }}>Payment Method</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const active = channel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  type="button"
                  style={{
                    padding: '12px', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 'var(--radius)', transition: 'all 0.15s',
                    border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    background: active ? 'var(--color-primary-light)' : 'var(--color-bg)',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={16} color={active ? 'var(--color-primary)' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: active ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {ch.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.3 }}>
                    {ch.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <label style={MODAL_STYLES.label}>Amount</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-muted)',
            }}>₦</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={100}
              style={{ ...MODAL_STYLES.input, paddingLeft: 32 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 0 }}>
            {presetAmounts.map((pa) => (
              <button
                key={pa}
                onClick={() => setAmount(String(pa))}
                style={MODAL_STYLES.presetBtn(amount === String(pa))}
                type="button"
              >
                ₦{pa.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handlePay}
            disabled={loading || !amount}
            style={{
              ...MODAL_STYLES.btnPrimary,
              opacity: loading || !amount ? 0.6 : 1,
              cursor: loading || !amount ? 'not-allowed' : 'pointer',
            }}
            type="button"
          >
            {loading ? <Loader size={18} className="spin" /> : <ExternalLink size={18} />}
            {loading ? 'Processing...' : `Pay ₦${parseFloat(amount || 0).toLocaleString()}`}
          </button>
        </div>

        {nextSteps && (
          <div style={{
            marginTop: 20, padding: 20,
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <StepIcon type={nextSteps.type} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                {nextSteps.type === 'ussd' && 'Dial this USSD code'}
                {nextSteps.type === 'bank' && 'Transfer to this account'}
                {nextSteps.type === 'mobile_money' && 'Send mobile money to'}
              </h3>
            </div>

            {nextSteps.type === 'ussd' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <code style={{
                    flex: 1, padding: '12px 14px', background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                    fontSize: '1.1rem', fontFamily: 'monospace', fontWeight: 700,
                  }}>
                    {nextSteps.code}
                  </code>
                  <button
                    onClick={() => copyToClipboard(nextSteps.code)}
                    style={{
                      padding: '8px 12px', background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', color: 'var(--color-text-muted)',
                    }}
                    title="Copy USSD code" type="button"
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  Dial the code on your phone and follow the prompts. Do not close this page until payment is complete.
                </p>
              </div>
            )}

            {nextSteps.type === 'bank' && (
              <div style={{ display: 'grid', gap: 8, fontSize: '0.88rem' }}>
                {[
                  { label: 'Bank', value: nextSteps.bankName },
                  { label: 'Account Number', value: nextSteps.accountNumber, mono: true },
                  { label: 'Account Name', value: nextSteps.accountName },
                  { label: 'Amount', value: `₦${Number(nextSteps.amount).toLocaleString()}` },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontFamily: row.mono ? 'monospace' : 'inherit' }}>{row.value || '—'}</span>
                  </div>
                ))}
                {nextSteps.reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Reference</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>{nextSteps.reference}</span>
                  </div>
                )}
                <p style={{ margin: '8px 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Use the reference exactly as shown so we can credit your wallet automatically.
                </p>
              </div>
            )}

            {nextSteps.type === 'mobile_money' && (
              <div style={{ display: 'grid', gap: 8, fontSize: '0.88rem' }}>
                {[
                  { label: 'Provider', value: nextSteps.provider },
                  { label: 'Phone Number', value: nextSteps.number },
                  { label: 'Amount', value: `₦${Number(nextSteps.amount).toLocaleString()}` },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600 }}>{row.value || '—'}</span>
                  </div>
                ))}
                {nextSteps.reference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Reference</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.82rem' }}>{nextSteps.reference}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              style={{ ...MODAL_STYLES.btnPrimary, marginTop: 16 }}
              type="button"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
