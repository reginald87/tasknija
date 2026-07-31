import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required')
});

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setEmailErr('');
    setPasswordErr('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'email') setEmailErr(issue.message);
        if (issue.path[0] === 'password') setPasswordErr(issue.message);
      }
      return;
    }

    setLoading(true);
    const { data, error: err } = await signIn(email, password);
    if (err) {
      setLoading(false);
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        toast.info('Please verify your email before signing in.');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      const msg = err.message;
      setError(msg);
      toast.error(msg);
      return;
    }

    const role = data?.profile?.role;
    setLoading(false);
    toast.success('Signed in successfully.');
    if (role === 'admin') return navigate('/admin');
    if (role === 'vendor' || role === 'property_owner') return navigate('/vendor-dashboard');
    return navigate('/dashboard');
  }

  async function handleGoogleSignIn() {
    setError('');
    setSocialLoading(true);
    const { error: err } = await signInWithGoogle();
    setSocialLoading(false);
    if (err) { setError(err.message); toast.error(err.message); }
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <Logo size={44} variant="light" link={false} />

          <div className="auth-brand-headline">
            <h1>Connect with Nigeria's best professionals and property owners</h1>
            <p>Verified and rated. Find electricians, plumbers, cleaners, houses for rent and sale — directly from owners, no middlemen.</p>
          </div>

          <div className="auth-trust-list">
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Verified service providers & direct property owners</span>
            </div>
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Real reviews from real customers</span>
            </div>
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Safe, secure and 100% transparent</span>
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
            <h2>Welcome back</h2>
            <p>Sign in to your TaskNija account</p>
          </div>

          {error && (
            <div style={{ marginBottom: 16 }}>
              <Alert type="error" dismissible onDismiss={() => setError('')}>{error}</Alert>
            </div>
          )}

          <div className="auth-social-section">
            <button
              type="button"
              className="auth-social-btn auth-social-btn-google"
              onClick={handleGoogleSignIn}
              disabled={socialLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {socialLoading ? 'Connecting...' : 'Continue with Google'}
            </button>
          </div>

          <div className="auth-divider">or sign in with email</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!emailErr}
                  aria-describedby={emailErr ? 'login-email-error' : undefined}
                  required
                />
              </div>
              {emailErr && <span id="login-email-error" className="field-error" role="alert">{emailErr}</span>}
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!passwordErr}
                  aria-describedby={passwordErr ? 'login-password-error' : undefined}
                  required
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
              {passwordErr && <span id="login-password-error" className="field-error" role="alert">{passwordErr}</span>}
            </div>

            <div className="auth-forgot-link">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  <LogIn size={17} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Don't have an account?{' '}
            <Link to="/register" className="auth-switch-link">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
