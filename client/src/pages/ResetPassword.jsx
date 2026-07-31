import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '../context/ToastContext';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import { api } from '../services/api';
import { Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';

const resetSchema = z.object({
  newPassword: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'At least one letter')
    .regex(/[0-9]/, 'At least one number'),
});

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const result = resetSchema.safeParse({ newPassword });
    if (!result.success) {
      const map = {};
      for (const issue of result.error.issues) map[issue.path[0]] = issue.message;
      setFieldErrors(map);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg); toast.error(msg); return;
    }

    if (!token) {
      const msg = 'Missing or invalid reset token. Request a new link.';
      setError(msg); toast.error(msg); return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      if (!res?.success) {
        const msg = res?.error?.message || 'Unable to reset password.';
        setError(msg); toast.error(msg); setLoading(false); return;
      }
      setDone(true);
      toast.success('Password updated. Please sign in.');
    } catch (err) {
      const msg = err?.message || 'Unable to reset password.';
      setError(msg); toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-brand-panel">
          <div className="auth-brand-inner">
            <Logo size={44} variant="light" link={false} />
            <div className="auth-brand-headline">
              <h1>All done!</h1>
              <p>Your password has been updated successfully.</p>
            </div>
          </div>
          <div className="auth-brand-decoration" />
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-card auth-success-card verify-email-prompt">
            <div className="auth-success-icon">
              <CheckCircle2 size={52} color="var(--color-primary)" />
            </div>
            <h2>{'\u{1F512}'} Password updated</h2>
            <p className="auth-success-msg">
              You can now sign in with your new password.
            </p>
            <Link to="/login" className="auth-submit-btn">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-form-panel">
          <div className="auth-form-card">
            <div className="auth-form-header">
              <div className="auth-form-icon-badge">
                <KeyRound size={22} color="white" />
              </div>
              <h2>Invalid link</h2>
              <p>This password reset link is missing its token.</p>
            </div>
            <p className="auth-switch-text">
              <Link to="/forgot-password" className="auth-switch-link">Request a new reset link</Link>
            </p>
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
            <h1>Choose a new password</h1>
            <p>Pick something secure — at least 8 characters with a letter and a number.</p>
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
            <h2>Reset password</h2>
            <p>Enter your new password</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reset-password">New Password</label>
              <div className="auth-input-wrapper">
                <KeyRound size={17} className="auth-input-icon" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.newPassword}
                  aria-describedby={fieldErrors.newPassword ? 'reset-password-error' : undefined}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="auth-eye-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.newPassword && <span id="reset-password-error" className="field-error" role="alert">{fieldErrors.newPassword}</span>}
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reset-confirm">Confirm Password</label>
              <div className="auth-input-wrapper">
                <KeyRound size={17} className="auth-input-icon" />
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  <KeyRound size={17} />
                  Update password
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

export default ResetPassword;
