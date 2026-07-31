import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import { Mail, ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { verifyEmailAndSignIn, resendVerificationEmail } = useAuth();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [devOtp, setDevOtp] = useState(null);

  function goHome(profile) {
    const role = profile?.role;
    if (role === 'admin') return navigate('/admin');
    if (role === 'vendor' || role === 'property_owner') return navigate('/vendor-dashboard');
    return navigate('/dashboard');
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    if (!email) { setError('Enter your email address.'); return; }
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your email.'); return; }

    setLoading(true);
    const { data, error: err } = await verifyEmailAndSignIn(email, code);
    setLoading(false);
    if (err) { setError(err.message); toast.error(err.message); return; }

    toast.success('Email verified. Welcome to TaskNija!');
    goHome(data?.profile);
  }

  async function handleResend(e) {
    e.preventDefault();
    setError('');
    if (!email) { setError('Enter your email address first.'); return; }
    setResending(true);
    const { data, error: err } = await resendVerificationEmail(email);
    setResending(false);
    if (err) { setError(err.message); toast.error(err.message); return; }
    setDevOtp(data?.devOtp || null);
    toast.success('A new verification code has been sent.');
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <Logo size={44} variant="light" link={false} />

          <div className="auth-brand-headline">
            <h1>One last step to get started</h1>
            <p>Verify your email to activate your TaskNija account and connect with verified providers, property owners and skilled professionals.</p>
          </div>

          <div className="auth-trust-list">
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>We keep your details safe and private</span>
            </div>
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Only real people with real emails get in</span>
            </div>
          </div>
        </div>
        <div className="auth-brand-decoration"></div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-form-icon-badge">
              <ShieldCheck size={22} color="white" />
            </div>
            <h2>Verify your email</h2>
            <p>Enter the 6-digit code we sent you</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
            </div>
          )}

          {devOtp && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 'var(--radius)',
              background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.82rem', color: '#166534',
            }}>
              Dev test code: <strong>{devOtp}</strong> (shown because this is a development build)
            </div>
          )}

          <form className="auth-form" onSubmit={handleVerify}>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="verify-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="verify-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="verify-code">6-digit verification code</label>
              <div className="auth-input-wrapper">
                <CheckCircle2 size={17} className="auth-input-icon" />
                <input
                  id="verify-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="auth-input"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading || !email || code.length !== 6}>
              {loading ? <span className="auth-spinner"></span> : 'Verify & Continue'}
            </button>
          </form>

          <button
            type="button"
            className="auth-switch-link"
            onClick={handleResend}
            disabled={resending}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, margin: '16px auto 0',
              background: 'none', border: 'none', cursor: resending ? 'default' : 'pointer',
              color: 'var(--color-primary)', fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={14} />
            {resending ? 'Sending...' : "Didn't get a code? Resend it"}
          </button>

          <p className="auth-switch-text" style={{ marginTop: 20 }}>
            Already verified? <Link to="/login" className="auth-switch-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
