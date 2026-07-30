import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '../context/ToastContext';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import { api } from '../services/api';
import { Mail, Eye, EyeOff, KeyRound, LogIn } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEmailErr('');

    const result = forgotSchema.safeParse({ email });
    if (!result.success) {
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'email') setEmailErr(issue.message);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (!res?.success) {
        const msg = res?.error?.message || 'Unable to send reset link.';
        setError(msg); toast.error(msg); setLoading(false); return;
      }
      setSent(true);
      toast.success('If that email exists, a reset link is on its way.');
    } catch (err) {
      // Always show the generic confirmation (no enumeration).
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-brand-panel">
          <div className="auth-brand-inner">
            <Logo size={44} variant="light" link={false} />
            <div className="auth-brand-headline">
              <h1>You're almost there!</h1>
              <p>Check your inbox for the password reset link.</p>
            </div>
          </div>
          <div className="auth-brand-decoration" />
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-card auth-success-card verify-email-prompt">
            <div className="auth-success-icon">
              <KeyRound size={52} color="var(--color-primary)" />
            </div>
            <h2>{'\u{1F4EC}'} Check your email</h2>
            <p className="auth-success-msg">
              We've sent a password reset link to <strong>{email}</strong>.<br />
              The link expires in 1 hour. Didn't get it? Check your spam folder.
            </p>
            <Link to="/login" className="auth-submit-btn">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <Logo size={44} variant="light" link={false} />
          <div className="auth-brand-headline">
            <h1>Reset your password</h1>
            <p>Enter the email linked to your TaskNija account and we'll send you a reset link.</p>
          </div>
        </div>
        <div className="auth-brand-decoration" />
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-form-icon-badge">
              <KeyRound size={22} color="white" />
            </div>
            <h2>Forgot password</h2>
            <p>We'll email you a reset link</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="forgot-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="forgot-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailErr}
                  aria-describedby={emailErr ? 'forgot-email-error' : undefined}
                  required
                />
              </div>
              {emailErr && <span id="forgot-email-error" className="field-error" role="alert">{emailErr}</span>}
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  <LogIn size={17} />
                  Send reset link
                </>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Remembered it?{' '}
            <Link to="/login" className="auth-switch-link">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
