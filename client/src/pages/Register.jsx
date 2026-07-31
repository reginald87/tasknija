import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/common/Alert';
import Logo from '../components/common/Logo';
import { Mail, Lock, Eye, EyeOff, User, UserPlus, Home, Building2, Tag, Ruler } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Za-z]/, 'At least one letter')
    .regex(/[0-9]/, 'At least one number'),
  role: z.enum(['user', 'vendor', 'property_owner']),
  businessName: z.string().optional(),
  listingType: z.enum(['sale', 'rent', 'lease']).optional(),
  propertyType: z.string().optional(),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  isDirectFromOwner: z.boolean().optional(),
}).refine(
  (d) => d.role !== 'vendor' || (typeof d.businessName === 'string' && d.businessName.length >= 2),
  { message: 'Business name required for vendor registration', path: ['businessName'] }
);

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['#dc2626', '#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'];
  return { score, label: labels[score] || '', color: colors[score] || '#059669' };
}

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [role, setRole] = useState('user');
  const [listingType, setListingType] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [isDirectFromOwner, setIsDirectFromOwner] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const strength = getPasswordStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const result = registerSchema.safeParse({
      fullName,
      email,
      password,
      role,
      businessName: businessName || undefined,
      listingType: listingType || undefined,
      propertyType: propertyType || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      isDirectFromOwner,
    });
    if (!result.success) {
      const map = {};
      for (const issue of result.error.issues) {
        map[issue.path[0]] = issue.message;
      }
      setFieldErrors(map);
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Passwords do not match.';
      setError(msg); toast.error(msg); return;
    }

    setLoading(true);
    const { data, error: err } = await signUp(email, password, fullName, role, businessName || undefined, {
      listingType: listingType || undefined,
      propertyType: propertyType || undefined,
      bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
      isDirectFromOwner,
    });
    setLoading(false);
    if (err) { setError(err.message); toast.error(err.message); return; }
    toast.success('Account created! Enter the 6-digit code sent to your email.');
    navigate(`/verify-email?email=${encodeURIComponent(email)}`);
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
            <h1>Grow your business, list your property, or find the help you need</h1>
            <p>Join thousands of Nigerian customers, skilled tradespeople and property owners already on TaskNija.</p>
          </div>

          <div className="auth-trust-list">
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Free to register as a customer</span>
            </div>
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>List your business or property and get discovered</span>
            </div>
            <div className="auth-trust-item">
              <div className="auth-trust-dot"></div>
              <span>Direct from owners — no middlemen</span>
            </div>
          </div>
        </div>
        <div className="auth-brand-decoration"></div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-form-icon-badge">
              <UserPlus size={22} color="white" />
            </div>
            <h2>Create your account</h2>
            <p>Join TaskNija — it's free</p>
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

          <div className="auth-divider">or sign up with email</div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-role-switcher">
              <button
                type="button"
                className={`auth-role-btn ${role === 'user' ? 'active' : ''}`}
                onClick={() => setRole('user')}
              >
                👤 I'm a Customer
              </button>
              <button
                type="button"
                className={`auth-role-btn ${role === 'vendor' ? 'active' : ''}`}
                onClick={() => setRole('vendor')}
              >
                🏪 I'm a Vendor
              </button>
              <button
                type="button"
                className={`auth-role-btn ${role === 'property_owner' ? 'active' : ''}`}
                onClick={() => setRole('property_owner')}
              >
                🏠 I'm a Property Owner
              </button>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-name">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={17} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  className="auth-input"
                  placeholder="Chukwuemeka Okafor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  aria-invalid={!!fieldErrors.fullName}
                  aria-describedby={fieldErrors.fullName ? 'reg-name-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.fullName && <span id="reg-name-error" className="field-error" role="alert">{fieldErrors.fullName}</span>}
            </div>

                {role === 'vendor' && (
                  <div className="auth-field-group">
                    <label className="auth-label" htmlFor="reg-bizname">Business Name</label>
                    <div className="auth-input-wrapper">
                      <User size={17} className="auth-input-icon" />
                      <input
                        id="reg-bizname"
                        type="text"
                        className="auth-input"
                        placeholder="e.g. Klinfix Laundry"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        aria-invalid={!!fieldErrors.businessName}
                        aria-describedby={fieldErrors.businessName ? 'reg-bizname-error' : undefined}
                        required
                      />
                    </div>
                    {fieldErrors.businessName && <span id="reg-bizname-error" className="field-error" role="alert">{fieldErrors.businessName}</span>}
                  </div>
                )}

                {role === 'property_owner' && (
                  <>
                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="reg-listing-type">Listing Type</label>
                      <div className="auth-input-wrapper">
                        <Tag size={17} className="auth-input-icon" />
                        <select
                          id="reg-listing-type"
                          className="auth-input"
                          value={listingType}
                          onChange={(e) => setListingType(e.target.value)}
                          required
                        >
                          <option value="">What are you listing?</option>
                          <option value="sale">For Sale</option>
                          <option value="rent">For Rent</option>
                          <option value="lease">For Lease</option>
                        </select>
                      </div>
                      {fieldErrors.listingType && <span className="field-error" role="alert">{fieldErrors.listingType}</span>}
                    </div>

                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="reg-property-type">Property Type</label>
                      <div className="auth-input-wrapper">
                        <Building2 size={17} className="auth-input-icon" />
                        <select
                          id="reg-property-type"
                          className="auth-input"
                          value={propertyType}
                          onChange={(e) => setPropertyType(e.target.value)}
                          required
                        >
                          <option value="">Property type</option>
                          <option value="apartment">Apartment</option>
                          <option value="duplex">Duplex</option>
                          <option value="bungalow">Bungalow</option>
                          <option value="terraced">Terraced House</option>
                          <option value="detached">Detached House</option>
                          <option value="penthouse">Penthouse</option>
                          <option value="land">Land</option>
                          <option value="commercial">Commercial</option>
                        </select>
                      </div>
                      {fieldErrors.propertyType && <span className="field-error" role="alert">{fieldErrors.propertyType}</span>}
                    </div>

                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="reg-bedrooms">Bedrooms</label>
                      <div className="auth-input-wrapper">
                        <Home size={17} className="auth-input-icon" />
                        <input
                          id="reg-bedrooms"
                          type="number"
                          min="0"
                          max="20"
                          className="auth-input"
                          placeholder="e.g. 3"
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                        />
                      </div>
                      {fieldErrors.bedrooms && <span className="field-error" role="alert">{fieldErrors.bedrooms}</span>}
                    </div>

                    <div className="auth-field-group">
                      <label className="auth-label" htmlFor="reg-direct-owner">
                        <input
                          id="reg-direct-owner"
                          type="checkbox"
                          checked={isDirectFromOwner}
                          onChange={(e) => setIsDirectFromOwner(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                        I am the direct owner (no middlemen/agents)
                      </label>
                    </div>
                  </>
                )}

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={17} className="auth-input-icon" />
                <input
                  id="reg-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
                  required
                />
              </div>
              {fieldErrors.email && <span id="reg-email-error" className="field-error" role="alert">{fieldErrors.email}</span>}
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-password">Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'reg-password-error' : 'reg-password-strength'}
                  required
                  minLength={6}
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
              <div id="reg-password-strength" className="password-strength" aria-live="polite" style={{ marginTop: 6 }}>
                <div className="password-strength-track" style={{ height: 4, width: '100%', background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    className="password-strength-bar"
                    style={{
                      width: `${(strength.score / 5) * 100}%`,
                      background: strength.color,
                      height: '100%',
                      transition: 'width 0.2s ease, background 0.2s ease'
                    }}
                  />
                </div>
                {strength.label && (
                  <span className="password-strength-label" style={{ fontSize: '0.75rem', color: strength.color, marginTop: 4, display: 'inline-block' }}>
                    {strength.label}
                  </span>
                )}
              </div>
              {fieldErrors.password && <span id="reg-password-error" className="field-error" role="alert">{fieldErrors.password}</span>}
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="auth-input-wrapper">
                <Lock size={17} className="auth-input-icon" />
                <input
                  id="reg-confirm"
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
                  <UserPlus size={17} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="auth-switch-text">
            Already have an account?{' '}
            <Link to="/login" className="auth-switch-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
